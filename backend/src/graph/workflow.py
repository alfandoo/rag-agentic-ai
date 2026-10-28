import logging
import re
from typing import Literal, Dict, Any, AsyncGenerator
from langgraph.graph import StateGraph, START, END

from backend.src.models.state import (
    MarketResearchState,
    clear_topic_cancelled,
    is_topic_cancelled
)
from backend.src.agents.planner import market_planner_node
from backend.src.agents.researcher import intelligence_researcher_node
from backend.src.agents.fact_checker import fact_checker_node
from backend.src.agents.writer import executive_writer_node
from backend.src.tools.language import detect_language
from backend.src.config.settings import settings

logger = logging.getLogger(__name__)


def route_fact_checker(state: MarketResearchState) -> str:
    """
    Conditional Edge Router for the self-correcting research loop.
    If user cancelled the run, immediately routes to END.
    If Fact-Checker deems evidence insufficient (< 80%) AND iteration limit is not reached,
    routes back to Researcher. Otherwise, proceeds to Writer.
    """
    topic = state.get("topic", "")
    if is_topic_cancelled(topic):
        logger.info(f"[LangGraph Router] Topic '{topic}' was cancelled by user -> routing to END.")
        return END

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


def route_if_not_cancelled(next_node: str):
    """Returns a router function that checks cancellation before transitioning to next_node."""
    def _router(state: MarketResearchState) -> str:
        topic = state.get("topic", "")
        if is_topic_cancelled(topic):
            logger.info(f"[LangGraph Router] Topic '{topic}' cancelled -> halting before '{next_node}'.")
            return END
        return next_node
    return _router


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

    # 2. Add Edges with Cancellation Guards between every stage
    graph_builder.add_edge(START, "planner")
    graph_builder.add_conditional_edges(
        "planner",
        route_if_not_cancelled("researcher"),
        {"researcher": "researcher", END: END}
    )
    graph_builder.add_conditional_edges(
        "researcher",
        route_if_not_cancelled("fact_checker"),
        {"fact_checker": "fact_checker", END: END}
    )

    # 3. Add Conditional Self-Correction Edge
    graph_builder.add_conditional_edges(
        "fact_checker",
        route_fact_checker,
        {
            "researcher": "researcher",
            "writer": "writer",
            END: END
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
    resolved_lang = detect_language(topic, fallback_language=language)
    clear_topic_cancelled(topic)

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
            import os
            os.environ["LANGFUSE_PUBLIC_KEY"] = settings.langfuse_public_key
            os.environ["LANGFUSE_SECRET_KEY"] = settings.langfuse_secret_key
            os.environ["LANGFUSE_BASE_URL"] = settings.langfuse_host
            from langfuse import Langfuse
            from langfuse.langchain import CallbackHandler
            # Explicitly bind credentials to Langfuse singleton
            Langfuse(
                public_key=settings.langfuse_public_key,
                secret_key=settings.langfuse_secret_key,
                base_url=settings.langfuse_host
            )
            callbacks.append(CallbackHandler())
            logger.info("Langfuse observability callback registered successfully.")
        except Exception as exc:
            logger.warning(f"Could not initialize Langfuse callback: {exc}")

    config = {"callbacks": callbacks} if callbacks else {}

    # Stream graph updates node by node
    try:
        async for output in research_graph.astream(initial_state, config=config, stream_mode="updates"):
            if is_topic_cancelled(topic):
                logger.info(f"[Workflow] Stop signal active for '{topic}'. Halting LangGraph stream.")
                break
            for node_name, node_update in output.items():
                yield {
                    "node": node_name,
                    "update": node_update,
                    "language": resolved_lang
                }
    finally:
        if callbacks:
            try:
                import langfuse
                langfuse.get_client().flush()
                logger.info("[Workflow] Langfuse traces flushed successfully.")
            except Exception as flush_exc:
                logger.debug(f"[Workflow] Langfuse flush error: {flush_exc}")
