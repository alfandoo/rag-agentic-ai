import pytest
from backend.src.models.state import MarketResearchState
from backend.src.models.schemas import VerificationVerdict
from backend.src.graph.workflow import route_fact_checker, create_market_research_graph, detect_language


def test_language_detection():
    # Explicit Indonesian request
    assert detect_language("Cursor vs Windsurf", "id") == "id"
    
    # Implicit Indonesian prompt with English requested
    assert detect_language("Bandingkan Cursor dan Windsurf dari sisi harga", "en") == "id"
    assert detect_language("Analisis pasar fintech di Indonesia", "en") == "id"
    
    # Pure English prompt
    assert detect_language("Compare Cursor vs GitHub Copilot pricing", "en") == "en"


def test_graph_compilation():
    graph = create_market_research_graph()
    assert graph is not None
    # Verify graph node presence
    node_keys = graph.nodes.keys()
    assert "planner" in node_keys
    assert "researcher" in node_keys
    assert "fact_checker" in node_keys
    assert "writer" in node_keys


def test_conditional_loop_routing():
    # Case 1: Low confidence, first iteration -> should loop back to researcher
    state_retry: MarketResearchState = {
        "topic": "AI Code Editors",
        "plan": None,
        "collected_evidence": [],
        "citations": [],
        "verification": VerificationVerdict(
            is_valid=False,
            confidence_score=65.0,
            critique="Missing pricing details.",
            missing_aspects=["Pricing tiers"],
            retry_search_queries=["AI Code editor pricing"]
        ),
        "iteration_count": 1,
        "max_iterations": 2,
        "final_report": None,
        "status_updates": [],
        "error": None
    }
    assert route_fact_checker(state_retry) == "researcher"

    # Case 2: High confidence, valid -> should proceed to writer
    state_valid: MarketResearchState = {
        "topic": "AI Code Editors",
        "plan": None,
        "collected_evidence": [],
        "citations": [],
        "verification": VerificationVerdict(
            is_valid=True,
            confidence_score=90.0,
            critique="Complete and verified.",
            missing_aspects=[],
            retry_search_queries=[]
        ),
        "iteration_count": 1,
        "max_iterations": 2,
        "final_report": None,
        "status_updates": [],
        "error": None
    }
    assert route_fact_checker(state_valid) == "writer"

    # Case 3: Low confidence, BUT reached max iterations -> should proceed to writer
    state_max_iter: MarketResearchState = {
        "topic": "AI Code Editors",
        "plan": None,
        "collected_evidence": [],
        "citations": [],
        "verification": VerificationVerdict(
            is_valid=False,
            confidence_score=70.0,
            critique="Still missing some points, but limit reached.",
            missing_aspects=["Enterprise quote"],
            retry_search_queries=[]
        ),
        "iteration_count": 2,
        "max_iterations": 2,
        "final_report": None,
        "status_updates": [],
        "error": None
    }
    assert route_fact_checker(state_max_iter) == "writer"
