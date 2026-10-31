from datetime import datetime, date
from decimal import Decimal
import re
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator, ConfigDict

# ----------------- User & Auth Schemas -----------------
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class UserRegister(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_policy(cls, v: str) -> str:
        # "the password must be more than eight characters, with an uppercase letter, a lowercase letter and a special character"
        if len(v) <= 8:
            raise ValueError("Password must be more than 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v

class StaffCreate(UserRegister):
    role: str = "staff"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_policy(cls, v: str) -> str:
        if len(v) <= 8:
            raise ValueError("Password must be more than 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ----------------- Product & Variant Schemas -----------------
class ProductVariantBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    attribute_name: str = "Brand"
    attribute_value: str = "Odoo"
    price_extra: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantResponse(ProductVariantBase):
    id: int
    product_id: int
    model_config = ConfigDict(from_attributes=True)

class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    product_type: str = "software"
    sales_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    cost_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    notes: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantCreate]] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    variants: List[ProductVariantResponse] = []
    model_config = ConfigDict(from_attributes=True)

# ----------------- Plan Schemas -----------------
class PlanBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    cost: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    billing_frequency: str = "monthly"
    min_quantity: int = Field(default=1, ge=1)
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    close_on_end: bool = False
    allow_early_close: bool = True
    allow_pause: bool = True
    allow_renewal: bool = True
    is_active: bool = True

class PlanCreate(PlanBase):
    pass

class PlanResponse(PlanBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Quotation Template Schemas -----------------
class QuotationTemplateLineCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(ge=Decimal("0.00"))

class QuotationTemplateLineResponse(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    unit_price: Decimal
    product_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class QuotationTemplateCreate(BaseModel):
    name: str
    plan_id: int
    validity_days: int = 30
    notes: Optional[str] = None
    lines: List[QuotationTemplateLineCreate] = []

class QuotationTemplateResponse(BaseModel):
    id: int
    name: str
    plan_id: int
    validity_days: int
    notes: Optional[str] = None
    lines: List[QuotationTemplateLineResponse] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Tax Rule Schemas -----------------
class TaxRuleBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    rate: Decimal = Field(ge=Decimal("0.00"), le=Decimal("100.00"))
    tax_type: str = "percentage"
    is_active: bool = True

class TaxRuleCreate(TaxRuleBase):
    pass

class TaxRuleResponse(TaxRuleBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Discount Rule Schemas -----------------
class DiscountRuleBase(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=255)
    discount_type: str = "percentage"
    discount_value: Decimal = Field(gt=Decimal("0.00"))
    min_purchase_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    min_quantity: int = Field(default=0, ge=0)
    start_date: date
    end_date: date
    usage_limit: Optional[int] = Field(default=None, ge=1)
    scope: str = "whole_subscription"
    specific_product_ids: Optional[List[int]] = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_discount_boundaries(self) -> "DiscountRuleBase":
        if self.discount_type == "percentage" and self.discount_value > Decimal("100.00"):
            raise ValueError("Percentage discount cannot exceed 100%.")
        if self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date.")
        return self

class DiscountRuleCreate(DiscountRuleBase):
    pass

class DiscountRuleResponse(DiscountRuleBase):
    id: int
    used_count: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Subscription Schemas -----------------
class SubscriptionLineCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(ge=Decimal("0.00"))
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("100.00"))

class SubscriptionLineResponse(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal
    line_amount: Decimal
    product_name: Optional[str] = None
    variant_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class SubscriptionCreate(BaseModel):
    customer_id: int
    plan_id: int
    start_date: date
    expiry_date: Optional[date] = None
    payment_terms: str = "Net 30"
    valid_until: Optional[date] = None
    discount_id: Optional[int] = None
    tax_id: Optional[int] = None
    notes: Optional[str] = None
    lines: List[SubscriptionLineCreate] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validate_subscription_boundaries(self) -> "SubscriptionCreate":
        if self.expiry_date and self.expiry_date < self.start_date:
            raise ValueError("expiry_date cannot be earlier than start_date.")
        return self

class SubscriptionStatusUpdate(BaseModel):
    status: str

class SubscriptionResponse(BaseModel):
    id: int
    subscription_number: str
    customer_id: int
    plan_id: int
    status: str
    start_date: date
    expiry_date: Optional[date] = None
    next_billing_date: date
    last_billed_date: Optional[date] = None
    payment_terms: str
    valid_until: Optional[date] = None
    discount_id: Optional[int] = None
    tax_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    customer: Optional[UserResponse] = None
    plan: Optional[PlanResponse] = None
    discount: Optional[DiscountRuleResponse] = None
    tax: Optional[TaxRuleResponse] = None
    lines: List[SubscriptionLineResponse] = []
    model_config = ConfigDict(from_attributes=True)

# ----------------- Invoice Schemas -----------------
class InvoiceLineResponse(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    product_name: str
    variant_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    line_total: Decimal
    model_config = ConfigDict(from_attributes=True)

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    subscription_id: int
    customer_id: int
    billing_period_start: date
    billing_period_end: date
    status: str
    issue_date: date
    due_date: date
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    amount_paid: Decimal
    amount_due: Decimal
    notes: Optional[str] = None
    created_at: datetime
    lines: List[InvoiceLineResponse] = []
    customer: Optional[UserResponse] = None
    model_config = ConfigDict(from_attributes=True)

class InvoiceStatusUpdate(BaseModel):
    status: str

# ----------------- Payment Schemas -----------------
class PaymentCreate(BaseModel):
    invoice_id: int
    payment_method: str = "Credit Card"
    amount: Decimal = Field(gt=Decimal("0.00"))
    payment_date: Optional[date] = None
    reference_note: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    payment_number: str
    invoice_id: int
    customer_id: int
    payment_method: str
    amount: Decimal
    payment_date: date
    reference_note: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Billing Run & Analytics Schemas -----------------
class BillingRunRequest(BaseModel):
    target_date: Optional[date] = None
    auto_confirm: bool = False

class BillingRunResponse(BaseModel):
    target_date: date
    subscriptions_processed: int
    invoices_generated: int
    total_billed: Decimal
    invoice_ids: List[int]
    skipped_count: int
    notes: str

class AnalyticsSummaryResponse(BaseModel):
    active_subscriptions: int
    total_subscriptions: int
    total_revenue: Decimal
    total_outstanding: Decimal
    overdue_invoices_count: int
    overdue_amount: Decimal
    mrr: Decimal
    arr: Decimal
    paid_invoices_count: int
    unpaid_invoices_count: int
