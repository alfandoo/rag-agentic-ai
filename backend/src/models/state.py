import operator
from typing import TypedDict, Annotated, List, Optional, Dict, Any
from backend.src.models.schemas import (
    ResearchPlan,
    ExtractedEvidence,
    SourceCitation,
    VerificationVerdict,
    CompetitorReport
)


def update_citations(existing: List[SourceCitation], new: List[SourceCitation]) -> List[SourceCitation]:
    """Reducer that appends citations while deduplicating by URL."""
    existing_urls = {c.url for c in existing}
    result = list(existing)
    for c in new:
        if c.url not in existing_urls:
            existing_urls.add(c.url)
            result.append(c)
    return result


class MarketResearchState(TypedDict):
    """
    The shared state passed through each node of the LangGraph state machine.
    Uses LangGraph reducers (Annotated) for parallel or iterative updates.
    """
    # Initial user request
    topic: str
    language: str

    # Agent step artifacts
    plan: Optional[ResearchPlan]
    collected_evidence: Annotated[List[ExtractedEvidence], operator.add]
    citations: Annotated[List[SourceCitation], update_citations]
    verification: Optional[VerificationVerdict]

    # Cyclical control loop
    iteration_count: int
    max_iterations: int

    # Final synthesized deliverable
    final_report: Optional[CompetitorReport]

    # Real-time event log for frontend SSE streaming
    status_updates: Annotated[List[Dict[str, Any]], operator.add]

    # Error handling
    error: Optional[str]
