from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TaxRule, User
from app.schemas import TaxRuleCreate, TaxRuleResponse
from app.security import require_admin

router = APIRouter(prefix="/api/taxes", tags=["Tax Rules"])

@router.get("", response_model=List[TaxRuleResponse])
@router.get("/", response_model=List[TaxRuleResponse])
def list_tax_rules(db: Session = Depends(get_db)):
    return db.query(TaxRule).order_by(TaxRule.name).all()

@router.post("", response_model=TaxRuleResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=TaxRuleResponse, status_code=status.HTTP_201_CREATED)
def create_tax_rule(
    tax_in: TaxRuleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    tax_rule = TaxRule(
        name=tax_in.name,
        rate=tax_in.rate,
        tax_type=tax_in.tax_type,
        is_active=tax_in.is_active
    )
    db.add(tax_rule)
    db.commit()
    db.refresh(tax_rule)
    return tax_rule

@router.get("/{tax_id}", response_model=TaxRuleResponse)
def get_tax_rule(tax_id: int, db: Session = Depends(get_db)):
    tax_rule = db.query(TaxRule).filter(TaxRule.id == tax_id).first()
    if not tax_rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax rule not found")
    return tax_rule
