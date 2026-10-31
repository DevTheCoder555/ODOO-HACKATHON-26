import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_password_policy_enforcement():
    # Less than or equal to 8 chars
    res = client.post("/api/auth/register", json={
        "email": f"bad1_{uuid.uuid4().hex[:6]}@test.com",
        "full_name": "Bad Pass",
        "password": "Pass1!" # 6 chars
    })
    assert res.status_code == 422

    # Missing uppercase
    res = client.post("/api/auth/register", json={
        "email": f"bad2_{uuid.uuid4().hex[:6]}@test.com",
        "full_name": "Bad Pass",
        "password": "password123!"
    })
    assert res.status_code == 422

    # Missing lowercase
    res = client.post("/api/auth/register", json={
        "email": f"bad3_{uuid.uuid4().hex[:6]}@test.com",
        "full_name": "Bad Pass",
        "password": "PASSWORD123!"
    })
    assert res.status_code == 422

    # Missing special character
    res = client.post("/api/auth/register", json={
        "email": f"bad4_{uuid.uuid4().hex[:6]}@test.com",
        "full_name": "Bad Pass",
        "password": "Password123"
    })
    assert res.status_code == 422

def test_valid_registration_and_login():
    unique_email = f"newcust_{uuid.uuid4().hex[:6]}@company.com"
    res = client.post("/api/auth/register", json={
        "email": unique_email,
        "full_name": "New Customer",
        "company_name": "Tech Co",
        "password": "ValidPassword123!"
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "customer"

    # Login
    login_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "ValidPassword123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_admin_staff_creation():
    # Login as admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@brightloop.com",
        "password": "AdminPass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Admin creates staff
    unique_staff_email = f"staff_{uuid.uuid4().hex[:6]}@brightloop.com"
    res = client.post("/api/users/staff", headers=headers, json={
        "email": unique_staff_email,
        "full_name": "New Staff Member",
        "password": "StaffPassword123!"
    })
    assert res.status_code == 201
    assert res.json()["role"] == "staff"

    # Non-admin cannot create staff
    cust_login = client.post("/api/auth/login", json={
        "email": "john@enterprise-corp.com",
        "password": "CustomerPass123!"
    })
    cust_token = cust_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    res_forbidden = client.post("/api/users/staff", headers=cust_headers, json={
        "email": f"illegal_{uuid.uuid4().hex[:6]}@brightloop.com",
        "full_name": "Illegal Staff",
        "password": "StaffPassword123!"
    })
    assert res_forbidden.status_code == 403

def test_password_reset_flow():
    req_res = client.post("/api/auth/forgot-password", json={"email": "alex@techstartup.io"})
    assert req_res.status_code == 200
    data = req_res.json()
    token = data.get("dev_reset_token") or data.get("reset_token")
    assert token is not None

    confirm_res = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "NewStrongPass2026!"
    })
    assert confirm_res.status_code == 200

    login_new = client.post("/api/auth/login", json={
        "email": "alex@techstartup.io",
        "password": "NewStrongPass2026!"
    })
    assert login_new.status_code == 200

def test_production_environment_token_concealment():
    from app.config import settings
    original_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        req_res = client.post("/api/auth/forgot-password", json={"email": "sarah@localbakery.com"})
        assert req_res.status_code == 200
        data = req_res.json()
        assert "dev_reset_token" not in data
        assert "reset_token" not in data
        assert "reset_link_simulated" not in data
        assert "message" in data
    finally:
        settings.ENVIRONMENT = original_env
