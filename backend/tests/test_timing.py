import asyncio
import json

from backend.src.api import routes


def test_event_generator_attaches_stage_and_total_timing(monkeypatch):
    async def fake_stream(**kwargs):
        yield {
            "node": "planner",
            "update": {
                "status_updates": [
                    {
                        "node": "planner",
                        "status": "completed",
                        "message": "planned",
                        "timestamp": "2026-10-28T00:00:00+00:00"
                    }
                ]
            },
            "duration_ms": 1234,
            "elapsed_ms": 1234
        }

    monkeypatch.setattr(routes, "stream_research_workflow", fake_stream)

    async def collect():
        return [event async for event in routes.event_generator("Test", 1, "en")]

    events = asyncio.run(collect())
    status = json.loads(next(e["data"] for e in events if e["event"] == "status"))
    complete = json.loads(next(e["data"] for e in events if e["event"] == "complete"))

    assert status["duration_ms"] == 1234
    assert status["elapsed_ms"] == 1234
    assert complete["elapsed_ms"] >= 0
