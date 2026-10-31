from datetime import date
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.models import DiscountRule, DiscountType, DiscountScope, Product

class DiscountService:
    @staticmethod
    def evaluate_discount(
        db: Session,
        discount: DiscountRule,
        subtotal: Decimal,
        total_quantity: int,
        line_items: List[dict],
        eval_date: Optional[date] = None
    ) -> Tuple[bool, Decimal, str]:
        """
        Evaluates whether a discount applies and computes the discounted amount.
        Returns: (is_applicable, discount_amount, reason)
        """
        today = eval_date or date.today()

        if not discount.is_active:
            return False, Decimal("0.00"), "Discount is inactive"

        if discount.start_date > today:
            return False, Decimal("0.00"), f"Discount begins on {discount.start_date}"

        if discount.end_date < today:
            return False, Decimal("0.00"), f"Discount expired on {discount.end_date}"

        if discount.usage_limit is not None and discount.used_count >= discount.usage_limit:
            return False, Decimal("0.00"), "Discount usage limit reached"

        if discount.min_purchase_amount > Decimal("0.00") and subtotal < discount.min_purchase_amount:
            return False, Decimal("0.00"), f"Minimum purchase amount of ${discount.min_purchase_amount} required"

        if discount.min_quantity > 0 and total_quantity < discount.min_quantity:
            return False, Decimal("0.00"), f"Minimum quantity of {discount.min_quantity} required"

        discount_amount = Decimal("0.00")

        if discount.scope == DiscountScope.WHOLE_SUBSCRIPTION:
            if discount.discount_type == DiscountType.PERCENTAGE:
                discount_amount = (subtotal * (discount.discount_value / Decimal("100"))).quantize(Decimal("0.01"))
            else:
                discount_amount = min(subtotal, discount.discount_value)

        elif discount.scope == DiscountScope.SPECIFIC_PRODUCTS:
            applicable_pids = set(discount.specific_product_ids or [])
            qualifying_subtotal = Decimal("0.00")
            for item in line_items:
                if item.get("product_id") in applicable_pids:
                    qualifying_subtotal += item.get("line_amount", Decimal("0.00"))

            if qualifying_subtotal <= Decimal("0.00"):
                return False, Decimal("0.00"), "No qualifying products in order"

            if discount.discount_type == DiscountType.PERCENTAGE:
                discount_amount = (qualifying_subtotal * (discount.discount_value / Decimal("100"))).quantize(Decimal("0.01"))
            else:
                discount_amount = min(qualifying_subtotal, discount.discount_value)

        return True, discount_amount, "Discount applied successfully"

    @staticmethod
    def record_usage(db: Session, discount_id: int):
        discount = db.query(DiscountRule).filter(DiscountRule.id == discount_id).first()
        if discount:
            discount.used_count += 1
            if discount.usage_limit is not None and discount.used_count >= discount.usage_limit:
                # Expire or mark limit reached
                pass
            db.commit()

