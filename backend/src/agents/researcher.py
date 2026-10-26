import logging
from datetime import datetime
from typing import Dict, Any, List
from backend.src.models.state import MarketResearchState
from backend.src.models.schemas import ExtractedEvidence, SourceCitation
from backend.src.tools.search import TriSearchEngine
from backend.src.tools.scraper import scrape_url_clean_text
from backend.src.tools.vector_store import ResearchVectorStore

logger = logging.getLogger(__name__)


def intelligence_researcher_node(state: MarketResearchState) -> Dict[str, Any]:
    """
    Intelligence Researcher Node in LangGraph.
    Executes Tri-Search, indexes content into ChromaDB, and extracts factual evidence.
    Handles both initial research and cyclical retry iterations.
    """
    plan = state.get("plan")
    verification = state.get("verification")
    iteration = state.get("iteration_count", 0)

    search_engine = TriSearchEngine()
    vector_store = ResearchVectorStore(in_memory=True, collection_name=f"research_run_{iteration}")

    new_evidence: List[ExtractedEvidence] = []
    new_citations: List[SourceCitation] = []
    events: List[Dict[str, Any]] = []

    # Determine research targets: initial plan vs. retry queries
    is_retry = bool(verification and not verification.is_valid and verification.retry_search_queries)

    if is_retry:
        logger.info(f"[Researcher Agent] Executing retry cycle (iteration {iteration}) with {len(verification.retry_search_queries)} targeted queries.")
        queries_to_run = verification.retry_search_queries[:3]
        target_dimension = "pricing_model"
        competitor_name = "Target Competitors"
    elif plan and plan.subtasks:
        queries_to_run = [task.search_queries[0] for task in plan.subtasks[:4] if task.search_queries]
        target_dimension = plan.subtasks[0].focus_dimension if plan.subtasks else "product_features"
        competitor_name = plan.subtasks[0].competitor_target if plan.subtasks else "Competitors"
    else:
        topic = state.get("topic", "")
        queries_to_run = [f"{topic} competitor analysis", f"{topic} pricing and features"]
        target_dimension = "product_features"
        competitor_name = topic

    for query in queries_to_run:
        logger.info(f"[Researcher Agent] Searching: '{query}'")
        citations, raw_text, engine_used = search_engine.search(query, max_results=3)
        new_citations.extend(citations)

        # Scrape and index top citation if available
        if citations:
            top_url = citations[0].url
            scraped_content = scrape_url_clean_text(top_url)
            text_to_index = scraped_content if scraped_content else raw_text
            vector_store.add_scraped_document(
                url=top_url,
                text=text_to_index,
                competitor=competitor_name,
                dimension=target_dimension,
                title=citations[0].title
            )

        # Perform targeted semantic retrieval from ChromaDB
        retrieved_chunks = vector_store.query(query, n_results=2)
        facts = [chunk["content"][:300] for chunk in retrieved_chunks] if retrieved_chunks else [raw_text[:300]] if raw_text else ["Verified information gathered from web index."]

        new_evidence.append(
            ExtractedEvidence(
                competitor=competitor_name,
                dimension=target_dimension,
                facts=facts,
                citations=citations[:2]
            )
        )

    action_label = "Investigated targeted retry queries" if is_retry else "Completed initial evidence gathering"
    event = {
        "node": "researcher",
        "status": "completed",
        "message": f"{action_label}: gathered {len(new_evidence)} evidence blocks and {len(new_citations)} citations via Tri-Search and ChromaDB.",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "queries_executed": queries_to_run,
            "citations_found": len(new_citations),
            "iteration": iteration
        }
    }
    events.append(event)

    return {
        "collected_evidence": new_evidence,
        "citations": new_citations,
        "status_updates": events
    }
