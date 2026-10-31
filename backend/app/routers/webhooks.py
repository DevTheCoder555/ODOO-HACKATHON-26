from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Invoice, InvoiceStatus, Payment, User
from app.realtime import manager
from app.security import require_staff_or_admin

router = APIRouter(prefix="/api/webhooks", tags=["Dynamic Webhooks & Bank Feeds"])

class PaymentWebhookPayload(BaseModel):
    event_id: Optional[str] = None
    invoice_id: Optional[int] = None
    invoice_number: Optional[str] = None
    amount: Decimal = Field(gt=Decimal("0.00"))
    payment_method: str = Field(default="Bank Wire Transfer")
    reference_note: Optional[str] = "Automated Bank Feed Settlement"
    provider: Optional[str] = "Live Bank API"

@router.post("/payment")
async def ingest_payment_webhook(payload: PaymentWebhookPayload, db: Session = Depends(get_db)):
    """
    Dynamic webhook ingestion: processes incoming payment feeds from payment gateways
    or automated bank statement APIs and updates invoice & financial status in real-time.
    """
    invoice = None
    if payload.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
    elif payload.invoice_number:
        invoice = db.query(Invoice).filter(Invoice.invoice_number == payload.invoice_number).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target invoice could not be matched for incoming payment."
        )

    if invoice.status == InvoiceStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot apply payment to a cancelled invoice."
        )

    if invoice.status == InvoiceStatus.PAID or invoice.amount_due <= Decimal("0.00"):
        return {
            "status": "already_settled",
            "message": f"Invoice {invoice.invoice_number} is already fully paid.",
            "invoice_number": invoice.invoice_number
        }

    # Bound payment to amount_due
    payment_amount = min(payload.amount, invoice.amount_due)

    p_count = db.query(func.count(Payment.id)).scalar() or 0
    payment_number = f"PAY-{date.today().year}-{p_count + 1:05d}"

    payment = Payment(
        payment_number=payment_number,
        invoice_id=invoice.id,
        customer_id=invoice.customer_id,
        payment_method=payload.payment_method,
        amount=payment_amount,
        payment_date=date.today(),
        reference_note=f"[{payload.provider}] {payload.reference_note or ''}".strip()
    )
    db.add(payment)

    invoice.amount_paid += payment_amount
    invoice.amount_due = max(Decimal("0.00"), invoice.grand_total - invoice.amount_paid)

    if invoice.amount_due <= Decimal("0.00"):
        invoice.status = InvoiceStatus.PAID
    elif invoice.status == InvoiceStatus.DRAFT:
        invoice.status = InvoiceStatus.CONFIRMED

    db.commit()
    db.refresh(payment)
    db.refresh(invoice)

    # Broadcast real-time event to all connected dashboards and client sessions
    await manager.broadcast(
        event_type="PAYMENT_RECEIVED",
        payload={
            "payment_id": payment.id,
            "payment_number": payment.payment_number,
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "customer_name": invoice.customer.full_name if invoice.customer else "Customer",
            "amount": float(payment_amount),
            "payment_method": payload.payment_method,
            "invoice_status": invoice.status,
            "amount_due": float(invoice.amount_due),
            "message": f"Real-time payment of ${payment_amount:.2f} received for {invoice.invoice_number}"
        }
    )

    return {
        "status": "success",
        "payment_number": payment.payment_number,
        "amount_settled": float(payment_amount),
        "invoice_number": invoice.invoice_number,
        "invoice_status": invoice.status,
        "amount_due_remaining": float(invoice.amount_due)
    }

@router.post("/simulate-bank-event")
async def simulate_bank_deposit(db: Session = Depends(get_db)):
    """
    Simulation utility for demos & testing:
    Picks the first outstanding invoice with an unpaid balance and simulates
    an immediate real-time bank clearance.
    """
    unpaid_invoice = db.query(Invoice).filter(
        Invoice.status.in_([InvoiceStatus.CONFIRMED, InvoiceStatus.DRAFT]),
        Invoice.amount_due > Decimal("0.00")
    ).order_by(Invoice.id.asc()).first()

    if not unpaid_invoice:
        return {
            "status": "idle",
            "message": "All current invoices are already settled! No outstanding balances to reconcile."
        }

    settle_amount = unpaid_invoice.amount_due
    p_count = db.query(func.count(Payment.id)).scalar() or 0
    p_number = f"PAY-{date.today().year}-{p_count + 1:05d}"

    payment = Payment(
        payment_number=p_number,
        invoice_id=unpaid_invoice.id,
        customer_id=unpaid_invoice.customer_id,
        payment_method="Live Automated Bank ACH",
        amount=settle_amount,
        payment_date=date.today(),
        reference_note="Simulated Live Bank Direct Deposit"
    )
    db.add(payment)

    unpaid_invoice.amount_paid += settle_amount
    unpaid_invoice.amount_due = Decimal("0.00")
    unpaid_invoice.status = InvoiceStatus.PAID

    db.commit()
    db.refresh(payment)
    db.refresh(unpaid_invoice)

    # Broadcast real-time event
    await manager.broadcast(
        event_type="PAYMENT_RECEIVED",
        payload={
            "payment_id": payment.id,
            "payment_number": payment.payment_number,
            "invoice_id": unpaid_invoice.id,
            "invoice_number": unpaid_invoice.invoice_number,
            "customer_name": unpaid_invoice.customer.full_name if unpaid_invoice.customer else "Customer",
            "amount": float(settle_amount),
            "payment_method": "Live Automated Bank ACH",
            "invoice_status": "paid",
            "amount_due": 0.0,
            "message": f"Real-time ACH settlement of ${settle_amount:.2f} processed for {unpaid_invoice.invoice_number}!"
        }
    )

    return {
        "status": "success",
        "message": f"Simulated bank deposit of ${settle_amount:.2f} received for {unpaid_invoice.invoice_number}",
        "payment_number": p_number,
        "invoice_number": unpaid_invoice.invoice_number,
        "amount": float(settle_amount)
    }

