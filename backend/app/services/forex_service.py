import os
import json
import time
from pathlib import Path
from decimal import Decimal
from typing import Dict, Any, Optional
import httpx

CACHE_FILE = Path(__file__).resolve().parent.parent / "forex_cache.json"

# Fallback baseline exchange rates (Base: USD)
FALLBACK_RATES: Dict[str, float] = {
    "USD": 1.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "CAD": 1.38,
    "AUD": 1.53,
    "INR": 83.45,
    "JPY": 154.20,
    "CHF": 0.89,
}

CURRENCY_SYMBOLS: Dict[str, str] = {
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "CAD": "CA$",
    "AUD": "A$",
    "INR": "₹",
    "JPY": "¥",
    "CHF": "CHF",
}

class ForexService:
    """
    Dynamic Real-Time Exchange Rate Provider with Multi-Tier Caching.
    Tier 1: In-Memory TTL Cache (Fastest)
    Tier 2: Persistent Local Disk Cache (Survives Restarts & Offline Periods)
    Tier 3: Built-in Offline Fallback Matrices (Guarantees Zero Downtime)
    """
    _cached_rates: Dict[str, float] = FALLBACK_RATES.copy()
    _last_fetched: float = 0.0
    _cache_ttl_seconds: float = 3600.0  # 1 hour cache
    _source_name: str = "Fallback Baseline Rates"
    _is_offline_fallback: bool = False

    @classmethod
    def _load_disk_cache(cls):
        """Loads cached exchange rates from disk if present."""
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    cls._cached_rates = data.get("rates", FALLBACK_RATES.copy())
                    cls._last_fetched = data.get("timestamp", time.time())
                    cls._source_name = "Persistent Disk Cache (Offline Resilient)"
            except Exception:
                pass

    @classmethod
    def _save_disk_cache(cls):
        """Persists successful live rates to disk."""
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "rates": cls._cached_rates,
                    "timestamp": cls._last_fetched,
                    "source": cls._source_name
                }, f, indent=2)
        except Exception:
            pass

    @classmethod
    async def fetch_live_rates(cls) -> Dict[str, Any]:
        current_time = time.time()
        
        # Load from disk if first run
        if cls._last_fetched == 0:
            cls._load_disk_cache()

        # Return cached rates if within TTL
        if current_time - cls._last_fetched < cls._cache_ttl_seconds and cls._last_fetched > 0 and not cls._is_offline_fallback:
            return {
                "base": "USD",
                "rates": cls._cached_rates,
                "cached": True,
                "offline": False,
                "source": cls._source_name,
                "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(cls._last_fetched))
            }

        # Attempt to fetch dynamic live rates from Open Exchange Rates public endpoint
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                res = await client.get("https://open.er-api.com/v6/latest/USD")
                if res.status_code == 200:
                    data = res.json()
                    rates = data.get("rates", {})
                    updated = {}
                    for curr in FALLBACK_RATES.keys():
                        if curr in rates:
                            updated[curr] = float(rates[curr])
                        else:
                            updated[curr] = FALLBACK_RATES[curr]
                    cls._cached_rates = updated
                    cls._last_fetched = current_time
                    cls._source_name = "Live Open Exchange Rates API"
                    cls._is_offline_fallback = False
                    cls._save_disk_cache()
                    
                    return {
                        "base": "USD",
                        "rates": cls._cached_rates,
                        "cached": False,
                        "offline": False,
                        "source": cls._source_name,
                        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(cls._last_fetched))
                    }
        except Exception:
            # Network connectivity is down: seamlessly fall back to disk/in-memory cache!
            cls._is_offline_fallback = True
            if cls._last_fetched == 0:
                cls._last_fetched = current_time

        return {
            "base": "USD",
            "rates": cls._cached_rates,
            "cached": True,
            "offline": True,
            "source": f"{cls._source_name} (Offline Fallback)",
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(cls._last_fetched))
        }

    @classmethod
    def get_rates_sync(cls) -> Dict[str, float]:
        if cls._last_fetched == 0:
            cls._load_disk_cache()
        return cls._cached_rates

    @classmethod
    def convert(
        cls,
        amount: Decimal,
        from_currency: str = "USD",
        to_currency: str = "USD"
    ) -> Dict[str, Any]:
        from_curr = from_currency.upper()
        to_curr = to_currency.upper()
        rates = cls.get_rates_sync()

        from_rate = rates.get(from_curr, 1.0)
        to_rate = rates.get(to_curr, 1.0)

        # Convert to USD then to target
        amount_in_usd = Decimal(str(amount)) / Decimal(str(from_rate))
        converted = (amount_in_usd * Decimal(str(to_rate))).quantize(Decimal("0.01"))

        return {
            "original_amount": float(amount),
            "original_currency": from_curr,
            "converted_amount": float(converted),
            "target_currency": to_curr,
            "symbol": CURRENCY_SYMBOLS.get(to_curr, to_curr),
            "exchange_rate": float(Decimal(str(to_rate / from_rate)).quantize(Decimal("0.0001"))),
            "source": cls._source_name,
            "offline_cached": cls._is_offline_fallback
        }


        # Convert to USD then to target
        amount_in_usd = Decimal(str(amount)) / Decimal(str(from_rate))
        converted = (amount_in_usd * Decimal(str(to_rate))).quantize(Decimal("0.01"))

        return {
            "original_amount": float(amount),
            "original_currency": from_curr,
            "converted_amount": float(converted),
            "target_currency": to_curr,
            "symbol": CURRENCY_SYMBOLS.get(to_curr, to_curr),
            "exchange_rate": float(Decimal(str(to_rate / from_rate)).quantize(Decimal("0.0001"))),
            "source": cls._source_name
        }
