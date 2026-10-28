import pytest
from backend.src.models.schemas import (
    ResearchPlan,
    CompetitorFocus,
    ResearchSubtask,
    SourceCitation,
    VerificationVerdict,
    CompetitorReport
)
from backend.src.models.state import update_citations


def test_research_plan_schema():
    plan = ResearchPlan(
        market_domain="AI Code Editors",
        competitors=[
            CompetitorFocus(
                name="Cursor",
                website="https://cursor.com",
                category="AI Code Editor",
                core_value_prop="AI-first fork of VS Code"
            )
        ],
        subtasks=[
            ResearchSubtask(
                subtask_id="task_1",
                focus_dimension="pricing_model",
                competitor_target="Cursor",
                search_queries=["Cursor pricing plans tiers"],
                expected_findings="Hobby vs Pro vs Business pricing tiers"
            )
        ],
        key_hypotheses=["Cursor is leading in developer adoption for AI-native code editors"]
    )
    assert plan.market_domain == "AI Code Editors"
    assert len(plan.competitors) == 1
    assert plan.subtasks[0].focus_dimension == "pricing_model"


def test_verification_verdict_confidence_boundaries():
    verdict = VerificationVerdict(
        is_valid=True,
        confidence_score=92.5,
        critique="Evidence is thorough and verified.",
        missing_aspects=[]
    )
    assert verdict.is_valid is True
    assert verdict.confidence_score == 92.5

    with pytest.raises(ValueError):
        # Confidence score must be <= 100
        VerificationVerdict(
            is_valid=False,
            confidence_score=150.0,
            critique="Invalid score",
            missing_aspects=[]
        )


def test_update_citations_deduplication():
    c1 = SourceCitation(
        url="https://cursor.com/pricing",
        title="Cursor Pricing",
        snippet="Pro plan is $20/month",
        source_engine="tavily"
    )
    c2 = SourceCitation(
        url="https://cursor.com/pricing",  # Duplicate URL
        title="Cursor Pricing Page",
        snippet="Duplicate snippet",
        source_engine="duckduckgo"
    )
    c3 = SourceCitation(
        url="https://github.com/features/copilot",
        title="GitHub Copilot",
        snippet="Copilot Individual is $10/month",
        source_engine="google_grounding"
    )

    merged = update_citations([c1], [c2, c3])
    assert len(merged) == 2
    assert merged[0].url == "https://cursor.com/pricing"
    assert merged[1].url == "https://github.com/features/copilot"


def test_update_citations_keeps_same_url_for_different_competitor():
    c1 = SourceCitation(
        url="https://example.com/vs",
        title="Comparison",
        snippet="A and B compared",
        source_engine="tavily",
        competitor="A",
        dimension="pricing_model"
    )
    c2 = SourceCitation(
        url="https://example.com/vs",
        title="Comparison",
        snippet="A and B compared",
        source_engine="tavily",
        competitor="B",
        dimension="pricing_model"
    )

    merged = update_citations([c1], [c2])
    assert len(merged) == 2
    assert {c.competitor for c in merged} == {"A", "B"}
