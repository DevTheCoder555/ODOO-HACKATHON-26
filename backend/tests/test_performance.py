import time
from datetime import date, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import SessionLocal
from app.models import Subscription, SubscriptionLine, SubscriptionStatus, User, Plan

client = TestClient(app)

@pytest.fixture
def admin_headers():
    login_res = client.post("/api/auth/login", json={
        "email": "admin@brightloop.com",
        "password": "AdminPass123!"
    })
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_sub_two_second_analytics_benchmark(admin_headers):
    """
    Page 4 requirement:
    'With thousands of subscriptions on the books, every page should still respond in under two seconds.'
    """
    db: Session = SessionLocal()
    existing_count = db.query(Subscription).count()

    # Bulk insert up to 1,000 subscriptions if not already present
    if existing_count < 1000:
        customer = db.query(User).filter(User.role == "customer").first()
        plan = db.query(Plan).first()

        batch = []
        for i in range(existing_count, 1005):
            sub = Subscription(
                subscription_number=f"PERF-SUB-{i:06d}",
                customer_id=customer.id,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE if i % 2 == 0 else SubscriptionStatus.CONFIRMED,
                start_date=date.today() - timedelta(days=i % 365),
                next_billing_date=date.today() + timedelta(days=i % 30),
                payment_terms="Net 30"
            )
            batch.append(sub)

        db.bulk_save_objects(batch)
        db.commit()

    db.close()

    # Benchmark: Finance Summary Query
    t0 = time.perf_counter()
    res = client.get("/api/analytics/summary", headers=admin_headers)
    t1 = time.perf_counter()
    summary_duration = t1 - t0

    assert res.status_code == 200
    data = res.json()
    assert data["total_subscriptions"] >= 1000
    print(f"\n[BENCHMARK] Finance Analytics Summary took: {summary_duration:.4f}s (Target: < 2.0s)")
    assert summary_duration < 2.0, f"Query took {summary_duration:.4f}s, expected < 2.0s"

    # Benchmark: Invoices List
    t2 = time.perf_counter()
    res_inv = client.get("/api/invoices", headers=admin_headers)
    t3 = time.perf_counter()
    inv_duration = t3 - t2

    assert res_inv.status_code == 200
    print(f"[BENCHMARK] Invoices listing took: {inv_duration:.4f}s (Target: < 2.0s)")
    assert inv_duration < 2.0, f"Invoices query took {inv_duration:.4f}s, expected < 2.0s"

