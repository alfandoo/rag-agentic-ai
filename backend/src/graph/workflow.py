import logging
import re
from typing import Literal, Dict, Any, AsyncGenerator
from langgraph.graph import StateGraph, START, END

from backend.src.models.state import MarketResearchState
from backend.src.agents.planner import market_planner_node
from backend.src.agents.researcher import intelligence_researcher_node
from backend.src.agents.fact_checker import fact_checker_node
from backend.src.agents.writer import executive_writer_node
from backend.src.config.settings import settings

logger = logging.getLogger(__name__)

INDONESIAN_MARKERS = {
    "bandingkan", "analisis", "pasar", "harga", "fitur", "kelebihan", 
    "kekurangan", "terbaik", "dan", "untuk", "antara", "bagaimana", 
    "rekomendasi", "produk", "kompetitor", "ulasan", "kelemahan", "biaya"
}


def detect_language(topic: str, requested_lang: str = "en") -> str:
    """
    Detects language from explicit user selection OR prompt semantics.
    If the requested language is 'id', or if the prompt clearly contains Indonesian keywords,
    resolves to 'id'. Otherwise defaults to 'en'.
    """
    if requested_lang == "id":
        return "id"

    # Tokenize topic words and check for Indonesian markers
    words = set(re.findall(r'\b\w+\b', topic.lower()))
    if words.intersection(INDONESIAN_MARKERS):
        logger.info(f"Detected Indonesian prompt semantics for topic: '{topic}' -> auto-resolving language to 'id'")
        return "id"

    return "en"


def route_fact_checker(state: MarketResearchState) -> Literal["researcher", "writer"]:
    """
    Conditional Edge Router for the self-correcting research loop.
    If Fact-Checker deems evidence insufficient (< 80%) AND iteration limit is not reached,
    routes back to Researcher. Otherwise, proceeds to Writer.
    """
    verdict = state.get("verification")
    iteration = state.get("iteration_count", 0)
    max_iterations = state.get("max_iterations", 2)

    if verdict and not verdict.is_valid and iteration < max_iterations:
        logger.info(
            f"[LangGraph Router] Fact-check score ({verdict.confidence_score}%) < 80%. "
            f"Triggering self-correction loop (Iteration {iteration}/{max_iterations}) ➡️ Researcher"
        )
        return "researcher"

    logger.info(
        f"[LangGraph Router] Fact-check completed (Score: {verdict.confidence_score if verdict else 0}%, Iteration: {iteration}/{max_iterations}). "
        f"Proceeding ➡️ Executive Writer"
    )
    return "writer"


def create_market_research_graph() -> Any:
    """
    Assembles and compiles the full StateGraph for Market & Competitor Intelligence.
    """
    graph_builder = StateGraph(MarketResearchState)

    # 1. Add all Agent Nodes
    graph_builder.add_node("planner", market_planner_node)
    graph_builder.add_node("researcher", intelligence_researcher_node)
    graph_builder.add_node("fact_checker", fact_checker_node)
    graph_builder.add_node("writer", executive_writer_node)

    # 2. Add Fixed Edges
    graph_builder.add_edge(START, "planner")
    graph_builder.add_edge("planner", "researcher")
    graph_builder.add_edge("researcher", "fact_checker")

    # 3. Add Conditional Self-Correction Edge
    graph_builder.add_conditional_edges(
        "fact_checker",
        route_fact_checker,
        {
            "researcher": "researcher",
            "writer": "writer"
        }
    )

    # 4. Final Edge to END
    graph_builder.add_edge("writer", END)

    return graph_builder.compile()


# Global compiled workflow instance
research_graph = create_market_research_graph()


async def stream_research_workflow(
    topic: str,
    max_iterations: int = 2,
    language: str = "en"
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Asynchronously executes the research graph and yields real-time state events
    as each node completes. Designed for FastAPI Server-Sent Events (SSE).
    """
    resolved_lang = detect_language(topic, language)

    initial_state: MarketResearchState = {
        "topic": topic,
        "language": resolved_lang,
        "plan": None,
        "collected_evidence": [],
        "citations": [],
        "verification": None,
        "iteration_count": 0,
        "max_iterations": max_iterations,
        "final_report": None,
        "status_updates": [],
        "error": None
    }

    # Optional Langfuse callback setup
    callbacks = []
    if settings.langfuse_public_key and settings.langfuse_secret_key:
        try:
            from langfuse.callback import CallbackHandler
            callbacks.append(CallbackHandler(
                public_key=settings.langfuse_public_key,
                secret_key=settings.langfuse_secret_key,
                host=settings.langfuse_host
            ))
            logger.info("Langfuse observability callback registered.")
        except Exception as exc:
            logger.warning(f"Could not initialize Langfuse callback: {exc}")

    config = {"callbacks": callbacks} if callbacks else {}

    # Stream graph updates node by node
    async for output in research_graph.astream(initial_state, config=config, stream_mode="updates"):
        for node_name, node_update in output.items():
            yield {
                "node": node_name,
                "update": node_update,
                "language": resolved_lang
            }
