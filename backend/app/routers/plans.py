from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Plan, User
from app.schemas import PlanCreate, PlanResponse
from app.security import require_admin

router = APIRouter(prefix="/api/plans", tags=["Subscription Plans"])

@router.get("", response_model=List[PlanResponse])
@router.get("/", response_model=List[PlanResponse])
def list_plans(db: Session = Depends(get_db)):
    return db.query(Plan).filter(Plan.is_active == True).order_by(Plan.name).all()

@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    plan_in: PlanCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    plan = Plan(
        name=plan_in.name,
        cost=plan_in.cost,
        billing_frequency=plan_in.billing_frequency,
        min_quantity=plan_in.min_quantity,
        available_from=plan_in.available_from,
        available_to=plan_in.available_to,
        close_on_end=plan_in.close_on_end,
        allow_early_close=plan_in.allow_early_close,
        allow_pause=plan_in.allow_pause,
        allow_renewal=plan_in.allow_renewal,
        is_active=plan_in.is_active
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.get("/{plan_id}", response_model=PlanResponse)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan
