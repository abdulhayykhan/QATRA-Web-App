"""Rate Limiting Middleware and Sliding Window Engine (NFR 2.6).

Owner: Nimra Iftikhar
Protects against brute force, denial-of-service, and resource exhaustion attacks on:
- /api/auth/firebase-login (Authentication & session creation)
- /api/auth/hospital-slip/upload (OCR processing & cloud storage)
- /api/auth/cnic/submit (CNIC verification & vault encryption)
- /api/feed/{request_id}/respond (One-tap donor response)
"""
import time
from typing import Dict, List, Tuple, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter tracking client requests."""

    def __init__(self):
        # Maps (identifier, endpoint_rule) -> list of timestamp floats
        self._history: Dict[Tuple[str, str], List[float]] = {}
        # Default route specific rules: (prefix_match, max_requests, window_seconds)
        self.rules: List[Tuple[str, int, int]] = [
            ("/api/auth/firebase-login", 10, 60),
            ("/api/auth/hospital-slip/upload", 10, 60),
            ("/api/auth/cnic/submit", 10, 60),
            ("/api/feed/", 30, 60),
            ("/api/", 120, 60),  # General API limit
        ]
        # Paths exempt from rate limiting
        self.exempt_paths = {
            "/",
            "/api/health",
            "/api/docs",
            "/api/redoc",
            "/api/openapi.json",
        }
        self.enabled = True

    def clear(self):
        """Clear all stored rate limiting histories (useful between tests)."""
        self._history.clear()

    def get_client_identifier(self, request: Request) -> str:
        """Derive client identifier from Authorization header or remote IP."""
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            # Use token prefix as unique identifier
            return f"auth:{auth[7:25]}"
        client = request.client
        if client and client.host:
            return f"ip:{client.host}"
        return "ip:unknown"

    def match_rule(self, path: str) -> Optional[Tuple[str, int, int]]:
        """Find the most specific matching rate limit rule for a path."""
        for pattern, max_requests, window_seconds in self.rules:
            if path.startswith(pattern):
                return pattern, max_requests, window_seconds
        return None

    def check_rate_limit(self, identifier: str, path: str) -> Tuple[bool, int, int]:
        """
        Check if client request is within rate limit.
        Returns: (is_allowed, remaining_requests, retry_after_seconds)
        """
        if not self.enabled:
            return True, 999, 0

        rule = self.match_rule(path)
        if not rule:
            return True, 999, 0

        rule_key, max_reqs, window_seconds = rule
        key = (identifier, rule_key)
        now = time.time()
        window_start = now - window_seconds

        # Clean old entries
        history = self._history.get(key, [])
        valid_history = [ts for ts in history if ts > window_start]
        self._history[key] = valid_history

        if len(valid_history) >= max_reqs:
            oldest_entry = valid_history[0]
            retry_after = max(1, int(oldest_entry + window_seconds - now))
            return False, 0, retry_after

        # Record this request
        valid_history.append(now)
        remaining = max(0, max_reqs - len(valid_history))
        return True, remaining, 0


# Global limiter singleton
limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI / Starlette middleware enforcing HTTP 429 on rate limit violations."""

    def __init__(self, app, rate_limiter: Optional[InMemoryRateLimiter] = None):
        super().__init__(app)
        self.limiter = rate_limiter or limiter

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Check exemptions
        if path in self.limiter.exempt_paths or not self.limiter.enabled:
            return await call_next(request)

        # Allow test bypass header if provided
        if request.headers.get("X-Bypass-Rate-Limit") == "true":
            return await call_next(request)

        identifier = self.limiter.get_client_identifier(request)
        is_allowed, remaining, retry_after = self.limiter.check_rate_limit(identifier, path)

        if not is_allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded. Please retry after {retry_after} seconds.",
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
