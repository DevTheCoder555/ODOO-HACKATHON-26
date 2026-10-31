from datetime import datetime, date, timezone
from decimal import Decimal
import enum
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean, Date, DateTime,
    ForeignKey, Enum, Index, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    CUSTOMER = "customer"

class BillingFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class SubscriptionStatus(str, enum.Enum):
    DRAFT = "draft"
    QUOTATION = "quotation"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    PAID = "paid"
    CANCELLED = "cancelled"

class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"

class DiscountScope(str, enum.Enum):
    WHOLE_SUBSCRIPTION = "whole_subscription"
    SPECIFIC_PRODUCTS = "specific_products"

# ----------------- User Model -----------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    role = Column(String(50), default=UserRole.CUSTOMER, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    reset_token = Column(String(255), nullable=True, index=True)
    reset_token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    subscriptions = relationship("Subscription", back_populates="customer", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")

# ----------------- Product & Variant Models -----------------
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    product_type = Column(String(100), default="software")  # software, service, add_on, consumable
    sales_price = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    cost_price = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")

class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False) # e.g. "Odoo Brand Edition"
    attribute_name = Column(String(100), default="Brand")
    attribute_value = Column(String(100), default="Odoo")
    price_extra = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False) # e.g. 560.00

    product = relationship("Product", back_populates="variants")

# ----------------- Subscription Plan Model -----------------
class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    cost = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    billing_frequency = Column(String(50), default=BillingFrequency.MONTHLY, nullable=False) # daily, weekly, monthly, yearly
    min_quantity = Column(Integer, default=1, nullable=False)
    available_from = Column(Date, nullable=True)
    available_to = Column(Date, nullable=True)
    
    # Lifecycle controls:
    close_on_end = Column(Boolean, default=False)       # Closes automatically when end date is reached
    allow_early_close = Column(Boolean, default=True)   # Can be cancelled/closed early
    allow_pause = Column(Boolean, default=True)         # Can be paused and resumed
    allow_renewal = Column(Boolean, default=True)       # Can be renewed
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    subscriptions = relationship("Subscription", back_populates="plan")
    quotation_templates = relationship("QuotationTemplate", back_populates="plan")

# ----------------- Quotation Template Model -----------------
class QuotationTemplate(Base):
    __tablename__ = "quotation_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    validity_days = Column(Integer, default=30)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    plan = relationship("Plan", back_populates="quotation_templates")
    lines = relationship("QuotationTemplateLine", back_populates="template", cascade="all, delete-orphan")

class QuotationTemplateLine(Base):
    __tablename__ = "quotation_template_lines"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("quotation_templates.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)

    template = relationship("QuotationTemplate", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")

# ----------------- Tax Rule Model -----------------
class TaxRule(Base):
    __tablename__ = "tax_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    rate = Column(Numeric(6, 4), default=Decimal("0.00"), nullable=False)
    tax_type = Column(String(50), default="percentage")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

# ----------------- Discount Rule Model -----------------
class DiscountRule(Base):
    __tablename__ = "discount_rules"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    discount_type = Column(String(50), default=DiscountType.PERCENTAGE, nullable=False)
    discount_value = Column(Numeric(12, 2), nullable=False)
    min_purchase_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    min_quantity = Column(Integer, default=0, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0, nullable=False)
    scope = Column(String(50), default=DiscountScope.WHOLE_SUBSCRIPTION, nullable=False)
    specific_product_ids = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

# ----------------- Subscription Model -----------------
class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    subscription_number = Column(String(100), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False, index=True)
    status = Column(String(50), default=SubscriptionStatus.DRAFT, nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=True)
    next_billing_date = Column(Date, nullable=False, index=True)
    last_billed_date = Column(Date, nullable=True)
    payment_terms = Column(String(100), default="Net 30")
    valid_until = Column(Date, nullable=True)
    discount_id = Column(Integer, ForeignKey("discount_rules.id"), nullable=True)
    tax_id = Column(Integer, ForeignKey("tax_rules.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    customer = relationship("User", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    discount = relationship("DiscountRule")
    tax = relationship("TaxRule")
    lines = relationship("SubscriptionLine", back_populates="subscription", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="subscription", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_subscription_billing", "status", "next_billing_date"),
        Index("idx_subscription_customer_status", "customer_id", "status"),
    )

class SubscriptionLine(Base):
    __tablename__ = "subscription_lines"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(6, 4), default=Decimal("0.00"), nullable=False)
    line_amount = Column(Numeric(12, 2), nullable=False)

    subscription = relationship("Subscription", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")

# ----------------- Invoice Model -----------------
class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), unique=True, index=True, nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    billing_period_start = Column(Date, nullable=False)
    billing_period_end = Column(Date, nullable=False)
    status = Column(String(50), default=InvoiceStatus.DRAFT, nullable=False, index=True)
    issue_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=False, index=True)
    subtotal = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    tax_total = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_total = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    grand_total = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    amount_paid = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    amount_due = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    subscription = relationship("Subscription", back_populates="invoices")
    customer = relationship("User", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_invoice_status_due", "status", "due_date"),
        Index("idx_invoice_customer_status", "customer_id", "status"),
        Index("idx_invoice_sub_period", "subscription_id", "billing_period_start", "billing_period_end", unique=True),
    )

class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    product_name = Column(String(255), nullable=False)
    variant_name = Column(String(255), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(6, 4), default=Decimal("0.00"), nullable=False)
    tax_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")

# ----------------- Payment Model -----------------
class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(100), unique=True, index=True, nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    payment_method = Column(String(100), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date, default=date.today, nullable=False, index=True)
    reference_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    invoice = relationship("Invoice", back_populates="payments")
    customer = relationship("User", back_populates="payments")

    __table_args__ = (
        Index("idx_payment_date_amount", "payment_date", "amount"),
    )
