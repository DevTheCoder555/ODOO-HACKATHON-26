from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    Subscription, SubscriptionLine, SubscriptionStatus,
    Plan, Product, ProductVariant, QuotationTemplate, User
)
from app.schemas import SubscriptionCreate, SubscriptionLineCreate

class SubscriptionService:
    @staticmethod
    def generate_subscription_number(db: Session) -> str:
        count = db.query(func.count(Subscription.id)).scalar() or 0
        return f"SUB-{date.today().year}-{count + 1:05d}"

    @classmethod
    def create_subscription(
        cls,
        db: Session,
        data: SubscriptionCreate,
        initial_status: str = SubscriptionStatus.DRAFT
    ) -> Subscription:
        # Validate Customer
        customer = db.query(User).filter(User.id == data.customer_id).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

        # Validate Plan
        plan = db.query(Plan).filter(Plan.id == data.plan_id).first()
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

        # Check total quantity against plan min_quantity
        total_qty = sum(l.quantity for l in data.lines)
        if total_qty < plan.min_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total quantity ({total_qty}) is below plan minimum required ({plan.min_quantity})"
            )

        sub_number = cls.generate_subscription_number(db)
        
        # Initial next_billing_date is start_date
        next_billing = data.start_date

        subscription = Subscription(
            subscription_number=sub_number,
            customer_id=data.customer_id,
            plan_id=data.plan_id,
            status=initial_status,
            start_date=data.start_date,
            expiry_date=data.expiry_date,
            next_billing_date=next_billing,
            payment_terms=data.payment_terms,
            valid_until=data.valid_until,
            discount_id=data.discount_id,
            tax_id=data.tax_id,
            notes=data.notes
        )
        db.add(subscription)
        db.flush()

        for line_data in data.lines:
            product = db.query(Product).filter(Product.id == line_data.product_id).first()
            if not product:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {line_data.product_id} not found")

            # Check variant if present
            unit_price = line_data.unit_price
            if line_data.variant_id:
                variant = db.query(ProductVariant).filter(
                    ProductVariant.id == line_data.variant_id,
                    ProductVariant.product_id == product.id
                ).first()
                if not variant:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Variant {line_data.variant_id} not found for product")

            line_amount = (unit_price * line_data.quantity).quantize(Decimal("0.01"))

            sub_line = SubscriptionLine(
                subscription_id=subscription.id,
                product_id=line_data.product_id,
                variant_id=line_data.variant_id,
                quantity=line_data.quantity,
                unit_price=unit_price,
                tax_rate=line_data.tax_rate,
                line_amount=line_amount
            )
            db.add(sub_line)

        db.commit()
        db.refresh(subscription)
        return subscription

    @classmethod
    def create_from_template(
        cls,
        db: Session,
        template_id: int,
        customer_id: int,
        start_date: Optional[date] = None,
        notes: Optional[str] = None
    ) -> Subscription:
        template = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation template not found")

        s_date = start_date or date.today()
        valid_until = s_date + timedelta(days=template.validity_days)

        lines = []
        for tl in template.lines:
            # Surcharge adjustment if variant exists
            price = tl.unit_price
            lines.append(SubscriptionLineCreate(
                product_id=tl.product_id,
                variant_id=tl.variant_id,
                quantity=tl.quantity,
                unit_price=price,
                tax_rate=Decimal("0.00")
            ))

        sub_create = SubscriptionCreate(
            customer_id=customer_id,
            plan_id=template.plan_id,
            start_date=s_date,
            valid_until=valid_until,
            notes=notes or f"Created from template: {template.name}",
            lines=lines
        )
        return cls.create_subscription(db, sub_create, initial_status=SubscriptionStatus.QUOTATION)

    @classmethod
    def transition_status(
        cls,
        db: Session,
        subscription: Subscription,
        new_status: str,
        user_role: str = "admin"
    ) -> Subscription:
        plan = subscription.plan
        current = subscription.status

        # Validate lifecycle rules
        if new_status == SubscriptionStatus.PAUSED:
            if not plan.allow_pause:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The plan '{plan.name}' does not allow subscriptions to be paused."
                )

        if new_status == SubscriptionStatus.CLOSED and current == SubscriptionStatus.ACTIVE:
            if not plan.allow_early_close and user_role == "customer":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The plan '{plan.name}' does not permit early closure."
                )

        if new_status == SubscriptionStatus.ACTIVE and current == SubscriptionStatus.CLOSED:
            if not plan.allow_renewal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The plan '{plan.name}' does not allow renewal."
                )

        subscription.status = new_status
        db.commit()
        db.refresh(subscription)
        return subscription

