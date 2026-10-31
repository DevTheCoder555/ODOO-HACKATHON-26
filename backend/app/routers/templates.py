from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import QuotationTemplate, QuotationTemplateLine, User, Product
from app.schemas import QuotationTemplateCreate, QuotationTemplateResponse
from app.security import require_staff_or_admin

router = APIRouter(prefix="/api/templates", tags=["Quotation Templates"])

@router.get("", response_model=List[QuotationTemplateResponse])
@router.get("/", response_model=List[QuotationTemplateResponse])
def list_quotation_templates(db: Session = Depends(get_db)):
    templates = db.query(QuotationTemplate).all()
    for t in templates:
        for l in t.lines:
            if l.product:
                l.product_name = l.product.name
    return templates

@router.post("", response_model=QuotationTemplateResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=QuotationTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_quotation_template(
    template_in: QuotationTemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff_or_admin)
):
    template = QuotationTemplate(
        name=template_in.name,
        plan_id=template_in.plan_id,
        validity_days=template_in.validity_days,
        notes=template_in.notes
    )
    db.add(template)
    db.flush()

    for line_in in template_in.lines:
        line = QuotationTemplateLine(
            template_id=template.id,
            product_id=line_in.product_id,
            variant_id=line_in.variant_id,
            quantity=line_in.quantity,
            unit_price=line_in.unit_price
        )
        db.add(line)

    db.commit()
    db.refresh(template)
    for l in template.lines:
        if l.product:
            l.product_name = l.product.name
    return template

@router.get("/{template_id}", response_model=QuotationTemplateResponse)
def get_quotation_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation template not found")
    for l in template.lines:
        if l.product:
            l.product_name = l.product.name
    return template
