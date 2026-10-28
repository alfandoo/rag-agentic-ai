import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from backend.src.models.state import MarketResearchState, is_topic_cancelled
from backend.src.models.schemas import ExtractedEvidence, SourceCitation
from backend.src.tools.search import TriSearchEngine, _normalize_domain
from backend.src.tools.scraper import scrape_url_clean_text
from backend.src.tools.vector_store import ResearchVectorStore

logger = logging.getLogger(__name__)


def _resolve_competitor_domain(comp_name: str, explicit_website: Optional[str] = None) -> Optional[str]:
    """
    Resolves a competitor's official domain from either the Planner's `website` field
    or common well-known tech/fintech/cloud domains.
    """
    domain = _normalize_domain(explicit_website)
    if domain:
        return domain

    known_domains = {
        "supabase": "supabase.com",
        "firebase": "firebase.google.com",
        "neon": "neon.tech",
        "cursor": "cursor.com",
        "github copilot": "github.com",
        "copilot": "github.com",
        "windsurf": "codeium.com",
        "codeium": "codeium.com",
        "stripe": "stripe.com",
        "adyen": "adyen.com",
        "xendit": "xendit.co",
        "midtrans": "midtrans.com",
        "datadog": "datadoghq.com",
        "dynatrace": "dynatrace.com",
        "new relic": "newrelic.com",
        "gopay": "gopay.co.id",
        "ovo": "ovo.id",
        "dana": "dana.id",
        "shopeepay": "shopeepay.co.id",
        "vercel": "vercel.com",
        "netlify": "netlify.com",
        "cloudflare": "cloudflare.com",
        "aws": "aws.amazon.com",
        "planetscale": "planetscale.com",
        "mongodb": "mongodb.com",
        "pinecone": "pinecone.io",
        "weaviate": "weaviate.io",
        "qdrant": "qdrant.tech",
    }
    lower_name = comp_name.strip().lower()
    for key, dom in known_domains.items():
        if key in lower_name:
            return dom
    return None


def _is_citation_relevant_to_competitor(
    citation: SourceCitation,
    comp_name: str,
    official_domain: Optional[str] = None
) -> bool:
    """
    Verifies that a search citation genuinely references the target competitor
    (either by name tokens or official domain) in its URL, title, or snippet.
    Prevents cross-competitor contamination when a fallback web search returns an article about a different competitor.
    """
    haystack = f"{citation.url} {citation.title} {citation.snippet}".lower()
    text = f"{citation.title} {citation.snippet}".lower()
    c_lower = comp_name.strip().lower()

    if official_domain and official_domain.lower() in haystack:
        return True

    # Multi-word names may match by all brand tokens (e.g., "GitHub Copilot")
    tokens = [t for t in c_lower.split() if len(t) >= 3]
    if len(tokens) >= 2 and all(
        re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", text)
        for token in tokens
    ):
        return True

    # Single-word names need a market context; prevents "Neon" matching "neon lights"
    if c_lower and re.search(rf"(?<![a-z0-9]){re.escape(c_lower)}(?![a-z0-9])", text):
        market_terms = (
            "database", "postgres", "pricing", "price", "plan", "feature", "review",
            "cloud", "platform", "serverless", "subscription", "api", "performance",
            "architecture", "cost", "tier"
        )
        return any(term in text for term in market_terms)

    return False


def intelligence_researcher_node(state: MarketResearchState) -> Dict[str, Any]:
    """
    Intelligence Researcher Node in LangGraph.
    Executes per-competitor, per-subtask searches across ALL 4 dimensions formulated by the Planner:
      1. `pricing_model` (official website first -> web fallback)
      2. `product_features` (official website first -> web fallback)
      3. `go_to_market` (official website / customer case studies first -> web fallback)
      4. `user_sentiment` (community & review sources verified to mention that specific competitor)
    Isolates ChromaDB retrieval by both `competitor` AND `dimension`.
    """
    topic = state.get("topic", "Market Research")
    language = state.get("language", "en")
    plan = state.get("plan")
    verification = state.get("verification")
    iteration = state.get("iteration_count", 0)

    search_engine = TriSearchEngine()
    vector_store = ResearchVectorStore(in_memory=False, topic=topic)

    new_evidence: List[ExtractedEvidence] = []
    new_citations: List[SourceCitation] = []
    events: List[Dict[str, Any]] = []

    is_retry = bool(verification and not verification.is_valid and verification.retry_search_queries)

    competitor_domains: Dict[str, Optional[str]] = {}
    competitor_categories: Dict[str, str] = {}
    if plan and plan.competitors:
        for comp in plan.competitors:
            competitor_domains[comp.name.lower()] = _resolve_competitor_domain(comp.name, comp.website)
            competitor_categories[comp.name.lower()] = comp.category or plan.market_domain or ""

    # List of tuples: (query, competitor_name, focus_dimension, target_domain, max_results)
    tasks_to_execute: List[Tuple[str, str, str, Optional[str], int]] = []

    if is_retry and verification:
        logger.info(
            f"[Researcher Agent] Executing retry cycle (iteration {iteration}) "
            f"with {len(verification.retry_search_queries)} targeted queries."
        )
        for rq in verification.retry_search_queries[:4]:
            matched_comp = topic
            matched_domain: Optional[str] = None
            matched_dim = "pricing_model"
            rq_lower = rq.lower()
            if "sentiment" in rq_lower or "review" in rq_lower or "reddit" in rq_lower or "pros" in rq_lower:
                matched_dim = "user_sentiment"
            elif "market" in rq_lower or "segment" in rq_lower or "audience" in rq_lower or "positioning" in rq_lower:
                matched_dim = "go_to_market"
            elif "feature" in rq_lower or "architecture" in rq_lower:
                matched_dim = "product_features"

            if plan and plan.competitors:
                for comp in plan.competitors:
                    if comp.name.lower() in rq_lower:
                        matched_comp = comp.name
                        matched_domain = (
                            None
                            if matched_dim == "user_sentiment"
                            else competitor_domains.get(comp.name.lower())
                        )
                        break
            tasks_to_execute.append((rq, matched_comp, matched_dim, matched_domain, 2))
    elif plan and plan.competitors:
        # Execute ALL 4 dimensions INDIVIDUALLY for EACH competitor so every competitor is equally grounded
        for comp in plan.competitors[:4]:
            c_lower = comp.name.lower()
            official_domain = competitor_domains.get(c_lower)
            category_ctx = competitor_categories.get(c_lower, "")
            domain_hint = official_domain if official_domain else category_ctx

            # 1. `pricing_model` (Official website first -> web fallback)
            tasks_to_execute.append((
                f"{comp.name} {domain_hint} pricing tiers plans free pro enterprise cost limits".strip(),
                comp.name,
                "pricing_model",
                official_domain,
                2
            ))

            # 2. `product_features` (Official website first -> web fallback)
            tasks_to_execute.append((
                f"{comp.name} {domain_hint} core features technical architecture capabilities".strip(),
                comp.name,
                "product_features",
                official_domain,
                2
            ))

            # 3. `go_to_market` (Official website enterprise/customers/use-cases first -> web fallback)
            tasks_to_execute.append((
                f"{comp.name} {domain_hint} target audience enterprise customers use cases market positioning".strip(),
                comp.name,
                "go_to_market",
                official_domain,
                2
            ))

            # 4. `user_sentiment` (Include category/domain context so short names like "Neon" return database reviews, not neon lights!)
            tasks_to_execute.append((
                f'"{comp.name}" {domain_hint} developer review pros cons complaints user sentiment feedback'.strip(),
                comp.name,
                "user_sentiment",
                None,
                2
            ))
    else:
        tasks_to_execute = [
            (f"{topic} competitor analysis features", topic, "product_features", None, 3),
            (f"{topic} pricing tiers subscription cost", topic, "pricing_model", None, 3)
        ]

    queries_executed: List[str] = []
    cache_hits: int = 0

    for query, competitor_name, target_dimension, target_domain, max_res in tasks_to_execute:
        if is_topic_cancelled(topic):
            logger.info(f"[Researcher Agent] Stop signal detected for '{topic}'. Aborting remaining search tasks immediately.")
            break
        queries_executed.append(query)

        # Smart Vector Cache lookup: reuse previously verified chunks from persistent ChromaDB if not in retry mode
        if not is_retry:
            cached_facts, cached_cit_dicts = vector_store.get_cached_evidence(
                competitor=competitor_name,
                dimension=target_dimension,
                query_text=query,
                n_results=2
            )
            if cached_facts and cached_cit_dicts:
                cached_citations = [SourceCitation(**c_dict) for c_dict in cached_cit_dicts]
                new_citations.extend(cached_citations)
                new_evidence.append(
                    ExtractedEvidence(
                        competitor=competitor_name,
                        dimension=target_dimension,
                        facts=cached_facts,
                        citations=cached_citations
                    )
                )
                cache_hits += 1
                logger.info(
                    f"[Smart Vector Cache] Reused {len(cached_facts)} facts & {len(cached_citations)} "
                    f"citations for {competitor_name} [{target_dimension}] without external web requests"
                )
                continue

        official_dom = competitor_domains.get(competitor_name.lower(), target_domain)
        logger.info(
            f"[Researcher Agent] Searching: '{query}' for {competitor_name} "
            f"[{target_dimension}] (official_domain={target_domain})"
        )
        citations, raw_text, engine_used = search_engine.search(
            query,
            max_results=max_res,
            target_domain=target_domain
        )

        # Filter and tag only citations that genuinely mention this competitor or its domain
        valid_citations: List[SourceCitation] = []
        for c in citations:
            if not plan or _is_citation_relevant_to_competitor(c, competitor_name, official_dom):
                c.competitor = competitor_name
                c.dimension = target_dimension
                valid_citations.append(c)

        # If broad user_sentiment search returned irrelevant articles, fall back to official domain/community docs
        if not valid_citations and official_dom and target_domain is None:
            fallback_citations, fallback_text, _ = search_engine.search(
                f"{competitor_name} architecture advantages limitations developer experience",
                max_results=max_res,
                target_domain=official_dom
            )
            for c in fallback_citations:
                if _is_citation_relevant_to_competitor(c, competitor_name, official_dom):
                    c.competitor = competitor_name
                    c.dimension = target_dimension
                    valid_citations.append(c)
            if fallback_text:
                raw_text = fallback_text

        new_citations.extend(valid_citations)

        # Scrape top URL + index search snippets into ChromaDB with both competitor and dimension metadata
        if valid_citations:
            top_cit = valid_citations[0]
            scraped_content = scrape_url_clean_text(top_cit.url)
            text_to_index = scraped_content if scraped_content else f"{top_cit.title}: {top_cit.snippet}"
            if text_to_index:
                vector_store.add_scraped_document(
                    url=top_cit.url,
                    text=text_to_index,
                    competitor=competitor_name,
                    dimension=target_dimension,
                    title=top_cit.title,
                    source_engine=top_cit.source_engine
                )
            for cit in valid_citations:
                snippet_text = f"[{cit.title}] ({cit.url}): {cit.snippet}"
                vector_store.add_scraped_document(
                    url=cit.url,
                    text=snippet_text,
                    competitor=competitor_name,
                    dimension=target_dimension,
                    title=cit.title,
                    source_engine=cit.source_engine
                )

        # Retrieve chunks filtered strictly by BOTH `competitor` AND `dimension` so dimensions never bleed into each other
        retrieved_chunks = vector_store.query(
            query,
            n_results=2,
            where_filter={
                "$and": [
                    {"competitor": competitor_name},
                    {"dimension": target_dimension}
                ]
            }
        )

        facts: List[str] = []
        if retrieved_chunks:
            facts.extend(chunk["content"][:750] for chunk in retrieved_chunks)
        for vc in valid_citations:
            if vc.snippet and len(facts) < 3:
                facts.append(f"[{vc.title}] ({vc.url}): {vc.snippet}")

        # Only append ExtractedEvidence if real verified citations & facts were found for this competitor & dimension
        if valid_citations and facts:
            new_evidence.append(
                ExtractedEvidence(
                    competitor=competitor_name,
                    dimension=target_dimension,
                    facts=facts,
                    citations=valid_citations
                )
            )

    if language == "id":
        action_label = "Menjalankan kueri riset ulang terarah" if is_retry else "Menyelesaikan pengumpulan bukti 4 dimensi per kompetitor"
        cache_note = f" ({cache_hits} dimensi dari Smart Vector Cache)" if cache_hits > 0 else ""
        msg = f"{action_label}: menghimpun {len(new_evidence)} blok bukti{cache_note} dan {len(new_citations)} kutipan terverifikasi via Tri-Search & ChromaDB RAG."
    else:
        action_label = "Investigated targeted retry queries" if is_retry else "Completed 4-dimension evidence gathering per competitor"
        cache_note = f" ({cache_hits} dimensions from Smart Vector Cache)" if cache_hits > 0 else ""
        msg = f"{action_label}: gathered {len(new_evidence)} evidence blocks{cache_note} and {len(new_citations)} verified citations via Tri-Search and ChromaDB."

    event = {
        "node": "researcher",
        "status": "completed",
        "message": msg,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "queries_executed": queries_executed,
            "citations_found": len(new_citations),
            "cache_hits": cache_hits,
            "iteration": iteration
        }
    }
    events.append(event)

    return {
        "collected_evidence": new_evidence,
        "citations": new_citations,
        "status_updates": events
    }
