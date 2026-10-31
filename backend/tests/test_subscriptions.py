import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def admin_headers():
    login_res = client.post("/api/auth/login", json={
        "email": "admin@brightloop.com",
        "password": "AdminPass123!"
    })
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_product_with_variant_price_surcharge(admin_headers):
    # Create product with variant that adds 560 to price (Page 3 requirement)
    prod_res = client.post("/api/products", headers=admin_headers, json={
        "name": "Brightloop Enterprise Suite",
        "product_type": "software",
        "sales_price": "1000.00",
        "cost_price": "300.00",
        "variants": [
            {
                "name": "Odoo Brand Edition",
                "attribute_name": "Brand",
                "attribute_value": "Odoo",
                "price_extra": "560.00"
            }
        ]
    })
    assert prod_res.status_code == 201
    prod_data = prod_res.json()
    assert len(prod_data["variants"]) == 1
    assert float(prod_data["variants"][0]["price_extra"]) == 560.00

def test_plan_lifecycle_configuration(admin_headers):
    # Create plan with strict lifecycle flags
    plan_res = client.post("/api/plans", headers=admin_headers, json={
        "name": "Strict Annual Plan",
        "cost": "2400.00",
        "billing_frequency": "yearly",
        "min_quantity": 3,
        "close_on_end": True,
        "allow_early_close": False, # Cannot be closed early
        "allow_pause": False,       # Cannot be paused
        "allow_renewal": True
    })
    assert plan_res.status_code == 201
    plan_data = plan_res.json()
    assert plan_data["allow_pause"] is False
    assert plan_data["allow_early_close"] is False

def test_quotation_template_to_subscription(admin_headers):
    # Fetch existing template
    tpls = client.get("/api/templates", headers=admin_headers).json()
    assert len(tpls) > 0
    tpl = tpls[0]

    # Customers
    custs = client.get("/api/users/customers", headers=admin_headers).json()
    cust_id = custs[0]["id"]

    # Turn template into a quote
    quote_res = client.post(
        f"/api/subscriptions/from-template?template_id={tpl['id']}&customer_id={cust_id}",
        headers=admin_headers
    )
    assert quote_res.status_code == 201
    quote = quote_res.json()
    assert quote["status"] == "quotation"
    assert len(quote["lines"]) > 0

    # Lifecycle transition: Quotation -> Confirmed -> Active
    sub_id = quote["id"]
    conf_res = client.patch(f"/api/subscriptions/{sub_id}/status", headers=admin_headers, json={"status": "confirmed"})
    assert conf_res.status_code == 200
    assert conf_res.json()["status"] == "confirmed"

    act_res = client.patch(f"/api/subscriptions/{sub_id}/status", headers=admin_headers, json={"status": "active"})
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "active"

def test_input_boundaries_validation(admin_headers):
    # 1. Negative price product
    bad_prod = client.post("/api/products", headers=admin_headers, json={
        "name": "Bad Product",
        "sales_price": "-10.00"
    })
    assert bad_prod.status_code == 422

    # 2. Plan with invalid min_quantity
    bad_plan = client.post("/api/plans", headers=admin_headers, json={
        "name": "Bad Plan",
        "min_quantity": 0
    })
    assert bad_plan.status_code == 422

    # 3. Discount with percentage > 100
    bad_disc = client.post("/api/discounts", headers=admin_headers, json={
        "code": "OVER100",
        "name": "Over 100%",
        "discount_type": "percentage",
        "discount_value": "150.00",
        "start_date": "2026-01-01",
        "end_date": "2026-12-31"
    })
    assert bad_disc.status_code == 422

    # 4. Discount with end_date < start_date
    bad_dates = client.post("/api/discounts", headers=admin_headers, json={
        "code": "BADDATES",
        "name": "Inverted Dates",
        "discount_type": "percentage",
        "discount_value": "10.00",
        "start_date": "2026-12-31",
        "end_date": "2026-01-01"
    })
    assert bad_dates.status_code == 422

    # 5. Subscription with empty lines
    bad_sub = client.post("/api/subscriptions", headers=admin_headers, json={
        "customer_id": 1,
        "plan_id": 1,
        "start_date": "2026-01-01",
        "lines": []
    })
    assert bad_sub.status_code == 422

