import logging
from datetime import datetime
from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from backend.src.models.state import MarketResearchState
from backend.src.models.schemas import VerificationVerdict
from backend.src.agents.llm import get_structured_llm

logger = logging.getLogger(__name__)

FACT_CHECKER_SYSTEM_PROMPT = """You are a Ruthless Fact-Checker and Market Intelligence Quality Auditor.
Your job is to critically evaluate whether the collected evidence is sufficiently thorough, recent, and factual.

Evaluation Criteria:
1. Pricing & Feature Specificity: Are prices, subscription tiers, and features specific with numbers, or just vague claims?
2. Recency & Relevance: Does the information reflect current market reality (not outdated claims from prior years)?
3. Citation Strength: Is each claim backed by credible citations or official product pages?

Scoring Rules (0 - 100):
- Score >= 80.0 ONLY IF concrete numbers, official pricing tiers, and distinct features with credible citations exist.
- Score < 80.0 IF pricing is vague, missing, or contradictory, or if competitor data relies on unverified assumptions.
- If score < 80.0, you MUST provide 2 to 3 targeted 'retry_search_queries' to hunt down the missing data.

STRICT LANGUAGE RULE:
{language_directive}
"""


def fact_checker_node(state: MarketResearchState) -> Dict[str, Any]:
    """
    Fact-Checker & Auditor Node in LangGraph.
    Enforces programmatic synchronization between confidence_score and is_valid.
    Guarantees no unverified evidence (<80%) is marked as valid.
    """
    topic = state.get("topic", "")
    language = state.get("language", "en")
    evidence = state.get("collected_evidence", [])
    citations = state.get("citations", [])
    iteration = state.get("iteration_count", 0)

    logger.info(f"[Fact-Checker] Auditing evidence for topic '{topic}' (Iteration: {iteration}, Lang: {language})")

    language_directive = (
        "Write the critique and missing_aspects in formal, professional Indonesian (Bahasa Indonesia baku)."
        if language == "id"
        else "Write the critique and missing_aspects in concise, professional English."
    )

    evidence_text = "\n".join([
        f"[{e.competitor} - {e.dimension}]:\n" + "\n".join(f"- {f}" for f in e.facts)
        for e in evidence[-6:]
    ])
    citations_text = "\n".join([f"- {c.title} ({c.url})" for c in citations[:6]])

    structured_llm = get_structured_llm(VerificationVerdict, temperature=0.1)

    prompt = ChatPromptTemplate.from_messages([
        ("system", FACT_CHECKER_SYSTEM_PROMPT),
        (
            "human",
            "Research Topic: {topic}\n\n"
            "Collected Evidence:\n{evidence}\n\n"
            "Collected Citations:\n{citations}\n\n"
            "Evaluate completeness, assign confidence score, and decide if research passes."
        )
    ])

    chain = prompt | structured_llm

    try:
        verdict: VerificationVerdict = chain.invoke({
            "topic": topic,
            "evidence": evidence_text or "No evidence collected.",
            "citations": citations_text or "No citations available.",
            "language_directive": language_directive
        })
    except Exception as exc:
        logger.warning(f"[Fact-Checker] LLM verification error ({exc}), applying deterministic audit.")
        # If LLM verification fails, assign low confidence (25%) so it never pretends to be verified
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

    # =========================================================================
    # PRODUCTION GUARDRAIL 1: Programmatic Enforcement of is_valid
    # NEVER allow LLM to set is_valid=True if confidence_score is below 80.0%
    # =========================================================================
    verdict.is_valid = bool(verdict.confidence_score >= 80.0)

    # Ensure retry queries exist if rejected
    if not verdict.is_valid and not verdict.retry_search_queries:
        if language == "id":
            verdict.retry_search_queries = [
                f"{topic} struktur harga resmi tier biaya",
                f"{topic} review kekurangan keluhan pengguna"
            ]
        else:
            verdict.retry_search_queries = [
                f"{topic} official pricing breakdown fee",
                f"{topic} customer complaints limitations review"
            ]

    new_iteration = iteration + 1
    if language == "id":
        status_label = "DISETUJUI (Tingkat Keyakinan: {:.1f}%)".format(verdict.confidence_score) if verdict.is_valid else "DITOLAK - PERLU RISET ULANG (Tingkat Keyakinan: {:.1f}%)".format(verdict.confidence_score)
        event_msg = f"Pemeriksa Fakta menyelesaikan audit: {status_label}. {verdict.critique[:120]}"
    else:
        status_label = "APPROVED (Confidence: {:.1f}%)".format(verdict.confidence_score) if verdict.is_valid else "REJECTED - RETRY REQUIRED (Confidence: {:.1f}%)".format(verdict.confidence_score)
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
