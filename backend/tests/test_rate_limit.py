from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.src.api.rate_limit import RateLimitMiddleware, SlidingWindowLimiter


def test_sliding_window_blocks_after_limit():
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60)

    assert limiter.check("ip") == (True, 0)
    assert limiter.check("ip") == (True, 0)
    allowed, retry = limiter.check("ip")
    assert allowed is False
    assert retry > 0
    assert limiter.check("other-ip")[0] is True


def test_research_middleware_limits_per_ip():
    app = FastAPI()
    app.add_middleware(
        RateLimitMiddleware,
        research_per_hour=1,
        chat_per_hour=5,
    )

    @app.get("/api/research/stream")
    def stream():
        return {"ok": True}

    client = TestClient(app)

    first = client.get("/api/research/stream", headers={"x-forwarded-for": "203.0.113.1"})
    second = client.get("/api/research/stream", headers={"x-forwarded-for": "203.0.113.1"})
    other = client.get("/api/research/stream", headers={"x-forwarded-for": "203.0.113.2"})

    assert first.status_code == 200
    assert second.status_code == 429
    assert "retry-after" in second.headers
    assert other.status_code == 200


def test_research_route_rejects_when_daily_budget_is_empty(monkeypatch):
    from backend.src.api import routes

    monkeypatch.setattr(routes, "consume_research_budget", lambda: (False, 120))
    app = FastAPI()
    app.include_router(routes.router)
    response = TestClient(app).post(
        "/api/research/run",
        json={"topic": "Test Topic"},
    )

    assert response.status_code == 429
    assert response.headers["retry-after"] == "120"
