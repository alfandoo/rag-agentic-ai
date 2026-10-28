"""
Safe, aggregated LLMOps metrics pulled from the self-hosted Langfuse server (Metrics API v2).

Only aggregate numbers are returned (counts, token sums, cost sums, latency percentiles,
model names, agent node names, daily buckets). No prompts, inputs, outputs, trace IDs,
user/session IDs, project IDs, organization names, or API keys ever leave this module.
"""
import asyncio
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from backend.src.config.settings import settings

logger = logging.getLogger(__name__)

AGENT_NODES = ["planner", "researcher", "fact_checker", "writer"]
_CACHE_TTL_SEC = 60  # self-hosted has no read quota, so keep the panel close to live
_cache: Dict[int, Dict[str, Any]] = {}


def is_langfuse_configured() -> bool:
    return bool(settings.langfuse_public_key and settings.langfuse_secret_key)


def _get_client():
    from langfuse import Langfuse
    return Langfuse(
        public_key=settings.langfuse_public_key,
        secret_key=settings.langfuse_secret_key,
        base_url=settings.langfuse_host,
        timeout=60,
    )


def _num(value: Any, default: float = 0.0) -> float:
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _run_query(client, query: Dict[str, Any]) -> List[Dict[str, Any]]:
    query.setdefault("filters", [])
    query.setdefault("dimensions", [])
    res = client.api.metrics.metrics(query=json.dumps(query))
    return list(res.data or [])


def _collect(days: int) -> Dict[str, Any]:
    client = _get_client()
    now = datetime.now(timezone.utc)
    frm = now - timedelta(days=days)
    window = {
        "fromTimestamp": frm.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "toTimestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    gen_filter = [{"column": "type", "operator": "=", "value": "GENERATION", "type": "string"}]
    # v2 rejects traceId as a grouping dimension, so a trace is counted as its semantic root observation
    root_filter = [{"column": "isRootObservation", "operator": "=", "value": True, "type": "boolean"}]

    def q(**kwargs) -> List[Dict[str, Any]]:
        return _run_query(client, {"view": "observations", **window, **kwargs})

    totals = q(metrics=[
        {"measure": "count", "aggregation": "count"},
        {"measure": "totalTokens", "aggregation": "sum"},
        {"measure": "totalCost", "aggregation": "sum"},
    ])
    roots = q(metrics=[{"measure": "count", "aggregation": "count"}], filters=root_filter)
    gen_totals = q(metrics=[
        {"measure": "count", "aggregation": "count"},
        {"measure": "inputTokens", "aggregation": "sum"},
        {"measure": "outputTokens", "aggregation": "sum"},
        {"measure": "latency", "aggregation": "avg"},
        {"measure": "latency", "aggregation": "p50"},
        {"measure": "latency", "aggregation": "p95"},
    ], filters=gen_filter)
    by_model = q(metrics=[
        {"measure": "count", "aggregation": "count"},
        {"measure": "inputTokens", "aggregation": "sum"},
        {"measure": "outputTokens", "aggregation": "sum"},
        {"measure": "totalCost", "aggregation": "sum"},
        {"measure": "latency", "aggregation": "p95"},
    ], dimensions=[{"field": "providedModelName"}], filters=gen_filter)
    by_agent = q(metrics=[
        {"measure": "count", "aggregation": "count"},
        {"measure": "latency", "aggregation": "avg"},
        {"measure": "latency", "aggregation": "p95"},
    ], dimensions=[{"field": "name"}], filters=[
        {"column": "name", "operator": "any of", "value": AGENT_NODES, "type": "stringOptions"}
    ])
    by_type = q(metrics=[{"measure": "count", "aggregation": "count"}], dimensions=[{"field": "type"}])
    by_level = q(metrics=[{"measure": "count", "aggregation": "count"}], dimensions=[{"field": "level"}])
    latency_percentiles_raw = q(
        metrics=[
            {"measure": "count", "aggregation": "count"},
            {"measure": "latency", "aggregation": "p50"},
            {"measure": "latency", "aggregation": "p90"},
            {"measure": "latency", "aggregation": "p95"},
            {"measure": "latency", "aggregation": "p99"},
        ],
        dimensions=[{"field": "name"}],
        orderBy=[{"field": "p95_latency", "direction": "desc"}],
        config={"row_limit": 10}
    )
    granularity = "hour" if days <= 1 else "day"
    timeline_raw = q(
        metrics=[
            {"measure": "count", "aggregation": "count"},
            {"measure": "totalTokens", "aggregation": "sum"},
            {"measure": "totalCost", "aggregation": "sum"},
        ],
        timeDimension={"granularity": granularity},
        orderBy=[{"field": "time_dimension", "direction": "asc"}]
    )

    # Pad timeline continuous buckets so graphs have continuous, tidy bars (24h -> 24 bars, 7d -> 7 bars, 30d -> 30 bars)
    timeline_buckets = []
    if days <= 1:
        raw_by_hour = {str(r.get("time_dimension", ""))[:13]: r for r in timeline_raw}
        start_hour = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)
        for i in range(24):
            slot_dt = start_hour + timedelta(hours=i)
            key = slot_dt.strftime("%Y-%m-%dT%H")
            matched = raw_by_hour.get(key, {})
            timeline_buckets.append({
                "date": slot_dt.strftime("%Y-%m-%dT%H:00:00Z"),
                "label": slot_dt.strftime("%H:00"),
                "observations": int(_num(matched.get("count_count"))),
                "tokens": int(_num(matched.get("sum_totalTokens"))),
                "cost_usd": round(_num(matched.get("sum_totalCost")), 6),
            })
    else:
        raw_by_day = {str(r.get("time_dimension", ""))[:10]: r for r in timeline_raw}
        start_day = (now - timedelta(days=days - 1)).date()
        for i in range(days):
            slot_d = start_day + timedelta(days=i)
            key = slot_d.strftime("%Y-%m-%d")
            matched = raw_by_day.get(key, {})
            timeline_buckets.append({
                "date": key,
                "label": slot_d.strftime("%d %b") if days <= 7 else slot_d.strftime("%d"),
                "observations": int(_num(matched.get("count_count"))),
                "tokens": int(_num(matched.get("sum_totalTokens"))),
                "cost_usd": round(_num(matched.get("sum_totalCost")), 6),
            })

    t = totals[0] if totals else {}
    g = gen_totals[0] if gen_totals else {}
    root = roots[0] if roots else {}
    level_counts = {str(r.get("level", "DEFAULT")).upper(): int(_num(r.get("count_count"))) for r in by_level}
    total_obs = int(_num(t.get("count_count")))
    error_obs = level_counts.get("ERROR", 0)

    agent_map = {r.get("name"): r for r in by_agent}

    return {
        "connected": True,
        "window_days": days,
        "generated_at": now.isoformat(),
        "summary": {
            "total_traces": int(_num(root.get("count_count"))),
            "total_observations": total_obs,
            "llm_generations": int(_num(g.get("count_count"))),
            "input_tokens": int(_num(g.get("sum_inputTokens"))),
            "output_tokens": int(_num(g.get("sum_outputTokens"))),
            "total_tokens": int(_num(t.get("sum_totalTokens"))),
            "total_cost_usd": round(_num(t.get("sum_totalCost")), 6),
            "llm_latency_avg_ms": round(_num(g.get("avg_latency"))),
            "llm_latency_p50_ms": round(_num(g.get("p50_latency"))),
            "llm_latency_p95_ms": round(_num(g.get("p95_latency"))),
            "error_count": error_obs,
            "warning_count": level_counts.get("WARNING", 0),
            "error_rate_pct": round(error_obs / total_obs * 100, 2) if total_obs else 0.0,
        },
        "models": sorted([
            {
                "model": r.get("providedModelName") or "unknown",
                "calls": int(_num(r.get("count_count"))),
                "input_tokens": int(_num(r.get("sum_inputTokens"))),
                "output_tokens": int(_num(r.get("sum_outputTokens"))),
                "cost_usd": round(_num(r.get("sum_totalCost")), 6),
                "latency_p95_ms": round(_num(r.get("p95_latency"))),
            }
            for r in by_model
        ], key=lambda m: m["calls"], reverse=True),
        "agents": [
            {
                "node": node,
                "runs": int(_num(agent_map.get(node, {}).get("count_count"))),
                "latency_avg_ms": round(_num(agent_map.get(node, {}).get("avg_latency"))),
                "latency_p95_ms": round(_num(agent_map.get(node, {}).get("p95_latency"))),
            }
            for node in AGENT_NODES
        ],
        "observation_types": sorted([
            {"type": str(r.get("type") or "UNKNOWN"), "count": int(_num(r.get("count_count")))}
            for r in by_type
        ], key=lambda x: x["count"], reverse=True),
        "latency_percentiles": [
            {
                "name": r.get("name") or "Unnamed",
                "count": int(_num(r.get("count_count"))),
                "p50_ms": round(_num(r.get("p50_latency"))),
                "p90_ms": round(_num(r.get("p90_latency"))),
                "p95_ms": round(_num(r.get("p95_latency"))),
                "p99_ms": round(_num(r.get("p99_latency"))),
            }
            for r in latency_percentiles_raw
            if r.get("name")
        ],
        "time_granularity": granularity,
        "daily": timeline_buckets,
    }


async def get_langfuse_metrics(days: int = 7, force_refresh: bool = False) -> Dict[str, Any]:
    """Returns aggregated Langfuse metrics from the self-hosted server, cached in memory for a short TTL."""
    if not is_langfuse_configured():
        return {"connected": False, "window_days": days, "message": "Langfuse is not configured."}

    cached = _cache.get(days)
    if cached and not force_refresh and time.time() - cached["ts"] < _CACHE_TTL_SEC:
        return cached["data"]

    try:
        data = await asyncio.to_thread(_collect, days)
    except Exception as exc:
        logger.warning(f"[Langfuse Metrics] Query to {settings.langfuse_host} failed: {exc}")
        return {"connected": False, "window_days": days, "message": "Langfuse is unreachable."}

    _cache[days] = {"ts": time.time(), "data": data}
    return data
