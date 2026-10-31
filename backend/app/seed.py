from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.database import engine, Base, SessionLocal
from app.models import (
    User, UserRole, Product, ProductVariant, Plan, BillingFrequency,
    QuotationTemplate, QuotationTemplateLine, TaxRule, DiscountRule, DiscountType, DiscountScope,
    Subscription, SubscriptionLine, SubscriptionStatus, Invoice, InvoiceLine, InvoiceStatus,
    Payment
)
from app.security import get_password_hash

def seed_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    if db.query(User).filter(User.email == "admin@brightloop.com").first():
        print("Database already seeded.")
        db.close()
        return

    print("Seeding Brightloop database with enterprise initial data...")

    # 1. Users
    admin = User(
        email="admin@brightloop.com",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Sarah Jenkins (Admin)",
        company_name="Brightloop Software HQ",
        phone="+1 555-0100",
        address="100 Innovation Way, Suite 400, San Francisco, CA",
        role=UserRole.ADMIN,
        is_active=True
    )
    staff = User(
        email="staff@brightloop.com",
        hashed_password=get_password_hash("StaffPass123!"),
        full_name="David Miller (Sales & Ops)",
        company_name="Brightloop Software",
        phone="+1 555-0101",
        role=UserRole.STAFF,
        is_active=True
    )
    customer_enterprise = User(
        email="john@enterprise-corp.com",
        hashed_password=get_password_hash("CustomerPass123!"),
        full_name="John Vance",
        company_name="Enterprise Corp Inc.",
        phone="+1 555-0199",
        address="742 Evergreen Terrace, Chicago, IL",
        role=UserRole.CUSTOMER,
        is_active=True
    )
    customer_smb = User(
        email="sarah@localbakery.com",
        hashed_password=get_password_hash("CustomerPass123!"),
        full_name="Sarah Conners",
        company_name="Artisan Bread & Bakes",
        phone="+1 555-0188",
        address="12 Main Street, Austin, TX",
        role=UserRole.CUSTOMER,
        is_active=True
    )
    customer_tech = User(
        email="alex@techstartup.io",
        hashed_password=get_password_hash("CustomerPass123!"),
        full_name="Alex Chen",
        company_name="NextGen Analytics Labs",
        phone="+1 555-0177",
        address="45 King Street, Seattle, WA",
        role=UserRole.CUSTOMER,
        is_active=True
    )
    db.add_all([admin, staff, customer_enterprise, customer_smb, customer_tech])
    db.flush()

    # 2. Taxes
    tax_vat = TaxRule(name="Standard VAT (20%)", rate=Decimal("0.20"), tax_type="percentage", is_active=True)
    tax_sales = TaxRule(name="Software Sales Tax (10%)", rate=Decimal("0.10"), tax_type="percentage", is_active=True)
    tax_zero = TaxRule(name="Zero Tax (B2B Export 0%)", rate=Decimal("0.00"), tax_type="percentage", is_active=True)
    db.add_all([tax_vat, tax_sales, tax_zero])
    db.flush()

    # 3. Products & Variants (incorporating Page 3 variant requirement!)
    p_erp = Product(
        name="Brightloop Core ERP",
        product_type="software",
        sales_price=Decimal("1200.00"),
        cost_price=Decimal("350.00"),
        notes="Complete business operations, inventory, and financials engine.",
        is_active=True
    )
    p_crm = Product(
        name="Brightloop CRM",
        product_type="software",
        sales_price=Decimal("450.00"),
        cost_price=Decimal("120.00"),
        notes="Pipeline, leads, sales quotes and client relationships.",
        is_active=True
    )
    p_analytics = Product(
        name="Predictive AI & Analytics Add-on",
        product_type="add_on",
        sales_price=Decimal("250.00"),
        cost_price=Decimal("60.00"),
        notes="Machine learning forecast model and executive reporting dashboards.",
        is_active=True
    )
    p_support = Product(
        name="Dedicated 24/7 Enterprise SLA Support",
        product_type="service",
        sales_price=Decimal("500.00"),
        cost_price=Decimal("150.00"),
        notes="15-minute response SLA, dedicated technical account manager.",
        is_active=True
    )
    db.add_all([p_erp, p_crm, p_analytics, p_support])
    db.flush()

    # Variants: "choosing the Odoo brand adds 560 to the price" (Page 3)
    v_erp_odoo = ProductVariant(
        product_id=p_erp.id,
        name="Odoo Brand Edition",
        attribute_name="Brand",
        attribute_value="Odoo",
        price_extra=Decimal("560.00")
    )
    v_erp_std = ProductVariant(
        product_id=p_erp.id,
        name="Brightloop Standard Edition",
        attribute_name="Brand",
        attribute_value="Standard",
        price_extra=Decimal("0.00")
    )
    db.add_all([v_erp_odoo, v_erp_std])
    db.flush()

    # 4. Subscription Plans (Page 3)
    plan_daily = Plan(
        name="Developer Sandbox (Daily)",
        cost=Decimal("20.00"),
        billing_frequency=BillingFrequency.DAILY,
        min_quantity=1,
        available_from=date.today() - timedelta(days=90),
        available_to=date.today() + timedelta(days=365),
        close_on_end=True,       # Closes on its own
        allow_early_close=True,
        allow_pause=False,
        allow_renewal=True,
        is_active=True
    )
    plan_weekly = Plan(
        name="Growth Sprint (Weekly)",
        cost=Decimal("150.00"),
        billing_frequency=BillingFrequency.WEEKLY,
        min_quantity=2,
        available_from=date.today() - timedelta(days=90),
        available_to=date.today() + timedelta(days=365),
        close_on_end=False,
        allow_early_close=True,
        allow_pause=True,        # Pausable
        allow_renewal=True,
        is_active=True
    )
    plan_monthly = Plan(
        name="Business Professional (Monthly)",
        cost=Decimal("499.00"),
        billing_frequency=BillingFrequency.MONTHLY,
        min_quantity=1,
        available_from=date.today() - timedelta(days=180),
        available_to=date.today() + timedelta(days=365),
        close_on_end=False,
        allow_early_close=True,
        allow_pause=True,
        allow_renewal=True,
        is_active=True
    )
    plan_annual = Plan(
        name="Enterprise Scale (Yearly Contract)",
        cost=Decimal("4800.00"),
        billing_frequency=BillingFrequency.YEARLY,
        min_quantity=5,          # Minimum 5 seats
        available_from=date.today() - timedelta(days=365),
        available_to=date.today() + timedelta(days=730),
        close_on_end=False,
        allow_early_close=False, # Yearly contracts cannot be closed early
        allow_pause=True,
        allow_renewal=True,
        is_active=True
    )
    db.add_all([plan_daily, plan_weekly, plan_monthly, plan_annual])
    db.flush()

    # 5. Quotation Templates (Page 3)
    tpl_enterprise = QuotationTemplate(
        name="Enterprise Cloud ERP Template (30 Days)",
        plan_id=plan_annual.id,
        validity_days=30,
        notes="Standard template for enterprise companies with Odoo Brand and Support."
    )
    db.add(tpl_enterprise)
    db.flush()

    line1 = QuotationTemplateLine(
        template_id=tpl_enterprise.id,
        product_id=p_erp.id,
        variant_id=v_erp_odoo.id,
        quantity=5,
        unit_price=Decimal("1760.00") # 1200 + 560
    )
    line2 = QuotationTemplateLine(
        template_id=tpl_enterprise.id,
        product_id=p_support.id,
        quantity=1,
        unit_price=Decimal("500.00")
    )
    db.add_all([line1, line2])

    tpl_smb = QuotationTemplate(
        name="SMB Quick-Start Template (15 Days)",
        plan_id=plan_monthly.id,
        validity_days=15,
        notes="Rapid onboarding template for local businesses."
    )
    db.add(tpl_smb)
    db.flush()

    line3 = QuotationTemplateLine(
        template_id=tpl_smb.id,
        product_id=p_crm.id,
        quantity=2,
        unit_price=Decimal("450.00")
    )
    db.add(line3)
    db.flush()

    # 6. Discount Rules (Page 4)
    disc_volume = DiscountRule(
        code="VOLUME10",
        name="Volume Seat Discount (10% Off for >= 5 Seats)",
        discount_type=DiscountType.PERCENTAGE,
        discount_value=Decimal("10.00"),
        min_purchase_amount=Decimal("0.00"),
        min_quantity=5,
        start_date=date.today() - timedelta(days=60),
        end_date=date.today() + timedelta(days=120),
        usage_limit=100,
        used_count=4,
        scope=DiscountScope.WHOLE_SUBSCRIPTION,
        is_active=True
    )
    disc_fixed = DiscountRule(
        code="BIGBUSINESS500",
        name="Enterprise Tier Fixed Discount ($500 Off Orders > $3,000)",
        discount_type=DiscountType.FIXED,
        discount_value=Decimal("500.00"),
        min_purchase_amount=Decimal("3000.00"),
        min_quantity=0,
        start_date=date.today() - timedelta(days=30),
        end_date=date.today() + timedelta(days=90),
        usage_limit=50,
        used_count=2,
        scope=DiscountScope.WHOLE_SUBSCRIPTION,
        is_active=True
    )
    disc_product = DiscountRule(
        code="ODDO20",
        name="Odoo Brand Special Promotion (20% Off Core ERP)",
        discount_type=DiscountType.PERCENTAGE,
        discount_value=Decimal("20.00"),
        min_purchase_amount=Decimal("0.00"),
        min_quantity=1,
        start_date=date.today() - timedelta(days=15),
        end_date=date.today() + timedelta(days=60),
        usage_limit=25,
        used_count=1,
        scope=DiscountScope.SPECIFIC_PRODUCTS,
        specific_product_ids=[p_erp.id],
        is_active=True
    )
    db.add_all([disc_volume, disc_fixed, disc_product])
    db.flush()

    # 7. Subscriptions
    # Sub 1: Active Enterprise Annual
    sub_ent = Subscription(
        subscription_number="SUB-2026-00001",
        customer_id=customer_enterprise.id,
        plan_id=plan_annual.id,
        status=SubscriptionStatus.ACTIVE,
        start_date=date.today() - timedelta(days=120),
        expiry_date=date.today() + timedelta(days=245),
        next_billing_date=date.today() + timedelta(days=245), # Annual
        last_billed_date=date.today() - timedelta(days=120),
        payment_terms="Net 30",
        discount_id=disc_volume.id,
        tax_id=tax_sales.id,
        notes="High-value client yearly contract with 5 Odoo brand licenses and Volume discount."
    )
    db.add(sub_ent)
    db.flush()

    sub_ent_l1 = SubscriptionLine(
        subscription_id=sub_ent.id,
        product_id=p_erp.id,
        variant_id=v_erp_odoo.id,
        quantity=5,
        unit_price=Decimal("1760.00"),
        tax_rate=Decimal("0.10"),
        line_amount=Decimal("8800.00")
    )
    sub_ent_l2 = SubscriptionLine(
        subscription_id=sub_ent.id,
        product_id=p_support.id,
        quantity=1,
        unit_price=Decimal("500.00"),
        tax_rate=Decimal("0.10"),
        line_amount=Decimal("500.00")
    )
    db.add_all([sub_ent_l1, sub_ent_l2])

    # Sub 2: Active Monthly Business Pro (Due TODAY for instant billing engine demonstration!)
    sub_smb = Subscription(
        subscription_number="SUB-2026-00002",
        customer_id=customer_smb.id,
        plan_id=plan_monthly.id,
        status=SubscriptionStatus.ACTIVE,
        start_date=date.today() - timedelta(days=30),
        expiry_date=None,
        next_billing_date=date.today(), # Due today!
        last_billed_date=date.today() - timedelta(days=30),
        payment_terms="Net 15",
        tax_id=tax_vat.id,
        notes="Monthly subscription for bakery business operations."
    )
    db.add(sub_smb)
    db.flush()

    sub_smb_l1 = SubscriptionLine(
        subscription_id=sub_smb.id,
        product_id=p_crm.id,
        quantity=2,
        unit_price=Decimal("450.00"),
        tax_rate=Decimal("0.20"),
        line_amount=Decimal("900.00")
    )
    db.add(sub_smb_l1)

    # Sub 3: Quotation State (Draft -> Quotation waiting for confirmation)
    sub_quote = Subscription(
        subscription_number="SUB-2026-00003",
        customer_id=customer_tech.id,
        plan_id=plan_monthly.id,
        status=SubscriptionStatus.QUOTATION,
        start_date=date.today() + timedelta(days=5),
        expiry_date=None,
        next_billing_date=date.today() + timedelta(days=5),
        payment_terms="Net 30",
        valid_until=date.today() + timedelta(days=15),
        tax_id=tax_sales.id,
        notes="Proposal sent to Alex Chen for CRM + AI Add-on."
    )
    db.add(sub_quote)
    db.flush()

    sub_quote_l1 = SubscriptionLine(
        subscription_id=sub_quote.id,
        product_id=p_crm.id,
        quantity=3,
        unit_price=Decimal("450.00"),
        tax_rate=Decimal("0.10"),
        line_amount=Decimal("1350.00")
    )
    sub_quote_l2 = SubscriptionLine(
        subscription_id=sub_quote.id,
        product_id=p_analytics.id,
        quantity=1,
        unit_price=Decimal("250.00"),
        tax_rate=Decimal("0.10"),
        line_amount=Decimal("250.00")
    )
    db.add_all([sub_quote_l1, sub_quote_l2])

    # Sub 4: Paused Subscription
    sub_paused = Subscription(
        subscription_number="SUB-2026-00004",
        customer_id=customer_tech.id,
        plan_id=plan_weekly.id,
        status=SubscriptionStatus.PAUSED,
        start_date=date.today() - timedelta(days=60),
        expiry_date=None,
        next_billing_date=date.today() + timedelta(days=14),
        payment_terms="Immediate",
        notes="Customer paused project sprint temporarily."
    )
    db.add(sub_paused)
    db.flush()

    sub_paused_l1 = SubscriptionLine(
        subscription_id=sub_paused.id,
        product_id=p_analytics.id,
        quantity=2,
        unit_price=Decimal("250.00"),
        tax_rate=Decimal("0.00"),
        line_amount=Decimal("500.00")
    )
    db.add(sub_paused_l1)

    # 8. Invoices (Past & Present)
    # Invoice 1: Paid Invoice for Enterprise Corp
    inv_paid = Invoice(
        invoice_number="INV-202606-00001",
        subscription_id=sub_ent.id,
        customer_id=customer_enterprise.id,
        billing_period_start=date.today() - timedelta(days=120),
        billing_period_end=date.today() + timedelta(days=245),
        status=InvoiceStatus.PAID,
        issue_date=date.today() - timedelta(days=120),
        due_date=date.today() - timedelta(days=90),
        subtotal=Decimal("9300.00"),
        tax_total=Decimal("837.00"),
        discount_total=Decimal("930.00"), # 10% volume discount
        grand_total=Decimal("9207.00"),
        amount_paid=Decimal("9207.00"),
        amount_due=Decimal("0.00"),
        notes="Annual license fee with Volume seat discount applied."
    )
    db.add(inv_paid)
    db.flush()

    inv_paid_line = InvoiceLine(
        invoice_id=inv_paid.id,
        product_id=p_erp.id,
        variant_id=v_erp_odoo.id,
        product_name="Brightloop Core ERP",
        variant_name="Odoo Brand Edition",
        quantity=5,
        unit_price=Decimal("1760.00"),
        tax_rate=Decimal("0.10"),
        tax_amount=Decimal("880.00"),
        discount_amount=Decimal("880.00"),
        line_total=Decimal("8800.00")
    )
    db.add(inv_paid_line)

    pay_1 = Payment(
        payment_number="PAY-2026-00001",
        invoice_id=inv_paid.id,
        customer_id=customer_enterprise.id,
        payment_method="Bank Transfer (Wire)",
        amount=Decimal("9207.00"),
        payment_date=date.today() - timedelta(days=100),
        reference_note="WIRE-REF-8849204US"
    )
    db.add(pay_1)

    # Invoice 2: Overdue Confirmed Invoice for Bakery (Page 4 finance lead requirement)
    inv_overdue = Invoice(
        invoice_number="INV-202609-00002",
        subscription_id=sub_smb.id,
        customer_id=customer_smb.id,
        billing_period_start=date.today() - timedelta(days=60),
        billing_period_end=date.today() - timedelta(days=30),
        status=InvoiceStatus.CONFIRMED,
        issue_date=date.today() - timedelta(days=45),
        due_date=date.today() - timedelta(days=15), # 15 days overdue!
        subtotal=Decimal("900.00"),
        tax_total=Decimal("180.00"), # 20% VAT
        discount_total=Decimal("0.00"),
        grand_total=Decimal("1080.00"),
        amount_paid=Decimal("200.00"), # Partially paid
        amount_due=Decimal("880.00"),
        notes="Previous cycle billing - partially paid, awaiting remaining balance."
    )
    db.add(inv_overdue)
    db.flush()

    pay_2 = Payment(
        payment_number="PAY-2026-00002",
        invoice_id=inv_overdue.id,
        customer_id=customer_smb.id,
        payment_method="Credit Card",
        amount=Decimal("200.00"),
        payment_date=date.today() - timedelta(days=25),
        reference_note="CC-AUTH-39420"
    )
    db.add(pay_2)

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()

