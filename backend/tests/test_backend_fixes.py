import socket

from backend.src.agents.writer import FALLBACK_NOTICE, _build_fallback_report
from backend.src.models.schemas import CompetitorFocus, ResearchPlan
from backend.src.tools.scraper import _is_public_url
from backend.src.tools.vector_store import chunk_text


def _plan(*names: str) -> ResearchPlan:
    return ResearchPlan(
        market_domain="Test Market",
        competitors=[
            CompetitorFocus(name=name, category="Test", core_value_prop="Value")
            for name in names
        ],
        subtasks=[],
        key_hypotheses=[]
    )


def test_fallback_report_marks_unverified_without_inventing_facts():
    report = _build_fallback_report(
        topic="Test Market",
        plan=_plan("Alpha", "Beta"),
        evidence=[],
        citations=[],
        language="en",
        confidence_score=45.0,
        audit_status="partial_evidence"
    )

    notice = FALLBACK_NOTICE["en"]
    assert report.confidence_score == 45.0
    assert all(p.pricing_summary == notice for p in report.competitor_profiles)
    assert all(p.user_sentiment == notice for p in report.competitor_profiles)
    assert all(s.strengths == [notice] for s in report.swot_analyses)
    assert report.strategic_recommendations == []
    assert "Tersedia (Lanjutan)" not in report.feature_matrix_markdown

    header = report.feature_matrix_markdown.splitlines()[0]
    assert header.count("|") == 4  # Item + Alpha + Beta


def test_scraper_blocks_non_public_urls(monkeypatch):
    assert _is_public_url("file:///etc/passwd") is False
    assert _is_public_url("") is False

    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda host, port: [(2, 1, 6, "", ("169.254.169.254", 0))]
    )
    assert _is_public_url("http://metadata.example") is False

    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda host, port: [(2, 1, 6, "", ("93.184.216.34", 0))]
    )
    assert _is_public_url("http://example.com") is True


def test_chunk_text_terminates_when_overlap_exceeds_size():
    chunks = chunk_text("abcdefghij", chunk_size=4, chunk_overlap=10)

    assert len(chunks) == 10
    assert all(len(chunk) <= 4 for chunk in chunks)


def test_writer_reconciled_verification_sync():
    """Ensure writer returns a reconciled VerificationVerdict matching report confidence."""
    from backend.src.agents.writer import executive_writer_node
    from backend.src.models.schemas import VerificationVerdict

    state = {
        "topic": "Test SaaS",
        "language": "id",
        "plan": _plan("SaaS Alpha", "SaaS Beta"),
        "collected_evidence": [],
        "citations": [],
        "verification": VerificationVerdict(
            is_valid=False,
            confidence_score=65.0,
            critique="Auditing",
            missing_aspects=[],
            retry_search_queries=[]
        ),
        "iteration_count": 2,
        "max_iterations": 2,
        "final_report": None,
        "status_updates": [],
        "error": None
    }

    result = executive_writer_node(state)
    assert "verification" in result
    assert result["verification"].confidence_score == 65.0
    assert result["final_report"].confidence_score == 65.0
    assert result["final_report"].audit_status == "partial_evidence"
    assert result["verification"].is_valid is False
    assert "65.0%" in result["status_updates"][0]["message"]
    assert "BELUM TERVERIFIKASI PENUH" in result["status_updates"][0]["message"]

