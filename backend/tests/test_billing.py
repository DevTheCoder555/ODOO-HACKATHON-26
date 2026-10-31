import pytest
from datetime import date, timedelta
from decimal import Decimal
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

def test_automated_billing_run_and_idempotency(admin_headers):
    today_str = date.today().isoformat()

    # Run batch billing
    run_res = client.post("/api/invoices/batch/run-billing", headers=admin_headers, json={
        "target_date": today_str,
        "auto_confirm": True
    })
    assert run_res.status_code == 200
    res_data = run_res.json()

    # Run again for the EXACT same target date:
    # IDEMPOTENCY CHECK: No duplicate invoices should be created!
    run_again = client.post("/api/invoices/batch/run-billing", headers=admin_headers, json={
        "target_date": today_str,
        "auto_confirm": True
    })
    assert run_again.status_code == 200
    res_again = run_again.json()
    assert res_again["invoices_generated"] == 0, "Duplicate billing prevented!"

def test_invoice_payment_recording_and_lifecycle(admin_headers):
    # Fetch invoices
    invoices_res = client.get("/api/invoices", headers=admin_headers)
    assert invoices_res.status_code == 200
    invoices = invoices_res.json()
    
    # If no confirmed invoice with due amount, pick or confirm one
    unpaid = [inv for inv in invoices if float(inv["amount_due"]) > 0]
    if not unpaid:
        # Generate one from first active subscription
        subs = client.get("/api/subscriptions?status=active", headers=admin_headers).json()
        sub_id = subs[0]["id"]
        inv = client.post(f"/api/subscriptions/{sub_id}/generate-invoice?auto_confirm=true", headers=admin_headers).json()
        unpaid = [inv]

    inv = unpaid[0]
    inv_id = inv["id"]
    if inv["status"] == "draft":
        client.patch(f"/api/invoices/{inv_id}/status", headers=admin_headers, json={"status": "confirmed"})

    due_before = Decimal(str(inv["amount_due"]))
    assert due_before > 0

    # Record partial payment
    partial_amount = (due_before / Decimal("2.0")).quantize(Decimal("0.01"))
    pay_res = client.post("/api/payments", headers=admin_headers, json={
        "invoice_id": inv_id,
        "payment_method": "Credit Card",
        "amount": str(partial_amount),
        "reference_note": "Partial payment test"
    })
    assert pay_res.status_code == 201

    # Check invoice status remains confirmed with reduced balance
    inv_check = client.get(f"/api/invoices/{inv_id}", headers=admin_headers).json()
    assert Decimal(str(inv_check["amount_due"])) == due_before - partial_amount

    # Pay remaining balance
    remaining = Decimal(str(inv_check["amount_due"]))
    pay_final = client.post("/api/payments", headers=admin_headers, json={
        "invoice_id": inv_id,
        "payment_method": "Stripe",
        "amount": str(remaining),
        "reference_note": "Final settlement"
    })
    assert pay_final.status_code == 201

    # Verify invoice is now PAID!
    inv_paid = client.get(f"/api/invoices/{inv_id}", headers=admin_headers).json()
    assert inv_paid["status"] == "paid"
    assert Decimal(str(inv_paid["amount_due"])) == Decimal("0.00")

    # SECURITY & INTEGRITY CHECK: Reject payment on already paid invoice
    pay_extra = client.post("/api/payments", headers=admin_headers, json={
        "invoice_id": inv_id,
        "payment_method": "Credit Card",
        "amount": "10.00",
        "reference_note": "Extra payment attempt"
    })
    assert pay_extra.status_code == 400, "Should reject payment on already paid invoice"
