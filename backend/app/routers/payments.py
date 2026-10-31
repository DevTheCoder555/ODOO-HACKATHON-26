from datetime import date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Payment, Invoice, InvoiceStatus, User, UserRole
from app.schemas import PaymentCreate, PaymentResponse
from app.security import get_current_user, require_staff_or_admin
from app.realtime import manager

router = APIRouter(prefix="/api/payments", tags=["Payments"])

@router.get("", response_model=List[PaymentResponse])
@router.get("/", response_model=List[PaymentResponse])
def list_payments(
    invoice_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Payment)
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Payment.customer_id == current_user.id)
    else:
        if customer_id:
            query = query.filter(Payment.customer_id == customer_id)
        if invoice_id:
            query = query.filter(Payment.invoice_id == invoice_id)

    return query.order_by(Payment.payment_date.desc(), Payment.id.desc()).all()

@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(
    payment_in: PaymentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff_or_admin)
):
    invoice = db.query(Invoice).filter(Invoice.id == payment_in.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if invoice.status == InvoiceStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot record payments on cancelled invoices.")

    if invoice.status == InvoiceStatus.PAID or invoice.amount_due <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice is already fully paid.")

    if payment_in.amount <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be greater than zero.")

    if payment_in.amount > invoice.amount_due:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount (${payment_in.amount}) exceeds outstanding amount due (${invoice.amount_due})."
        )

    p_count = db.query(func.count(Payment.id)).scalar() or 0
    p_number = f"PAY-{date.today().year}-{p_count + 1:05d}"

    payment = Payment(
        payment_number=p_number,
        invoice_id=invoice.id,
        customer_id=invoice.customer_id,
        payment_method=payment_in.payment_method,
        amount=payment_in.amount,
        payment_date=payment_in.payment_date or date.today(),
        reference_note=payment_in.reference_note
    )
    db.add(payment)

    invoice.amount_paid += payment_in.amount
    invoice.amount_due = max(Decimal("0.00"), invoice.grand_total - invoice.amount_paid)

    if invoice.amount_due <= Decimal("0.00"):
        invoice.status = InvoiceStatus.PAID
    elif invoice.status == InvoiceStatus.DRAFT:
        invoice.status = InvoiceStatus.CONFIRMED

    db.commit()
    db.refresh(payment)

    manager.broadcast_sync(
        event_type="PAYMENT_RECORDED",
        payload={
            "payment_id": payment.id,
            "payment_number": payment.payment_number,
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "customer_name": invoice.customer.full_name if invoice.customer else "Customer",
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "invoice_status": invoice.status,
            "amount_due": float(invoice.amount_due),
            "message": f"Payment {payment.payment_number} (${payment.amount}) recorded for {invoice.invoice_number}"
        }
    )

    return payment
