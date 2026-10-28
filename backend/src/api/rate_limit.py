import threading
import time
from collections import deque
from typing import Deque, Dict, Tuple

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from backend.src.config.settings import settings

RESEARCH_PATHS = {"/api/research/stream", "/api/research/run"}
CHAT_PATHS = {"/api/research/chat/stream", "/api/research/chat"}


class SlidingWindowLimiter:
    """In-memory limiter for a single process. Resets on restart; replace with Redis for multiple workers."""

    def __init__(self, limit: int, window_seconds: float):
        self.limit = limit
        self.window = window_seconds
        self._events: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> Tuple[bool, int]:
        if self.limit <= 0:
            return True, 0
        now = time.monotonic()
        with self._lock:
            events = self._events.setdefault(key, deque())
            cutoff = now - self.window
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= self.limit:
                retry = max(1, int(self.window - (now - events[0])))
                return False, retry
            events.append(now)
            return True, 0


def _client_key(request: Request) -> str:
    # Backend is bound to localhost behind a reverse proxy; trust the first hop header there.
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        research_per_hour: int = 2,
        chat_per_hour: int = 20,
    ):
        super().__init__(app)
        self.research_ip = SlidingWindowLimiter(research_per_hour, 3600)
        self.chat_ip = SlidingWindowLimiter(chat_per_hour, 3600)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/") or "/"
        if request.method != "OPTIONS" and path in RESEARCH_PATHS | CHAT_PATHS:
            ip = _client_key(request)
            if path in RESEARCH_PATHS:
                allowed, retry = self.research_ip.check(f"ip:{ip}")
            else:
                allowed, retry = self.chat_ip.check(f"ip:{ip}")

            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit reached. Please try again later."},
                    headers={"Retry-After": str(retry)},
                )

        return await call_next(request)


_research_daily = SlidingWindowLimiter(max(0, settings.research_rate_limit_per_day), 86400)


def consume_research_budget() -> Tuple[bool, int]:
    """Consumes one daily research slot. Called only after query/body validation succeeds."""
    if not settings.rate_limit_enabled:
        return True, 0
    return _research_daily.check("global")
