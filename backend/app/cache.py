import time
import hashlib
import json
from typing import Any, Optional, Dict, Tuple

class MemoryCache:
    """
    High-Speed In-Memory Cache with Stale-While-Revalidate Support.
    Provides sub-millisecond read responses and offline resilience when
    database or network connectivity is interrupted.
    """
    def __init__(self):
        # key -> (expiry_timestamp, data, stale_allowed_until)
        self._store: Dict[str, Tuple[float, Any, float]] = {}

    def get(self, key: str, allow_stale: bool = True) -> Optional[Any]:
        if key not in self._store:
            return None
        expiry, data, stale_until = self._store[key]
        now = time.time()
        
        if now <= expiry:
            return data
        
        # Stale fallback in offline/high-load conditions
        if allow_stale and now <= stale_until:
            return data
        
        return None

    def set(self, key: str, data: Any, ttl_seconds: int = 60, stale_ttl_seconds: int = 86400):
        now = time.time()
        self._store[key] = (now + ttl_seconds, data, now + stale_ttl_seconds)

    def invalidate(self, prefix: str):
        keys_to_del = [k for k in self._store.keys() if k.startswith(prefix)]
        for k in keys_to_del:
            self._store.pop(k, None)

    def clear(self):
        self._store.clear()

response_cache = MemoryCache()

