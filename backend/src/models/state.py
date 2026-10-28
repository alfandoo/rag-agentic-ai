import operator
import threading
from typing import TypedDict, Annotated, List, Optional, Dict, Any, Set
from backend.src.models.schemas import (
    ResearchPlan,
    ExtractedEvidence,
    SourceCitation,
    VerificationVerdict,
    CompetitorReport
)

# Thread-safe registry of cancelled research topics / run IDs
_cancelled_topics_lock = threading.Lock()
_cancelled_topics: Set[str] = set()


def mark_topic_cancelled(topic: str) -> None:
    """Marks a research topic (or all active topics if '*' is passed) as cancelled."""
    with _cancelled_topics_lock:
        if not topic or topic.strip() == "*":
            _cancelled_topics.add("*")
        else:
            _cancelled_topics.add(topic.strip().lower())


def clear_topic_cancelled(topic: str) -> None:
    """Clears cancellation flag when a new research run starts for a topic."""
    with _cancelled_topics_lock:
        _cancelled_topics.discard("*")
        if topic:
            _cancelled_topics.discard(topic.strip().lower())


def is_topic_cancelled(topic: str) -> bool:
    """Returns True if the user requested to stop the research run for this topic."""
    with _cancelled_topics_lock:
        if "*" in _cancelled_topics:
            return True
        if not topic:
            return False
        return topic.strip().lower() in _cancelled_topics


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
