import logging
from datetime import datetime
from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from backend.src.models.state import MarketResearchState
from backend.src.models.schemas import ResearchPlan, CompetitorFocus, ResearchSubtask
from backend.src.agents.llm import get_structured_llm

logger = logging.getLogger(__name__)

PLANNER_SYSTEM_PROMPT = """You are a Principal Market Intelligence Strategist.
Your mission is to analyze the user's market inquiry and construct a rigorous, actionable research plan.

Instructions:
1. Identify 2 to 4 key competitors or primary market players based on the user's request.
2. Formulate targeted subtasks covering these 4 core dimensions:
   - product_features: Core features, technical architecture, and differentiators.
   - pricing_model: Specific pricing tiers, freemium limits, and enterprise pricing.
   - user_sentiment: Real user sentiment, customer complaints (from Reddit/G2/reviews), and praise.
   - go_to_market: Target customer segment and strategic positioning.
3. For each subtask, generate 2-3 specific, high-intent search queries.
4. Formulate 2-3 clear hypotheses that the research should validate or refute.
5. STRICT LANGUAGE RULE: {language_directive}
"""


def market_planner_node(state: MarketResearchState) -> Dict[str, Any]:
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
        })
    except Exception as exc:
        logger.error(f"[Planner Agent] LLM plan generation error: {exc}")
        if language == "id":
            plan = ResearchPlan(
                market_domain=topic,
                competitors=[CompetitorFocus(name=topic, category="Sektor Pasar", core_value_prop="Objek utama riset intelijen pasar")],
                subtasks=[
                    ResearchSubtask(
                        subtask_id="task_1",
                        focus_dimension="pricing_model",
                        competitor_target=topic,
                        search_queries=[f"{topic} pricing tiers cost", f"{topic} harga paket biaya"],
                        expected_findings="Model penetapan harga dan batasan tier gratis"
                    ),
                    ResearchSubtask(
                        subtask_id="task_2",
                        focus_dimension="product_features",
                        competitor_target=topic,
                        search_queries=[f"{topic} key features architecture", f"{topic} fitur utama perbandingan"],
                        expected_findings="Perbandingan kapabilitas dan diferensiasi fitur utama"
                    )
                ],
                key_hypotheses=[f"{topic} memiliki posisi kompetitif yang kuat di industrinya."]
            )
        else:
            plan = ResearchPlan(
                market_domain=topic,
                competitors=[CompetitorFocus(name=topic, category="Market Sector", core_value_prop="Primary subject of analysis")],
                subtasks=[
                    ResearchSubtask(
                        subtask_id="task_1",
                        focus_dimension="pricing_model",
                        competitor_target=topic,
                        search_queries=[f"{topic} pricing tiers cost", f"{topic} free tier limits"],
                        expected_findings="Pricing models and subscription tiers"
                    ),
                    ResearchSubtask(
                        subtask_id="task_2",
                        focus_dimension="product_features",
                        competitor_target=topic,
                        search_queries=[f"{topic} key features architecture", f"{topic} alternatives comparison"],
                        expected_findings="Core feature comparison"
                    )
                ],
                key_hypotheses=[f"{topic} has competitive market positioning."]
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
