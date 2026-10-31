from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserResponse, StaffCreate
from app.security import require_admin, require_staff_or_admin, get_password_hash

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.post("/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff_member(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Page 2 requirement: 'Only the admin can add a new member of staff.'
    """
    existing_user = db.query(User).filter(User.email == staff_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    hashed_pwd = get_password_hash(staff_in.password)
    new_staff = User(
        email=staff_in.email,
        hashed_password=hashed_pwd,
        full_name=staff_in.full_name,
        company_name="Brightloop Software",
        phone=staff_in.phone,
        address=staff_in.address,
        role=UserRole.STAFF,
        is_active=True
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return new_staff

@router.get("/customers", response_model=List[UserResponse])
def get_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    return db.query(User).filter(User.role == UserRole.CUSTOMER).order_by(User.full_name).all()

@router.get("/staff", response_model=List[UserResponse])
def get_staff_members(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return db.query(User).filter(User.role.in_([UserRole.STAFF, UserRole.ADMIN])).order_by(User.full_name).all()

@router.get("", response_model=List[UserResponse])
@router.get("/", response_model=List[UserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return db.query(User).order_by(User.id).all()

