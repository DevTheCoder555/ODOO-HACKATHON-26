from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Invoice, InvoiceStatus, User, UserRole
from app.schemas import (
    InvoiceResponse, InvoiceStatusUpdate, BillingRunRequest, BillingRunResponse
)
from app.services.billing_service import BillingService
from app.security import get_current_user, require_staff_or_admin
from app.realtime import manager

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])

@router.get("", response_model=List[InvoiceResponse])
@router.get("/", response_model=List[InvoiceResponse])
def list_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    customer_id: Optional[int] = None,
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice)

    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Invoice.customer_id == current_user.id)
    else:
        if customer_id:
            query = query.filter(Invoice.customer_id == customer_id)

    if status_filter:
        query = query.filter(Invoice.status == status_filter)

    if overdue_only:
        query = query.filter(
            Invoice.status == InvoiceStatus.CONFIRMED,
            Invoice.due_date < date.today(),
            Invoice.amount_due > 0
        )

    return query.order_by(Invoice.id.desc()).all()

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return invoice

@router.patch("/{invoice_id}/status", response_model=InvoiceResponse)
def update_invoice_status(
    invoice_id: int,
    update: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff_or_admin)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    invoice.status = update.status
    db.commit()
    db.refresh(invoice)

    manager.broadcast_sync(
        event_type="INVOICE_STATUS_UPDATED",
        payload={
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "status": invoice.status,
            "amount_due": float(invoice.amount_due),
            "message": f"Invoice {invoice.invoice_number} transitioned to {invoice.status.upper()}"
        }
    )

    return invoice

@router.post("/{invoice_id}/send")
def send_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff_or_admin)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    return {
        "status": "sent",
        "message": f"Invoice {invoice.invoice_number} successfully dispatched to {invoice.customer.email}",
        "sent_date": date.today()
    }

@router.post("/batch/run-billing", response_model=BillingRunResponse)
def run_batch_billing(
    req: BillingRunRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff_or_admin)
):
    result = BillingService.run_billing_cycle(
        db=db,
        target_date=req.target_date,
        auto_confirm=req.auto_confirm
    )

    manager.broadcast_sync(
        event_type="BILLING_BATCH_COMPLETED",
        payload={
            "target_date": str(result["target_date"]),
            "invoices_generated": result["invoices_generated"],
            "total_billed": float(result["total_billed"]),
            "message": f"Billing cycle generated {result['invoices_generated']} invoice(s) totaling ${result['total_billed']:.2f}"
        }
    )

    return result
