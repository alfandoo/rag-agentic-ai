import logging
from datetime import datetime
from typing import Dict, Any, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig
from backend.src.models.state import MarketResearchState
from backend.src.models.schemas import ResearchPlan, CompetitorFocus, ResearchSubtask
from backend.src.agents.llm import get_structured_llm

logger = logging.getLogger(__name__)

PLANNER_SYSTEM_PROMPT = """You are a Principal Market Intelligence Strategist.
Your mission is to analyze the user's market inquiry and construct a rigorous, actionable research plan.

Instructions:
1. Identify 2 to 4 key competitors or primary market players based on the user's request.
   - ALWAYS populate the `website` field for each competitor with their official root domain (e.g., "supabase.com", "firebase.google.com", "neon.tech", "stripe.com", "xendit.co").
2. Formulate targeted subtasks covering these 4 core dimensions:
   - product_features: Core features, technical architecture, and differentiators.
   - pricing_model: Specific pricing tiers, freemium limits, and enterprise pricing from official pricing pages.
   - user_sentiment: Real user sentiment, customer complaints (from Reddit/G2/reviews), and praise.
   - go_to_market: Target customer segment and strategic positioning.
3. For each subtask, generate 2-3 concise, high-intent English search queries (4-8 words max per query) that target official documentation/pricing pages as well as independent benchmarks.
4. Formulate 2-3 clear hypotheses that the research should validate or refute.
5. STRICT LANGUAGE RULE: {language_directive} (Note: keep `search_queries` in English or target market terms so search engines return official product pages accurately).
"""


def market_planner_node(state: MarketResearchState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    """
    Market Planner Agent Node in LangGraph.
    Translates raw research topic into a structured ResearchPlan in the requested language.
    """
    topic = state.get("topic", "")
    language = state.get("language", "en")
    logger.info(f"[Planner Agent] Formulating plan for topic: '{topic}' (Language: {language})")

    language_directive = (
        "Output all explanations, subtask goals, expected_findings, and key_hypotheses in formal, fluent Indonesian (Bahasa Indonesia baku)."
        if language == "id"
        else "Output all explanations, subtask goals, expected_findings, and key_hypotheses in professional English."
    )

    structured_llm = get_structured_llm(ResearchPlan, temperature=0.1)

    prompt = ChatPromptTemplate.from_messages([
        ("system", PLANNER_SYSTEM_PROMPT),
        ("human", "Research Topic / Question: {topic}\nTarget Output Language: {language}")
    ])

    chain = prompt | structured_llm

    try:
        plan: ResearchPlan = chain.invoke({
            "topic": topic,
            "language": "Indonesian" if language == "id" else "English",
            "language_directive": language_directive
        }, config=config)
    except Exception as exc:
        logger.error(f"[Planner Agent] LLM plan generation error: {exc}")
        import re
        extracted_names = [p.strip() for p in re.split(r'\b(?:vs|dan|and|versus)\b', topic, flags=re.IGNORECASE) if len(p.strip()) > 1]
        if not extracted_names or len(extracted_names) == 1:
            extracted_names = ["Pemain Dominan A", "Penantang Pasar B"] if language == "id" else ["Market Leader A", "Challenger B"]

        if language == "id":
            plan = ResearchPlan(
                market_domain=topic,
                competitors=[
                    CompetitorFocus(name=cname, category="Pemain Kunci Industri", core_value_prop=f"Penyedia solusi di sektor {topic}")
                    for cname in extracted_names[:3]
                ],
                subtasks=[
                    ResearchSubtask(
                        subtask_id="task_1",
                        focus_dimension="pricing_model",
                        competitor_target=extracted_names[0],
                        search_queries=[f"{extracted_names[0]} harga paket biaya", f"{topic} model harga"],
                        expected_findings="Model penetapan harga dan batasan tier gratis"
                    ),
                    ResearchSubtask(
                        subtask_id="task_2",
                        focus_dimension="product_features",
                        competitor_target=extracted_names[0],
                        search_queries=[f"{extracted_names[0]} fitur utama", f"{topic} perbandingan solusi"],
                        expected_findings="Perbandingan kapabilitas dan diferensiasi fitur utama"
                    )
                ],
                key_hypotheses=[f"{topic} memiliki dinamika kompetitif yang berkembang pesat."]
            )
        else:
            plan = ResearchPlan(
                market_domain=topic,
                competitors=[
                    CompetitorFocus(name=cname, category="Industry Key Player", core_value_prop=f"Solution provider in {topic}")
                    for cname in extracted_names[:3]
                ],
                subtasks=[
                    ResearchSubtask(
                        subtask_id="task_1",
                        focus_dimension="pricing_model",
                        competitor_target=extracted_names[0],
                        search_queries=[f"{extracted_names[0]} pricing tiers cost", f"{topic} cost structure"],
                        expected_findings="Pricing models and subscription tiers"
                    ),
                    ResearchSubtask(
                        subtask_id="task_2",
                        focus_dimension="product_features",
                        competitor_target=extracted_names[0],
                        search_queries=[f"{extracted_names[0]} core features", f"{topic} comparison"],
                        expected_findings="Core feature comparison"
                    )
                ],
                key_hypotheses=[f"{topic} has rapidly evolving competitive dynamics."]
            )

    event_msg = (
        f"Perencana menyusun rencana riset untuk '{plan.market_domain}' mencakup {len(plan.competitors)} kompetitor dan {len(plan.subtasks)} sub-tugas."
        if language == "id"
        else f"Strategist formulated plan for '{plan.market_domain}' analyzing {len(plan.competitors)} competitors across {len(plan.subtasks)} subtasks."
    )

    event = {
        "node": "planner",
        "status": "completed",
        "message": event_msg,
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "competitors": [c.name for c in plan.competitors],
            "subtask_count": len(plan.subtasks),
            "language": language
        }
    }

    return {
        "plan": plan,
        "status_updates": [event]
    }
