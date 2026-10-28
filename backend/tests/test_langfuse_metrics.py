import asyncio
import json
from types import SimpleNamespace

from backend.src.tools import langfuse_metrics


class FakeMetricsApi:
    def __init__(self):
        self.queries = []

    def metrics(self, *, query):
        q = json.loads(query)
        self.queries.append(q)
        is_root = any(f["column"] == "isRootObservation" for f in q["filters"])
        return SimpleNamespace(data=[{"count_count": 3 if is_root else 0}])


def test_collect_counts_traces_as_root_observations(monkeypatch):
    api = FakeMetricsApi()
    monkeypatch.setattr(langfuse_metrics, "_get_client", lambda: SimpleNamespace(api=SimpleNamespace(metrics=api)))

    data = langfuse_metrics._collect(days=7)

    assert data["summary"]["total_traces"] == 3
    assert len(data["daily"]) == 7
    assert data["time_granularity"] == "day"
    assert all(d["field"] != "traceId" for q in api.queries for d in q["dimensions"])

    data_24h = langfuse_metrics._collect(days=1)
    assert len(data_24h["daily"]) == 24
    assert data_24h["time_granularity"] == "hour"


def test_unreachable_langfuse_reports_disconnected(monkeypatch):
    def unreachable():
        raise ConnectionError("connection refused")

    monkeypatch.setattr(langfuse_metrics.settings, "langfuse_public_key", "pk-test")
    monkeypatch.setattr(langfuse_metrics.settings, "langfuse_secret_key", "sk-test")
    monkeypatch.setattr(langfuse_metrics, "_get_client", unreachable)

    data = asyncio.run(langfuse_metrics.get_langfuse_metrics(days=7, force_refresh=True))

    assert data["connected"] is False
