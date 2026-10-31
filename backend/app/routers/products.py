from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, ProductVariant, User
from app.schemas import (
    ProductCreate, ProductResponse, ProductVariantCreate, ProductVariantResponse
)
from app.security import require_admin, get_current_user

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse])
@router.get("/", response_model=List[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.is_active == True).order_by(Product.name).all()

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    prod_in: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    product = Product(
        name=prod_in.name,
        product_type=prod_in.product_type,
        sales_price=prod_in.sales_price,
        cost_price=prod_in.cost_price,
        notes=prod_in.notes,
        is_active=prod_in.is_active
    )
    db.add(product)
    db.flush()

    if prod_in.variants:
        for v in prod_in.variants:
            variant = ProductVariant(
                product_id=product.id,
                name=v.name,
                attribute_name=v.attribute_name,
                attribute_value=v.attribute_value,
                price_extra=v.price_extra
            )
            db.add(variant)

    db.commit()
    db.refresh(product)
    return product

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product

@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
def add_product_variant(
    product_id: int,
    variant_in: ProductVariantCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    variant = ProductVariant(
        product_id=product.id,
        name=variant_in.name,
        attribute_name=variant_in.attribute_name,
        attribute_value=variant_in.attribute_value,
        price_extra=variant_in.price_extra
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant
