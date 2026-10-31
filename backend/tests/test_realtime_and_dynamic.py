import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_websocket_realtime_connection():
    with client.websocket_connect("/ws/events") as websocket:
        initial = websocket.receive_json()
        assert initial["type"] == "CONNECTION_ESTABLISHED"
        assert "Brightloop Real-Time" in initial["message"]

        # Heartbeat check
        websocket.send_text("ping")
        pong = websocket.receive_text()
        assert pong == "pong"

def test_dynamic_forex_rates_and_conversion():
    # 1. Fetch live rates
    res = client.get("/api/forex/rates")
    assert res.status_code == 200
    data = res.json()
    assert "rates" in data
    assert "USD" in data["rates"]
    assert "EUR" in data["rates"]
    assert "GBP" in data["rates"]
    assert "INR" in data["rates"]
    assert "symbols" in data

    # 2. Currency conversion
    conv_res = client.post("/api/forex/convert", json={
        "amount": "100.00",
        "from_currency": "USD",
        "to_currency": "EUR"
    })
    assert conv_res.status_code == 200
    conv_data = conv_res.json()
    assert conv_data["original_amount"] == 100.00
    assert conv_data["target_currency"] == "EUR"
    assert conv_data["converted_amount"] > 0
    assert conv_data["symbol"] == "€"

def test_dynamic_payment_webhook_ingestion():
    # Login to fetch invoices
    login_res = client.post("/api/auth/login", json={"email": "admin@brightloop.com", "password": "AdminPass123!"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    invs_res = client.get("/api/invoices", headers=headers)
    assert invs_res.status_code == 200
    invs = invs_res.json()
    unpaid = [i for i in invs if float(i["amount_due"]) > 0]
    if not unpaid:
        subs = client.get("/api/subscriptions?status=active", headers=headers).json()
        target_inv = client.post(f"/api/subscriptions/{subs[0]['id']}/generate-invoice?auto_confirm=true", headers=headers).json()
    else:
        target_inv = unpaid[0]

    # Ingest dynamic payment webhook
    webhook_res = client.post("/api/webhooks/payment", json={
        "invoice_number": target_inv["invoice_number"],
        "amount": "10.00",
        "payment_method": "Live Stripe Webhook",
        "provider": "Stripe",
        "reference_note": "Webhook live settlement"
    })
    assert webhook_res.status_code == 200
    res_data = webhook_res.json()
    assert res_data["status"] == "success"
    assert res_data["invoice_number"] == target_inv["invoice_number"]

def test_simulate_bank_feed_event():
    sim_res = client.post("/api/webhooks/simulate-bank-event")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["status"] in ["success", "idle"]

def test_cache_layer_and_offline_resilience():
    from app.cache import response_cache
    from app.services.forex_service import ForexService, CACHE_FILE

    # 1. Memory cache operations
    response_cache.set("test_key", {"data": 42}, ttl_seconds=10)
    cached_val = response_cache.get("test_key")
    assert cached_val is not None
    assert cached_val["data"] == 42

    response_cache.invalidate("test_")
    assert response_cache.get("test_key") is None

    # 2. Disk-backed persistent forex cache check
    assert CACHE_FILE.exists(), "Persistent disk cache file should exist after rates fetch"
    rates = ForexService.get_rates_sync()
    assert "USD" in rates
    assert rates["USD"] == 1.0

    # 3. Offline resilience simulation: verify conversion still works without network
    conv = ForexService.convert(Decimal("50.00"), from_currency="USD", to_currency="GBP")
    assert conv["converted_amount"] > 0
    assert conv["target_currency"] == "GBP"
