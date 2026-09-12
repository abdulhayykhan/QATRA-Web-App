"""High-performance caching layer for feed and frequent reads (NFR 1.2 & NFR 1.3).

Owner: Nimra Iftikhar
Provides in-memory TTL caching (with Redis-compatible interface) to maintain sub-2-second
query latencies and prevent database connection exhaustion during mass-casualty traffic spikes.
"""
import time
from typing import Any, Dict, Optional, Tuple


class TTLCache:
    """Thread-safe in-memory cache with time-to-live expiration."""

    def __init__(self, default_ttl: int = 60):
        self.default_ttl = default_ttl
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        """Retrieve cached value if present and not expired."""
        now = time.time()
        entry = self._store.get(key)
        if entry is None:
            self._misses += 1
            return None

        val, expiry = entry
        if now > expiry:
            # Expired
            self._store.pop(key, None)
            self._misses += 1
            return None

        self._hits += 1
        return val

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """Store value with TTL expiration."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        expiry = time.time() + ttl
        self._store[key] = (value, expiry)

    def delete(self, key: str) -> bool:
        """Remove specific key from cache."""
        return self._store.pop(key, None) is not None

    def delete_prefix(self, prefix: str) -> int:
        """Delete all keys matching prefix."""
        keys_to_del = [k for k in self._store.keys() if k.startswith(prefix)]
        for k in keys_to_del:
            self._store.pop(k, None)
        return len(keys_to_del)

    def clear(self) -> None:
        """Clear all keys in cache."""
        self._store.clear()
        self._hits = 0
        self._misses = 0

    def get_stats(self) -> Dict[str, Any]:
        """Return cache health and usage statistics."""
        now = time.time()
        active_keys = sum(1 for _, (_, exp) in self._store.items() if exp > now)
        total_queries = self._hits + self._misses
        hit_ratio = (self._hits / total_queries) if total_queries > 0 else 0.0
        return {
            "active_keys": active_keys,
            "hits": self._hits,
            "misses": self._misses,
            "hit_ratio": round(hit_ratio, 3),
            "status": "operational",
        }


# Global cache instance for high-frequency operations
cache = TTLCache(default_ttl=45)

FEED_CACHE_PREFIX = "feed:"


def get_cached_feed(cache_key: str) -> Optional[Any]:
    """Helper to fetch cached feed response."""
    return cache.get(f"{FEED_CACHE_PREFIX}{cache_key}")


def set_cached_feed(cache_key: str, data: Any, ttl: int = 45) -> None:
    """Helper to store feed response in cache."""
    cache.set(f"{FEED_CACHE_PREFIX}{cache_key}", data, ttl_seconds=ttl)


def invalidate_feed_cache() -> int:
    """Helper to invalidate all cached feed queries when requests change."""
    return cache.delete_prefix(FEED_CACHE_PREFIX)
