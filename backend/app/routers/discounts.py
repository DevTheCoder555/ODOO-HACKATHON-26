from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DiscountRule, User
from app.schemas import DiscountRuleCreate, DiscountRuleResponse
from app.security import require_admin, require_staff_or_admin

router = APIRouter(prefix="/api/discounts", tags=["Discount Rules"])

@router.get("", response_model=List[DiscountRuleResponse])
@router.get("/", response_model=List[DiscountRuleResponse])
def list_discount_rules(
    db: Session = Depends(get_db),
    user: User = Depends(require_staff_or_admin)
):
    return db.query(DiscountRule).order_by(DiscountRule.created_at.desc()).all()

@router.post("", response_model=DiscountRuleResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DiscountRuleResponse, status_code=status.HTTP_201_CREATED)
def create_discount_rule(
    rule_in: DiscountRuleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(DiscountRule).filter(DiscountRule.code == rule_in.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Discount code '{rule_in.code}' already exists."
        )

    if rule_in.discount_type == "percentage" and rule_in.discount_value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discount percentage cannot exceed 100%."
        )

    if rule_in.end_date < rule_in.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discount end date cannot precede start date."
        )

    discount = DiscountRule(
        code=rule_in.code.upper().strip(),
        name=rule_in.name,
        discount_type=rule_in.discount_type,
        discount_value=rule_in.discount_value,
        min_purchase_amount=rule_in.min_purchase_amount,
        min_quantity=rule_in.min_quantity,
        start_date=rule_in.start_date,
        end_date=rule_in.end_date,
        usage_limit=rule_in.usage_limit,
        used_count=0,
        scope=rule_in.scope,
        specific_product_ids=rule_in.specific_product_ids,
        is_active=rule_in.is_active
    )
    db.add(discount)
    db.commit()
    db.refresh(discount)
    return discount

@router.get("/{discount_id}", response_model=DiscountRuleResponse)
def get_discount_rule(discount_id: int, db: Session = Depends(get_db)):
    discount = db.query(DiscountRule).filter(DiscountRule.id == discount_id).first()
    if not discount:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount rule not found")
    return discount
