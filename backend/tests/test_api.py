import pytest
from fastapi.testclient import TestClient
from backend.src.api.main import app

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
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "market-intelligence-agent"


def test_stream_endpoint_initialization():
    response = client.get("/api/research/stream?topic=TestTopic&max_iterations=1&language=en")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]


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
