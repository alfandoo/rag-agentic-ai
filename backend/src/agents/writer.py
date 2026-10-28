import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig
from backend.src.models.state import MarketResearchState, is_topic_cancelled
from backend.src.models.schemas import (
    CompetitorReport,
    CompetitorProfile,
    SWOTAnalysis,
    ResearchPlan,
    ExtractedEvidence,
    SourceCitation,
    VerificationVerdict
)
from backend.src.agents.llm import get_structured_llm
from backend.src.tools.vector_store import ResearchVectorStore

logger = logging.getLogger(__name__)

WRITER_SYSTEM_PROMPT = """You are a Principal Market Intelligence Synthesizer operating under a STRICT CLOSED-WORLD EVIDENCE POLICY.
Your sole mission is to synthesize the multi-agent pipeline outputs (1. Planner Targets & Hypotheses, 2. Researcher & ChromaDB Per-Competitor Evidence across 4 Dimensions, and 3. Fact-Checker Audit Verdict) into an Executive Intelligence Report.

CRITICAL CLOSED-WORLD / ZERO-HALLUCINATION POLICY:
- You MUST derive every claim, feature, price, target segment, sentiment summary, and SWOT point EXCLUSIVELY from the provided `=== 3. STRUCTURED PER-COMPETITOR x 4-DIMENSION EVIDENCE DOSSIER ===` and `=== 4. VERIFIED CITATIONS ===`.
- DO NOT use outside pre-trained knowledge to invent features, fabricate pricing numbers, guess customer segments, or hallucinate user sentiment that is not supported by the provided evidence blocks.
- If a specific data point for a competitor is not present in the provided evidence blocks, you MUST explicitly state that it is unverified in the indexed sources.

SECTION-BY-SECTION AGENT-GROUNDED SYNTHESIS RULES:

1. TAB 1 — EXECUTIVE SUMMARY & COMPETITOR PROFILES:
   - `executive_summary`: Synthesize the overarching competitive landscape into a fluid, professional, publication-grade executive narrative (2-3 cohesive paragraphs or structured strategic takeaways).
     * NATURAL EXECUTIVE TONE: Answer and weave the Planner's strategic hypotheses seamlessly into fluent market observations.
     * STRICT FORBIDDEN NOTATION: DO NOT write robotic or academic labels like "[H1]", "[H2]", "[H3]" or phrases like "Hipotesis [H1] tervalidasi" / "Hypothesis 1 is validated". Present findings directly as executive intelligence (e.g., write "GoPay memiliki keunggulan kompetitif...", NEVER "Hipotesis [H1] tervalidasi: GoPay...").
   - `market_overview`: Summarize the competitive dynamics and architectural approaches strictly as evidenced in the collected documents.
   - `competitor_profiles`: Generate one `CompetitorProfile` for EACH competitor in the Planner's target list, mapping 1-to-1 to the 4 Researcher dimensions:
     * `market_positioning` (from `GO_TO_MARKET` evidence): Target customer segments and positioning evidenced in the sources.
     * `pricing_summary` (from `PRICING_MODEL` evidence): Specific free tier quotas, paid tier prices ($/mo or usage rates), and enterprise model found in the sources.
     * `user_sentiment` (from `USER_SENTIMENT` evidence): 1-2 sentences summarizing the exact developer/user feedback, praise, and complaints found in the `USER_SENTIMENT` evidence blocks for this competitor.
     * `key_features` (from `PRODUCT_FEATURES` evidence): 3 to 5 specific technical & product capabilities explicitly mentioned in the `PRODUCT_FEATURES` evidence for this competitor.
     * `pros` & `cons`: 3 to 4 concrete strengths and limitations directly evidenced in `PRODUCT_FEATURES` and `USER_SENTIMENT` for this competitor.

2. TAB 2 — COMPARISON MATRICES (`feature_matrix_markdown` & `pricing_matrix_markdown`):
   - **FORBID BARE "Ya / Tidak" OR "Yes / No" CELLS**: Every table cell MUST contain descriptive technical or commercial detail extracted from the evidence (e.g., "Ya — PostgreSQL dengan Row-Level Security" or "Usage-based ($0.106/CU-jam)").
   - `feature_matrix_markdown`: A Markdown table comparing ALL planned competitors across 6 to 8 rows grounded in the evidence, INCLUDING:
     * Core technical architecture & feature rows from `PRODUCT_FEATURES`
     * 1 row for **Sentimen Pengguna / User Sentiment** from `USER_SENTIMENT`
     * 1 row for **Go-To-Market & Segmen Target** from `GO_TO_MARKET`
   - `pricing_matrix_markdown`: A Markdown table comparing ALL planned competitors across 5 rows from `PRICING_MODEL`:
     (1) Free Tier / Starter Quota, (2) Pro / Pay-As-You-Go Tier, (3) Team / Scale Tier, (4) Enterprise & SLA, (5) Billing Model & Overages.

3. TAB 3 — 4-QUADRANT SWOT ANALYSIS (`swot_analyses`):
   - Generate a complete 4-quadrant `SWOTAnalysis` for EVERY planned competitor.
   - Ground `strengths` and `weaknesses` directly in the competitor's verified `PRODUCT_FEATURES`, `PRICING_MODEL`, and `USER_SENTIMENT` evidence.
   - Ground `opportunities` and `threats` directly in the `GO_TO_MARKET` evidence and the comparative advantages of the other analyzed competitors in the dossier.

4. STRICT SYNCHRONIZATION WITH FACT-CHECKER AUDIT:
   - If a specific metric or price is flagged in `Missing / Unverified Data Points` and is absent from the evidence, write:
     * 'Belum Terverifikasi di Sumber' (if Indonesian)
     * 'Not Verified in Indexed Sources' (if English)

MANDATORY LANGUAGE DIRECTIVE:
{language_directive}
"""

FALLBACK_NOTICE = {
    "id": "Belum terverifikasi di sumber sitasi yang terindeks.",
    "en": "Not verified in indexed sources.",
}


def _build_fallback_report(
    topic: str,
    plan: Optional[ResearchPlan],
    evidence: List[ExtractedEvidence],
    citations: List[SourceCitation],
    language: str,
    confidence_score: float,
    audit_status: str,
) -> CompetitorReport:
    """Builds an evidence-only report when the writer LLM is unavailable. Never invents facts."""
    notice = FALLBACK_NOTICE["id"] if language == "id" else FALLBACK_NOTICE["en"]
    competitors = [c.name for c in plan.competitors] if plan and plan.competitors else [topic]

    def facts_for(name: str, dimension: str) -> List[str]:
        facts: List[str] = []
        for item in evidence:
            if name.lower() in item.competitor.lower() and item.dimension == dimension:
                facts.extend(f for f in item.facts if f not in facts)
        return facts[:4]

    def text_or_notice(facts: List[str]) -> str:
        return " ".join(facts)[:600] if facts else notice

    profiles = []
    for name in competitors:
        features = facts_for(name, "product_features")
        gtm = facts_for(name, "go_to_market")
        profiles.append(
            CompetitorProfile(
                name=name,
                tagline=notice,
                pricing_summary=text_or_notice(facts_for(name, "pricing_model")),
                user_sentiment=text_or_notice(facts_for(name, "user_sentiment")),
                key_features=features or [notice],
                pros=[notice],
                cons=[notice],
                market_positioning=text_or_notice(gtm)
            )
        )

    def status_table() -> str:
        header = "| " + " | ".join(["Item"] + competitors) + " |"
        divider = "| :--- | " + " | ".join([":---"] * len(competitors)) + " |"
        row = "| " + " | ".join(["Status data" if language == "id" else "Data status"] + [notice] * len(competitors)) + " |"
        return "\n".join([header, divider, row])

    summary = (
        "Laporan ini disusun tanpa sintesis LLM karena penyedia model tidak dapat dihubungi. "
        f"Hanya fakta mentah dari sumber terindeks yang ditampilkan; bagian tanpa bukti ditandai: {notice}"
        if language == "id"
        else "This report was generated without LLM synthesis because the model provider was unreachable. "
        f"Only raw facts from indexed sources are shown; unbacked sections are marked: {notice}"
    )

    return CompetitorReport(
        title=f"Laporan Intelijen Pasar: {topic}" if language == "id" else f"Market Intelligence Report: {topic}",
        executive_summary=summary,
        market_overview=notice,
        competitor_profiles=profiles,
        feature_matrix_markdown=status_table(),
        pricing_matrix_markdown=status_table(),
        swot_analyses=[
            SWOTAnalysis(
                competitor=name,
                strengths=[notice],
                weaknesses=[notice],
                opportunities=[notice],
                threats=[notice]
            )
            for name in competitors
        ],
        strategic_recommendations=[],
        verified_citations=citations[:16],
        confidence_score=confidence_score,
        audit_status=audit_status
    )


def executive_writer_node(state: MarketResearchState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    """
    Executive Writer Node in LangGraph.
    Organizes all Researcher & ChromaDB evidence strictly by (Competitor x 4 Dimensions)
    and synthesizes the final CompetitorReport under a closed-world anti-hallucination policy.
    """
    topic = state.get("topic", "")
    if is_topic_cancelled(topic):
        logger.info(f"[Writer Agent] Stop signal active for '{topic}'. Skipping Writer synthesis.")
        return {"status_updates": []}
    language = state.get("language", "en")
    plan = state.get("plan")
    evidence = state.get("collected_evidence", [])
    citations = state.get("citations", [])
    verification = state.get("verification")

    confidence_score = verification.confidence_score if verification else 80.0
    audit_status = "verified" if confidence_score >= 80.0 else "partial_evidence"

    logger.info(
        f"[Writer Agent] Synthesizing comprehensive intelligence report for '{topic}' "
        f"(Lang: '{language}', Confidence: {confidence_score}%, Status: {audit_status})"
    )

    if language == "id":
        language_directive = (
            "ATURAN BAHASA MUTLAK: Seluruh judul laporan, Ringkasan Eksekutif, Gambaran Pasar, "
            "profil kompetitor (fitur utama, kelebihan, kekurangan, model harga, sentimen pengguna, target pasar), baris/kolom tabel Markdown, "
            "analisis SWOT (Kekuatan, Kelemahan, Peluang, Ancaman), serta rekomendasi strategis "
            "WAJIB DITULIS LENGKAP DALAM BAHASA INDONESIA BAKU DAN PROFESIONAL. "
            "Gunakan HANYA fakta dari bukti yang diberikan; jangan mengarang di luar bukti agen."
        )
    else:
        language_directive = (
            "MANDATORY LANGUAGE RULE: Write all report sections, executive summaries, tables, "
            "SWOT descriptions, and strategic takeaways in fluent, publication-grade professional English. "
            "Use ONLY facts from the provided agent evidence; do not invent information outside the dossier."
        )

    # 1. Extract Planner context (Target Competitors, Subtasks & Hypotheses)
    planned_competitors = (
        ", ".join(f"{c.name} ({c.category}: {c.core_value_prop})" for c in plan.competitors)
        if plan and plan.competitors
        else topic
    )
    planned_hypotheses = (
        "\n".join(f"- {h}" for h in plan.key_hypotheses)
        if plan and plan.key_hypotheses
        else "- Evaluate primary feature, pricing, sentiment, and go-to-market differentiation across competitors."
    )

    # 2. Build Structured Per-Competitor x 4-Dimension Evidence Dossier
    REQUIRED_DIMS = ["pricing_model", "product_features", "go_to_market", "user_sentiment"]
    dossier_sections: List[str] = []

    try:
        vector_store = ResearchVectorStore(in_memory=False, topic=topic)
    except Exception:
        vector_store = None

    if plan and plan.competitors:
        for comp in plan.competitors[:4]:
            c_name = comp.name
            c_lower = c_name.lower()
            comp_section = [f"## COMPETITOR: {c_name} (Category: {comp.category})"]

            for dim in REQUIRED_DIMS:
                dim_facts: List[str] = []

                # Gather facts from state `collected_evidence` for this (competitor, dimension)
                for ev in evidence:
                    if c_lower in ev.competitor.lower() and ev.dimension == dim:
                        for f in ev.facts:
                            if f not in dim_facts:
                                dim_facts.append(f)

                # Gather citations tagged for this (competitor, dimension)
                for cit in citations:
                    if cit.dimension == dim and cit.competitor and c_lower in cit.competitor.lower():
                        cit_line = f"[{cit.title}] ({cit.url}): {cit.snippet}"
                        if cit_line not in dim_facts:
                            dim_facts.append(cit_line)

                # Supplement from ChromaDB with strict ($and: competitor + dimension) filter
                if vector_store and len(dim_facts) < 2:
                    try:
                        chunks = vector_store.query(
                            f"{c_name} {dim.replace('_', ' ')}",
                            n_results=2,
                            where_filter={
                                "$and": [
                                    {"competitor": c_name},
                                    {"dimension": dim}
                                ]
                            }
                        )
                        for ch in chunks:
                            content = ch.get("content", "")[:600]
                            if content and content not in dim_facts:
                                dim_facts.append(content)
                    except Exception:
                        pass

                comp_section.append(f"### [{c_name} -> {dim.upper()}]:")
                if dim_facts:
                    comp_section.extend(f"  * {df}" for df in dim_facts[:4])
                else:
                    comp_section.append("  * [NO VERIFIED EVIDENCE FOUND IN INDEXED SOURCES FOR THIS DIMENSION]")

            dossier_sections.append("\n".join(comp_section))
    else:
        for e in evidence:
            facts_str = "\n".join(f"  * {f}" for f in e.facts)
            dossier_sections.append(f"### [{e.competitor} | {e.dimension.upper()}]:\n{facts_str}")

    evidence_summary = "\n\n".join(dossier_sections)

    # 3. Extract Fact-Checker Audit Context
    audit_critique_text = verification.critique if verification and verification.critique else "Evidence verified."
    missing_aspects_text = (
        "\n".join(f"- {m}" for m in verification.missing_aspects)
        if verification and verification.missing_aspects
        else "None (all 4 dimensions verified across all competitors)."
    )

    citations_summary = "\n".join(
        [
            f"- [{c.competitor or 'General'} | {c.dimension or 'info'}] [{c.title}]({c.url}) ({c.source_engine}): {c.snippet[:180]}"
            for c in citations[:28]
        ]
    )

    structured_llm = get_structured_llm(CompetitorReport, temperature=0.1)

    prompt = ChatPromptTemplate.from_messages([
        ("system", WRITER_SYSTEM_PROMPT),
        (
            "human",
            "Research Topic: {topic}\n\n"
            "=== 1. PLANNER AGENT TARGETS & HYPOTHESES ===\n"
            "Target Competitors: {planned_competitors}\n"
            "Key Hypotheses to Validate in Executive Summary:\n{planned_hypotheses}\n\n"
            "=== 2. FACT-CHECKER AUDIT VERDICT ===\n"
            "Audit Confidence Score: {confidence_score}%\n"
            "Auditor Critique: {audit_critique}\n"
            "Missing / Unverified Data Points:\n{missing_aspects}\n\n"
            "=== 3. STRUCTURED PER-COMPETITOR x 4-DIMENSION EVIDENCE DOSSIER ===\n"
            "{evidence}\n\n"
            "=== 4. VERIFIED CITATIONS ===\n"
            "{citations}\n\n"
            "Compile the complete Executive Competitor Intelligence Report strictly grounded in the evidence dossier above."
        )
    ])

    chain = prompt | structured_llm

    try:
        report: CompetitorReport = chain.invoke({
            "language_directive": language_directive,
            "topic": topic,
            "planned_competitors": planned_competitors,
            "planned_hypotheses": planned_hypotheses,
            "confidence_score": confidence_score,
            "audit_critique": audit_critique_text,
            "missing_aspects": missing_aspects_text,
            "evidence": evidence_summary or "General market data.",
            "citations": citations_summary or "Public web resources."
        }, config=config)
        report.confidence_score = confidence_score
        report.audit_status = audit_status

        # Always preserve ALL real deduplicated citations collected by the Researcher across all 4 subtasks
        if citations:
            merged_citations = list(citations)
            seen_urls = {c.url.rstrip("/").lower() for c in merged_citations if c.url}
            for llm_cit in (report.verified_citations or []):
                norm_url = llm_cit.url.rstrip("/").lower() if llm_cit.url else ""
                if norm_url and norm_url not in seen_urls:
                    merged_citations.append(llm_cit)
                    seen_urls.add(norm_url)
            report.verified_citations = merged_citations[:36]
    except Exception as exc:
        logger.warning(f"[Writer Agent] LLM report generation error ({exc}), building evidence-only fallback report.")
        report = _build_fallback_report(
            topic=topic,
            plan=plan,
            evidence=evidence,
            citations=citations,
            language=language,
            confidence_score=confidence_score,
            audit_status=audit_status
        )

    # Always synchronize audit provenance and real system timestamp (never trust LLM-generated dates)
    report.generated_at = datetime.now(timezone.utc).isoformat()

    # Natural tone guardrail: Clean up any robotic hypothesis tags (e.g., "[H1]", "Hipotesis [H1] tervalidasi:")
    if report.executive_summary:
        import re
        clean_sum = report.executive_summary
        clean_sum = re.sub(
            r'\b(?:Hipotesis|Hypothesis)\s*\[?H?\d+\]?\s*(?:tervalidasi|didukung|tidak terbukti|validated|supported|refuted|mengenai|tentang|regarding)?\s*:?\s*',
            '',
            clean_sum,
            flags=re.IGNORECASE
        )
        clean_sum = re.sub(r'\[H\d+\]\s*:?', '', clean_sum)
        clean_sum = re.sub(r'(\.\s+)([a-z])', lambda m: m.group(1) + m.group(2).upper(), clean_sum)
        clean_sum = re.sub(r'\s{2,}', ' ', clean_sum).strip()
        report.executive_summary = clean_sum

    # =========================================================================
    # PROGRAMMATIC ANTI-HALLUCINATION GUARDRAIL PER COMPETITOR & DIMENSION:
    # Verify that each competitor's `user_sentiment`, `go_to_market`, and `pricing_model`
    # actually has at least 1 backing source citation in `report.verified_citations` or `evidence`.
    # If a dimension has 0 citations for that competitor, replace any LLM-invented text
    # with an explicit unverified notice so the report NEVER hallucinates!
    # =========================================================================
    verified_dims_by_comp: Dict[str, set] = {}
    for prof in report.competitor_profiles:
        c_key = prof.name.lower()
        verified_dims_by_comp[c_key] = set()
        for e in evidence:
            if c_key in e.competitor.lower() and e.citations:
                verified_dims_by_comp[c_key].add(e.dimension)
        for cit in report.verified_citations:
            if cit.dimension and cit.competitor and c_key in cit.competitor.lower():
                verified_dims_by_comp[c_key].add(cit.dimension)

        comp_dims = verified_dims_by_comp[c_key]
        if "user_sentiment" not in comp_dims:
            prof.user_sentiment = (
                "Data sentimen pengguna spesifik belum terverifikasi di sumber sitasi yang terindeks."
                if language == "id"
                else "Specific user sentiment data was not found in the indexed source citations."
            )
        if "go_to_market" not in comp_dims and "product_features" not in comp_dims:
            prof.market_positioning = (
                "Data posisi pasar & target segmen belum terverifikasi di sumber sitasi."
                if language == "id"
                else "Go-to-market positioning not verified in indexed citations."
            )
        if "pricing_model" not in comp_dims:
            prof.pricing_summary = (
                "Data harga resmi belum ditemukan di sumber sitasi yang terindeks."
                if language == "id"
                else "Official pricing data was not found in the indexed source citations."
            )

    # Reconcile Fact-Checker audit verdict with synthesized report:
    # Closed-world principle: The Fact-Checker is the sole authority on evidence completeness.
    # The Writer synthesizes the report but must NEVER artificially inflate confidence_score.
    combined_tables = f"{report.feature_matrix_markdown}\n{report.pricing_matrix_markdown}".lower()
    has_unverified_cells = (
        "verification required" in combined_tables
        or "verifikasi diperlukan" in combined_tables
        or "official quote required" in combined_tables
        or "rincian resmi diperlukan" in combined_tables
        or "data not publicly disclosed" in combined_tables
        or "data tidak ditemukan" in combined_tables
        or "not verified in indexed sources" in combined_tables
        or "belum terverifikasi di sumber" in combined_tables
    )

    if verification:
        confidence_score = float(verification.confidence_score)
        # If the synthesized report has explicit unverified cells, ensure score reflects partial evidence
        if has_unverified_cells and confidence_score >= 80.0:
            confidence_score = 75.0

        audit_status = "verified" if confidence_score >= 80.0 else "partial_evidence"
        report.confidence_score = confidence_score
        report.audit_status = audit_status
        report.audit_critique = verification.critique
        report.missing_data_points = list(verification.missing_aspects or [])
    else:
        confidence_score = 75.0 if has_unverified_cells else 80.0
        audit_status = "verified" if confidence_score >= 80.0 else "partial_evidence"
        report.confidence_score = confidence_score
        report.audit_status = audit_status
        report.audit_critique = None
        report.missing_data_points = []

    reconciled_verification = VerificationVerdict(
        is_valid=bool(confidence_score >= 80.0 and audit_status == "verified"),
        confidence_score=confidence_score,
        critique=report.audit_critique or (
            "Seluruh dimensi riset (Fitur, Harga, Sentimen, dan Target Pasar) terverifikasi lengkap."
            if language == "id"
            else "All research dimensions (Features, Pricing, Sentiment, and GTM) verified completely."
        ),
        missing_aspects=report.missing_data_points or [],
        retry_search_queries=[]
    )

    if language == "id":
        status_label = "TERVERIFIKASI" if audit_status == "verified" else "BELUM TERVERIFIKASI PENUH"
        event_msg = f"Laporan intelijen '{report.title}' berhasil disusun (Status: {status_label}, Keyakinan: {confidence_score:.1f}%)."
    else:
        status_label = "VERIFIED" if audit_status == "verified" else "PARTIAL EVIDENCE"
        event_msg = f"Executive report '{report.title}' synthesized (Status: {status_label}, Confidence: {confidence_score:.1f}%)."

    event = {
        "node": "writer",
        "status": "completed",
        "message": event_msg,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "title": report.title,
            "profiles_count": len(report.competitor_profiles),
            "citations_count": len(report.verified_citations),
            "confidence_score": confidence_score,
            "audit_status": audit_status,
            "language": language
        }
    }

    return {
        "final_report": report,
        "verification": reconciled_verification,
        "status_updates": [event]
    }
