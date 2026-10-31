from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_

from app.models import (
    Subscription, SubscriptionStatus,
    Invoice, InvoiceStatus,
    Payment, Plan, BillingFrequency, User
)

class AnalyticsService:
    @staticmethod
    def get_finance_summary(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        plan_id: Optional[int] = None,
        customer_id: Optional[int] = None
    ) -> Dict[str, Any]:
        today = date.today()

        # 1. Active & Total Subscriptions
        sub_query = db.query(Subscription)
        if plan_id:
            sub_query = sub_query.filter(Subscription.plan_id == plan_id)
        if customer_id:
            sub_query = sub_query.filter(Subscription.customer_id == customer_id)

        active_subs = sub_query.filter(Subscription.status == SubscriptionStatus.ACTIVE).count()
        total_subs = sub_query.count()

        # 2. Revenue collected (from Payments)
        pay_query = db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        if start_date:
            pay_query = pay_query.filter(Payment.payment_date >= start_date)
        if end_date:
            pay_query = pay_query.filter(Payment.payment_date <= end_date)
        if customer_id:
            pay_query = pay_query.filter(Payment.customer_id == customer_id)
        total_revenue = pay_query.scalar() or Decimal("0.00")

        # 3. Total Outstanding (Amount due on confirmed invoices)
        outstanding_query = db.query(func.coalesce(func.sum(Invoice.amount_due), Decimal("0.00"))).filter(
            Invoice.status == InvoiceStatus.CONFIRMED
        )
        if customer_id:
            outstanding_query = outstanding_query.filter(Invoice.customer_id == customer_id)
        total_outstanding = outstanding_query.scalar() or Decimal("0.00")

        # 4. Overdue Invoices
        overdue_invoices_query = db.query(Invoice).filter(
            Invoice.status == InvoiceStatus.CONFIRMED,
            Invoice.due_date < today,
            Invoice.amount_due > Decimal("0.00")
        )
        if customer_id:
            overdue_invoices_query = overdue_invoices_query.filter(Invoice.customer_id == customer_id)
        
        overdue_count = overdue_invoices_query.count()
        
        overdue_amount_query = db.query(func.coalesce(func.sum(Invoice.amount_due), Decimal("0.00"))).filter(
            Invoice.status == InvoiceStatus.CONFIRMED,
            Invoice.due_date < today,
            Invoice.amount_due > Decimal("0.00")
        )
        if customer_id:
            overdue_amount_query = overdue_amount_query.filter(Invoice.customer_id == customer_id)
        overdue_amount = overdue_amount_query.scalar() or Decimal("0.00")

        # 5. MRR & ARR calculation (normalized to monthly value)
        # Filter active subscriptions respecting plan_id and customer_id filters
        active_sub_q = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE)
        if plan_id:
            active_sub_q = active_sub_q.filter(Subscription.plan_id == plan_id)
        if customer_id:
            active_sub_q = active_sub_q.filter(Subscription.customer_id == customer_id)
        active_subscriptions = active_sub_q.all()

        mrr = Decimal("0.00")
        for sub in active_subscriptions:
            sub_total = sum((l.unit_price * l.quantity) for l in sub.lines)
            freq = sub.plan.billing_frequency if sub.plan else BillingFrequency.MONTHLY
            if freq == BillingFrequency.DAILY:
                mrr += sub_total * Decimal("30.0")
            elif freq == BillingFrequency.WEEKLY:
                mrr += sub_total * Decimal("4.333")
            elif freq == BillingFrequency.YEARLY:
                mrr += sub_total / Decimal("12.0")
            else: # Monthly
                mrr += sub_total

        mrr = mrr.quantize(Decimal("0.01"))
        arr = (mrr * Decimal("12.0")).quantize(Decimal("0.01"))

        # 6. Counts
        paid_query = db.query(Invoice).filter(Invoice.status == InvoiceStatus.PAID)
        unpaid_query = db.query(Invoice).filter(Invoice.status == InvoiceStatus.CONFIRMED)
        if customer_id:
            paid_query = paid_query.filter(Invoice.customer_id == customer_id)
            unpaid_query = unpaid_query.filter(Invoice.customer_id == customer_id)
        paid_count = paid_query.count()
        unpaid_count = unpaid_query.count()

        return {
            "active_subscriptions": active_subs,
            "total_subscriptions": total_subs,
            "total_revenue": total_revenue,
            "total_outstanding": total_outstanding,
            "overdue_invoices_count": overdue_count,
            "overdue_amount": overdue_amount,
            "mrr": mrr,
            "arr": arr,
            "paid_invoices_count": paid_count,
            "unpaid_invoices_count": unpaid_count,
        }

    @staticmethod
    def get_revenue_trends(db: Session, months: int = 6) -> List[Dict[str, Any]]:
        """
        Returns revenue grouped by month for charting.
        """
        today = date.today()
        trends = []
        for i in range(months - 1, -1, -1):
            m_date = today - timedelta(days=i * 30)
            month_start = date(m_date.year, m_date.month, 1)
            if m_date.month == 12:
                next_month = date(m_date.year + 1, 1, 1)
            else:
                next_month = date(m_date.year, m_date.month + 1, 1)
            month_end = next_month - timedelta(days=1)

            revenue = db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).filter(
                Payment.payment_date >= month_start,
                Payment.payment_date <= month_end
            ).scalar() or Decimal("0.00")

            invoiced = db.query(func.coalesce(func.sum(Invoice.grand_total), Decimal("0.00"))).filter(
                Invoice.issue_date >= month_start,
                Invoice.issue_date <= month_end
            ).scalar() or Decimal("0.00")

            trends.append({
                "month": month_start.strftime("%b %Y"),
                "revenue": float(revenue),
                "invoiced": float(invoiced)
            })

        return trends

    @staticmethod
    def get_plan_distribution(db: Session) -> List[Dict[str, Any]]:
        results = db.query(
            Plan.name,
            func.count(Subscription.id).label("subscription_count")
        ).join(Subscription, Subscription.plan_id == Plan.id).group_by(Plan.id, Plan.name).all()

        return [{"plan": r[0], "count": r[1]} for r in results]

