from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Subscription, SubscriptionStatus, User, UserRole
from app.schemas import (
    SubscriptionCreate, SubscriptionResponse, SubscriptionStatusUpdate, InvoiceResponse
)
from app.services.subscription_service import SubscriptionService
from app.services.billing_service import BillingService
from app.security import get_current_user, require_staff_or_admin
from app.realtime import manager

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])

@router.get("", response_model=List[SubscriptionResponse])
@router.get("/", response_model=List[SubscriptionResponse])
def list_subscriptions(
    status_filter: Optional[str] = Query(None, alias="status"),
    plan_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Subscription)

    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Subscription.customer_id == current_user.id)
    else:
        if customer_id:
            query = query.filter(Subscription.customer_id == customer_id)

    if status_filter:
        query = query.filter(Subscription.status == status_filter)

    if plan_id:
        query = query.filter(Subscription.plan_id == plan_id)

    if search:
        query = query.filter(Subscription.subscription_number.ilike(f"%{search}%"))

    subscriptions = query.order_by(Subscription.id.desc()).all()

    for sub in subscriptions:
        for l in sub.lines:
            if l.product:
                l.product_name = l.product.name
            if l.variant:
                l.variant_name = l.variant.name

    return subscriptions

@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    sub_in: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    sub = SubscriptionService.create_subscription(db, sub_in, initial_status=SubscriptionStatus.DRAFT)
    for l in sub.lines:
        if l.product:
            l.product_name = l.product.name
        if l.variant:
            l.variant_name = l.variant.name
    return sub

@router.post("/from-template", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription_from_template(
    template_id: int,
    customer_id: int,
    start_date: Optional[date] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    sub = SubscriptionService.create_from_template(
        db=db,
        template_id=template_id,
        customer_id=customer_id,
        start_date=start_date,
        notes=notes
    )
    for l in sub.lines:
        if l.product:
            l.product_name = l.product.name
        if l.variant:
            l.variant_name = l.variant.name
    return sub

@router.get("/{sub_id}", response_model=SubscriptionResponse)
def get_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    for l in sub.lines:
        if l.product:
            l.product_name = l.product.name
        if l.variant:
            l.variant_name = l.variant.name
    return sub

@router.patch("/{sub_id}/status", response_model=SubscriptionResponse)
def update_subscription_status(
    sub_id: int,
    update: SubscriptionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    if current_user.role == UserRole.CUSTOMER:
        if sub.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if update.status not in [SubscriptionStatus.PAUSED, SubscriptionStatus.CLOSED, SubscriptionStatus.ACTIVE]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Action not permitted for customer.")

    updated_sub = SubscriptionService.transition_status(
        db=db,
        subscription=sub,
        new_status=update.status,
        user_role=current_user.role
    )
    for l in updated_sub.lines:
        if l.product:
            l.product_name = l.product.name
        if l.variant:
            l.variant_name = l.variant.name

    manager.broadcast_sync(
        event_type="SUBSCRIPTION_STATUS_UPDATED",
        payload={
            "subscription_id": updated_sub.id,
            "subscription_number": updated_sub.subscription_number,
            "status": updated_sub.status,
            "customer_id": updated_sub.customer_id,
            "message": f"Subscription {updated_sub.subscription_number} is now {updated_sub.status.upper()}"
        }
    )

    return updated_sub

@router.post("/{sub_id}/generate-invoice", response_model=InvoiceResponse)
def generate_invoice_for_subscription(
    sub_id: int,
    issue_date: Optional[date] = None,
    auto_confirm: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    inv = BillingService.generate_invoice(db, sub, issue_date=issue_date, auto_confirm=auto_confirm)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice already generated for the current billing period or subscription is not active."
        )
    return inv
