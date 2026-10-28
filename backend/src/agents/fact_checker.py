import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig
from backend.src.models.state import MarketResearchState, is_topic_cancelled
from backend.src.models.schemas import VerificationVerdict
from backend.src.agents.llm import get_structured_llm
from backend.src.tools.vector_store import ResearchVectorStore

logger = logging.getLogger(__name__)

FACT_CHECKER_SYSTEM_PROMPT = """You are a Senior Market Intelligence Quality Auditor.
Your job is to evaluate whether the collected evidence across all 4 research dimensions is sufficient and factual to build an accurate Executive Competitor Comparison Report.

The 4 Required Research Dimensions (25% weight each = 100% total):
1. `product_features` (25%): Core features, technical architecture, and product differentiators.
2. `pricing_model` (25%): Primary pricing model and subscription tiers (e.g., Free tier, Pro/Pay-as-you-go, Team/Enterprise).
3. `user_sentiment` (25%): Real user/developer sentiment, community reputation, praised strengths (pros), and common complaints/limitations (cons).
4. `go_to_market` (25%): Target customer segments (e.g., solo devs, startups, mid-market, enterprise) and strategic market positioning.

Scoring Rubric (0 - 100):
- SCORE >= 80.0 (VERIFIED / PASS):
  * Assign 80.0 to 96.0 IF all 4 dimensions (`product_features`, `pricing_model`, `user_sentiment`, `go_to_market`) are backed by factual evidence and citations for the analyzed competitors.
  * DO NOT nitpick minor micro-metrics (such as overage cost per extra GB, millisecond latency benchmarks, or B2B Enterprise "Contact Sales" quotes) when the 4 core dimensions are well-covered.
  * When Score >= 80.0, `missing_aspects` MUST be an empty list `[]`.
- SCORE < 80.0 (PARTIAL EVIDENCE / RETRY NEEDED):
  * Deduct points proportionally if any of the 4 dimensions (`product_features`, `pricing_model`, `user_sentiment`, or `go_to_market`) is genuinely missing or unverified for a competitor.
  * In `missing_aspects`, explicitly state which competitor and which of the 4 dimensions is missing.
  * Provide 2-3 targeted `retry_search_queries` to fetch the missing dimension.

STRICT LANGUAGE RULE:
{language_directive}
"""


def fact_checker_node(state: MarketResearchState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    """
    Fact-Checker & Auditor Node in LangGraph.
    Evaluates both collected_evidence and ChromaDB per-(competitor, dimension) chunks
    so its audit view matches the Writer Agent 100%.
    """
    topic = state.get("topic", "")
    if is_topic_cancelled(topic):
        logger.info(f"[Fact-Checker] Stop signal active for '{topic}'. Skipping Fact-Checker.")
        return {"iteration_count": state.get("iteration_count", 0) + 1, "status_updates": []}
    language = state.get("language", "en")
    plan = state.get("plan")
    evidence = state.get("collected_evidence", [])
    citations = state.get("citations", [])
    iteration = state.get("iteration_count", 0)

    logger.info(f"[Fact-Checker] Auditing evidence for topic '{topic}' (Iteration: {iteration}, Lang: {language})")

    language_directive = (
        "Write the critique and missing_aspects in formal, professional Indonesian (Bahasa Indonesia baku)."
        if language == "id"
        else "Write the critique and missing_aspects in concise, professional English."
    )

    REQUIRED_DIMS = ["pricing_model", "product_features", "go_to_market", "user_sentiment"]
    programmatic_missing: List[str] = []
    targeted_retry_queries: List[str] = []
    coverage_lines: List[str] = []

    try:
        vector_store = ResearchVectorStore(in_memory=False, topic=topic)
    except Exception as exc:
        logger.debug(f"[Fact-Checker] ChromaDB init skipped: {exc}")
        vector_store = None

    if plan and plan.competitors:
        for comp in plan.competitors[:4]:
            c_lower = comp.name.lower()
            found_dims = set()
            for e in evidence:
                if c_lower in e.competitor.lower() and (e.citations or e.facts):
                    found_dims.add(e.dimension)
            for cit in citations:
                if cit.competitor and c_lower in cit.competitor.lower() and cit.dimension:
                    found_dims.add(cit.dimension)

            # Check ChromaDB indexed chunks for this competitor so vector-cached dimensions count towards coverage
            if vector_store:
                for dim in REQUIRED_DIMS:
                    if dim not in found_dims:
                        try:
                            chunks = vector_store.query(
                                f"{comp.name} {dim.replace('_', ' ')}",
                                n_results=1,
                                where_filter={
                                    "$and": [
                                        {"competitor": comp.name},
                                        {"dimension": dim}
                                    ]
                                }
                            )
                            if chunks and any(ch.get("content", "").strip() for ch in chunks):
                                found_dims.add(dim)
                        except Exception:
                            pass

            missing_dims = [d for d in REQUIRED_DIMS if d not in found_dims]
            coverage_lines.append(
                f"- {comp.name}: Verified dimensions={sorted(list(found_dims))}, Missing={missing_dims}"
            )
            for md in missing_dims:
                label = md.replace("_", " ")
                if language == "id":
                    programmatic_missing.append(
                        f"Sumber terverifikasi untuk dimensi '{label}' pada kompetitor {comp.name} belum ditemukan."
                    )
                else:
                    programmatic_missing.append(
                        f"No verified source citations found for '{label}' dimension of {comp.name}."
                    )
                targeted_retry_queries.append(f"{comp.name} {comp.category} {label}")

    evidence_blocks: List[str] = []
    if coverage_lines:
        evidence_blocks.append("=== DETERMINISTIC CITATION COVERAGE MATRIX ===\n" + "\n".join(coverage_lines))

    for e in evidence[-16:]:
        evidence_blocks.append(
            f"[{e.competitor} - {e.dimension}]:\n" + "\n".join(f"- {f}" for f in e.facts)
        )

    if vector_store and plan and plan.competitors:
        for comp in plan.competitors[:4]:
            for dim in REQUIRED_DIMS:
                try:
                    chunks = vector_store.query(
                        f"{comp.name} {dim.replace('_', ' ')}",
                        n_results=1,
                        where_filter={
                            "$and": [
                                {"competitor": comp.name},
                                {"dimension": dim}
                            ]
                        }
                    )
                    for ch in chunks:
                        snippet = ch.get("content", "")[:500]
                        if snippet:
                            evidence_blocks.append(f"[ChromaDB Indexed - {comp.name} | {dim.upper()}]: {snippet}")
                except Exception as exc:
                    logger.debug(f"[Fact-Checker] ChromaDB chunk read skipped: {exc}")

    evidence_text = "\n\n".join(evidence_blocks)
    citations_text = "\n".join(
        [f"- [{c.competitor or 'General'} | {c.dimension or 'info'}] {c.title} ({c.url})" for c in citations[:24]]
    )

    structured_llm = get_structured_llm(VerificationVerdict, temperature=0.1)

    prompt = ChatPromptTemplate.from_messages([
        ("system", FACT_CHECKER_SYSTEM_PROMPT),
        (
            "human",
            "Research Topic: {topic}\n\n"
            "Collected Evidence & ChromaDB Chunks:\n{evidence}\n\n"
            "Collected Citations:\n{citations}\n\n"
            "Evaluate completeness across all 4 dimensions per competitor, assign confidence score, and decide if research passes."
        )
    ])

    chain = prompt | structured_llm

    try:
        verdict: VerificationVerdict = chain.invoke({
            "topic": topic,
            "evidence": evidence_text or "No evidence collected.",
            "citations": citations_text or "No citations available.",
            "language_directive": language_directive
        }, config=config)
    except Exception as exc:
        logger.warning(f"[Fact-Checker] LLM verification error ({exc}), applying deterministic audit.")
        score = 25.0
        if language == "id":
            verdict = VerificationVerdict(
                is_valid=False,
                confidence_score=score,
                critique=f"Audit darurat: LLM tidak dapat dihubungi ({exc.__class__.__name__}), data belum terverifikasi penuh.",
                missing_aspects=["Koneksi LLM terputus atau batas kuota tercapai, data perlu diaudit ulang."],
                retry_search_queries=[f"{topic} profil kompetitor resmi", f"{topic} struktur harga"]
            )
        else:
            verdict = VerificationVerdict(
                is_valid=False,
                confidence_score=score,
                critique=f"Emergency audit: LLM unreachable ({exc.__class__.__name__}), evidence unverified.",
                missing_aspects=["LLM connection error or rate limit reached; evidence requires fresh audit."],
                retry_search_queries=[f"{topic} official competitor profile", f"{topic} pricing structure"]
            )

    # Programmatic enforcement of is_valid threshold (80.0%) and missing dimension checks
    if programmatic_missing:
        max_allowed = max(50.0, 100.0 - (len(programmatic_missing) * 8.0))
        verdict.confidence_score = min(verdict.confidence_score, max_allowed)
        existing_lower = {m.lower() for m in verdict.missing_aspects}
        for pm in programmatic_missing:
            if pm.lower() not in existing_lower:
                verdict.missing_aspects.append(pm)
        if targeted_retry_queries:
            verdict.retry_search_queries = targeted_retry_queries[:4]

    verdict.is_valid = bool(verdict.confidence_score >= 80.0 and not programmatic_missing)
    if verdict.is_valid:
        verdict.missing_aspects = []

    if not verdict.is_valid and not verdict.retry_search_queries:
        verdict.retry_search_queries = [
            f"{topic} official pricing tiers plans",
            f"{topic} core features architecture"
        ]

    new_iteration = iteration + 1
    if language == "id":
        status_label = (
            "DISETUJUI (Tingkat Keyakinan: {:.1f}%)".format(verdict.confidence_score)
            if verdict.is_valid
            else "PERLU RISET ULANG (Tingkat Keyakinan: {:.1f}%)".format(verdict.confidence_score)
        )
        event_msg = f"Pemeriksa Fakta menyelesaikan audit: {status_label}. {verdict.critique[:120]}"
    else:
        status_label = (
            "APPROVED (Confidence: {:.1f}%)".format(verdict.confidence_score)
            if verdict.is_valid
            else "RETRY REQUIRED (Confidence: {:.1f}%)".format(verdict.confidence_score)
        )
        event_msg = f"Auditor completed verification: {status_label}. {verdict.critique[:120]}"

    event = {
        "node": "fact_checker",
        "status": "completed",
        "message": event_msg,
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "is_valid": verdict.is_valid,
            "confidence_score": verdict.confidence_score,
            "missing_aspects": verdict.missing_aspects,
            "iteration": new_iteration
        }
    }

    return {
        "verification": verdict,
        "iteration_count": new_iteration,
        "status_updates": [event]
    }
