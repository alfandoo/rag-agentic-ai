import pytest
from fastapi.testclient import TestClient
from backend.src.api.main import app
from backend.src.config.settings import settings

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "docs" in data
    assert "streaming_endpoint" in data


def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert "x-request-id" in response.headers
    assert "x-process-time-ms" in response.headers
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "market-intelligence-agent"
    assert "providers" in data
    assert data["providers"]["vector_store"] == "chromadb"


def test_observability_telemetry_endpoint():
    response = client.get("/api/observability/telemetry")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "infrastructure" in data
    assert "agent_slis" in data
    assert "providers" in data
    assert "planner" in data["agent_slis"]
    assert "researcher" in data["agent_slis"]
    assert "fact_checker" in data["agent_slis"]
    assert "writer" in data["agent_slis"]
    assert "guardrails" in data["agent_slis"]


def test_stop_endpoint():
    response = client.post("/api/research/stop", json={"topic": "TestTopic"})
    assert response.status_code == 200
    assert response.json()["status"] == "stopped"


def test_follow_up_chat_guardrail_rejection():
    payload = {
        "topic": "Supabase vs Neon",
        "report_context": "Supabase is an open source Firebase alternative. Neon is serverless Postgres.",
        "messages": [
            {"role": "user", "content": "Bagaimana resep membuat nasi goreng spesial?"}
        ],
        "language": "id"
    }
    response = client.post("/api/research/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "di luar cakupan" in data["reply"] or "Supabase vs Neon" in data["reply"]


def test_openai_compatible_models_endpoint():
    response = client.get("/v1/models")
    assert response.status_code == 200
    data = response.json()
    assert data["object"] == "list"
    assert data["data"][0]["id"] == settings.gemini_model
    assert data["data"][0]["object"] == "model"


def test_follow_up_chat_sync():
    payload = {
        "topic": "AI Code Editors",
        "report_context": "Cursor Pro is $20/month. GitHub Copilot is $10/month.",
        "messages": [
            {"role": "user", "content": "How much does Cursor cost compared to Copilot?"}
        ],
        "language": "en"
    }
    response = client.post("/api/research/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 0
