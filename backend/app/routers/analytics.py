from datetime import date
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AnalyticsSummaryResponse
from app.services.analytics_service import AnalyticsService
from app.security import require_staff_or_admin

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Finance"])

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_finance_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    plan_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff_or_admin)
):
    """
    Page 4: 'The finance lead, at the end of the month:
    How many subscriptions are active? How much revenue came in, and how much is still owed?
    Which invoices are overdue? With thousands of subscriptions on the books, every page should still respond in under two seconds.'
    """
    return AnalyticsService.get_finance_summary(
        db=db,
        start_date=start_date,
        end_date=end_date,
        plan_id=plan_id,
        customer_id=customer_id
    )

@router.get("/revenue-trends")
def get_revenue_trends(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    user: User = Depends(require_staff_or_admin)
):
    return AnalyticsService.get_revenue_trends(db=db, months=months)

@router.get("/plan-distribution")
def get_plan_distribution(
    db: Session = Depends(get_db),
    user: User = Depends(require_staff_or_admin)
):
    return AnalyticsService.get_plan_distribution(db=db)

