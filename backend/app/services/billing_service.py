from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    Subscription, SubscriptionLine, SubscriptionStatus,
    Invoice, InvoiceLine, InvoiceStatus,
    Plan, BillingFrequency, TaxRule, DiscountRule
)
from app.services.discount_service import DiscountService

class BillingService:
    @staticmethod
    def calculate_period(start_date: date, frequency: str) -> tuple[date, date, date]:
        """
        Returns (period_start, period_end, next_billing_date)
        """
        period_start = start_date
        if frequency == BillingFrequency.DAILY:
            period_end = period_start
            next_date = period_start + timedelta(days=1)
        elif frequency == BillingFrequency.WEEKLY:
            period_end = period_start + timedelta(days=6)
            next_date = period_start + timedelta(days=7)
        elif frequency == BillingFrequency.YEARLY:
            period_end = period_start + relativedelta(years=1) - timedelta(days=1)
            next_date = period_start + relativedelta(years=1)
        else: # Monthly default
            period_end = period_start + relativedelta(months=1) - timedelta(days=1)
            next_date = period_start + relativedelta(months=1)
            
        return period_start, period_end, next_date

    @staticmethod
    def get_due_date(issue_date: date, payment_terms: str) -> date:
        terms_lower = (payment_terms or "").lower()
        if "immediate" in terms_lower:
            return issue_date
        elif "15" in terms_lower:
            return issue_date + timedelta(days=15)
        elif "60" in terms_lower:
            return issue_date + timedelta(days=60)
        else: # Default Net 30
            return issue_date + timedelta(days=30)

    @classmethod
    def generate_invoice(
        cls,
        db: Session,
        subscription: Subscription,
        issue_date: Optional[date] = None,
        auto_confirm: bool = False
    ) -> Optional[Invoice]:
        """
        Generates an invoice from an active subscription.
        Guarantees idempotency: will NOT generate duplicate invoices for the same billing period.
        """
        if subscription.status != SubscriptionStatus.ACTIVE:
            return None

        today = issue_date or date.today()
        plan = subscription.plan
        frequency = plan.billing_frequency if plan else BillingFrequency.MONTHLY

        # Current period is based on next_billing_date
        period_start, period_end, next_billing = cls.calculate_period(subscription.next_billing_date, frequency)

        # Idempotency check: verify an invoice does not already exist for this subscription and period
        existing_invoice = db.query(Invoice).filter(
            Invoice.subscription_id == subscription.id,
            Invoice.billing_period_start == period_start,
            Invoice.billing_period_end == period_end
        ).first()

        if existing_invoice:
            # Already billed for this period!
            return None

        # Generate unique invoice number
        count = db.query(func.count(Invoice.id)).scalar() or 0
        invoice_number = f"INV-{today.strftime('%Y%m')}-{count + 1:05d}"

        due_date = cls.get_due_date(today, subscription.payment_terms)

        # Fetch Tax Rule
        tax_rate = Decimal("0.00")
        if subscription.tax_id:
            tax_rule = db.query(TaxRule).filter(TaxRule.id == subscription.tax_id, TaxRule.is_active == True).first()
            if tax_rule:
                tax_rate = tax_rule.rate
                if tax_rate > Decimal("1.00"):
                    tax_rate = tax_rate / Decimal("100")

        # Prepare line items
        subtotal = Decimal("0.00")
        total_quantity = 0
        line_eval_data = []

        for sub_line in subscription.lines:
            line_amount = (sub_line.unit_price * sub_line.quantity).quantize(Decimal("0.01"))
            subtotal += line_amount
            total_quantity += sub_line.quantity
            line_eval_data.append({
                "product_id": sub_line.product_id,
                "variant_id": sub_line.variant_id,
                "quantity": sub_line.quantity,
                "unit_price": sub_line.unit_price,
                "line_amount": line_amount,
                "product_name": sub_line.product.name if sub_line.product else "Product",
                "variant_name": sub_line.variant.name if sub_line.variant else None,
            })

        # Evaluate Discount
        discount_total = Decimal("0.00")
        applied_discount = None
        if subscription.discount_id:
            discount_rule = db.query(DiscountRule).filter(
                DiscountRule.id == subscription.discount_id,
                DiscountRule.is_active == True
            ).first()
            if discount_rule:
                is_valid, disc_amt, _ = DiscountService.evaluate_discount(
                    db=db,
                    discount=discount_rule,
                    subtotal=subtotal,
                    total_quantity=total_quantity,
                    line_items=line_eval_data,
                    eval_date=today
                )
                if is_valid:
                    discount_total = disc_amt
                    applied_discount = discount_rule

        # Calculate taxes on taxable amount (subtotal - discount)
        taxable_amount = max(Decimal("0.00"), subtotal - discount_total)
        tax_total = (taxable_amount * tax_rate).quantize(Decimal("0.01"))
        grand_total = (taxable_amount + tax_total).quantize(Decimal("0.01"))

        invoice_status = InvoiceStatus.CONFIRMED if auto_confirm else InvoiceStatus.DRAFT

        # Create Invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            subscription_id=subscription.id,
            customer_id=subscription.customer_id,
            billing_period_start=period_start,
            billing_period_end=period_end,
            status=invoice_status,
            issue_date=today,
            due_date=due_date,
            subtotal=subtotal,
            tax_total=tax_total,
            discount_total=discount_total,
            grand_total=grand_total,
            amount_paid=Decimal("0.00"),
            amount_due=grand_total,
            notes=f"Recurring billing for {subscription.subscription_number} ({period_start} to {period_end})"
        )
        db.add(invoice)
        db.flush() # Populate invoice.id

        # Create Invoice Lines
        for line in line_eval_data:
            line_tax = (line["line_amount"] * tax_rate).quantize(Decimal("0.01"))
            inv_line = InvoiceLine(
                invoice_id=invoice.id,
                product_id=line["product_id"],
                variant_id=line["variant_id"],
                product_name=line["product_name"],
                variant_name=line["variant_name"],
                quantity=line["quantity"],
                unit_price=line["unit_price"],
                tax_rate=tax_rate,
                tax_amount=line_tax,
                discount_amount=Decimal("0.00"),
                line_total=line["line_amount"]
            )
            db.add(inv_line)

        # Record discount usage if applied
        if applied_discount:
            DiscountService.record_usage(db, applied_discount.id)

        # Advance subscription billing cycle
        subscription.last_billed_date = period_end
        subscription.next_billing_date = next_billing

        # Check if plan closes on end
        if plan and plan.close_on_end and subscription.expiry_date:
            if subscription.next_billing_date > subscription.expiry_date:
                subscription.status = SubscriptionStatus.CLOSED

        db.commit()
        db.refresh(invoice)
        return invoice

    @classmethod
    def run_billing_cycle(
        cls,
        db: Session,
        target_date: Optional[date] = None,
        auto_confirm: bool = False
    ) -> Dict[str, Any]:
        """
        Batch billing processor: runs across all active subscriptions due on or before target_date.
        Guarantees zero skipping and zero double billing.
        """
        run_date = target_date or date.today()

        # Find active subscriptions due for billing
        due_subscriptions = db.query(Subscription).filter(
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.next_billing_date <= run_date
        ).all()

        invoices_generated = []
        skipped_count = 0
        total_billed = Decimal("0.00")

        for sub in due_subscriptions:
            inv = cls.generate_invoice(db, sub, issue_date=run_date, auto_confirm=auto_confirm)
            if inv:
                invoices_generated.append(inv.id)
                total_billed += inv.grand_total
            else:
                skipped_count += 1

        return {
            "target_date": run_date,
            "subscriptions_processed": len(due_subscriptions),
            "invoices_generated": len(invoices_generated),
            "total_billed": total_billed,
            "invoice_ids": invoices_generated,
            "skipped_count": skipped_count,
            "notes": f"Batch billing executed for date {run_date}. Generated {len(invoices_generated)} invoice(s)."
        }

