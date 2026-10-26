import json
import logging
from datetime import datetime
from typing import AsyncGenerator, List, Literal, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from backend.src.graph.workflow import stream_research_workflow, research_graph
from backend.src.models.state import MarketResearchState
from backend.src.agents.llm import get_llm

logger = logging.getLogger(__name__)

router = APIRouter()


class ResearchRequest(BaseModel):
    """Payload to initiate a market research workflow."""
    topic: str = Field(..., min_length=2, max_length=300, description="Competitor, product, or market query")
    max_iterations: int = Field(default=2, ge=1, le=3, description="Maximum self-correction loops allowed")
    language: str = Field(default="en", description="Output report language: 'en' or 'id'")


class ChatMessage(BaseModel):
    """A message in the follow-up conversational thread."""
    role: Literal["user", "assistant", "system"]
    content: str


class FollowUpChatRequest(BaseModel):
    """Payload for conversational follow-up questions after report generation."""
    topic: str = Field(..., description="The original research topic")
    report_context: str = Field(..., description="Markdown or text summary of the generated intelligence report")
    messages: List[ChatMessage] = Field(..., min_length=1, description="Conversation history including latest question")
    language: str = Field(default="en", description="Output language: 'en' or 'id'")


@router.get("/health")
async def health_check():
    """Health check endpoint for container orchestrators and monitoring."""
    return {
        "status": "healthy",
        "service": "market-intelligence-agent",
        "timestamp": datetime.utcnow().isoformat()
    }


async def event_generator(topic: str, max_iterations: int, language: str = "en") -> AsyncGenerator[dict, None]:
    """Generates Server-Sent Events (SSE) from the streaming LangGraph workflow."""
    yield {
        "event": "start",
        "data": json.dumps({
            "topic": topic,
            "language": language,
            "message": f"Market Intelligence Pipeline initialized for '{topic}' [{language.upper()}]",
            "timestamp": datetime.utcnow().isoformat()
        })
    }

    try:
        async for step in stream_research_workflow(topic=topic, max_iterations=max_iterations, language=language):
            node_name = step.get("node", "unknown")
            update_data = step.get("update", {})

            # 1. Stream granular status log events
            for status_event in update_data.get("status_updates", []):
                yield {
                    "event": "status",
                    "data": json.dumps(status_event)
                }

            # 2. Stream artifact-specific events based on node completion
            if node_name == "planner" and "plan" in update_data:
                yield {
                    "event": "plan",
                    "data": update_data["plan"].model_dump_json()
                }
            elif node_name == "researcher":
                evidence_summary = {
                    "collected_evidence_count": len(update_data.get("collected_evidence", [])),
                    "citations_count": len(update_data.get("citations", [])),
                    "citations": [c.model_dump() for c in update_data.get("citations", [])]
                }
                yield {
                    "event": "evidence",
                    "data": json.dumps(evidence_summary)
                }
            elif node_name == "fact_checker" and "verification" in update_data:
                yield {
                    "event": "verification",
                    "data": update_data["verification"].model_dump_json()
                }
            elif node_name == "writer" and "final_report" in update_data:
                yield {
                    "event": "report",
                    "data": update_data["final_report"].model_dump_json()
                }

        yield {
            "event": "complete",
            "data": json.dumps({
                "status": "success",
                "message": "Market Intelligence Report generation complete.",
                "timestamp": datetime.utcnow().isoformat()
            })
        }

    except Exception as exc:
        logger.error(f"Error during SSE stream: {exc}", exc_info=True)
        yield {
            "event": "error",
            "data": json.dumps({
                "status": "error",
                "message": str(exc),
                "timestamp": datetime.utcnow().isoformat()
            })
        }


@router.get("/api/research/stream")
async def stream_research_get(
    topic: str = Query(..., min_length=2, max_length=300),
    max_iterations: int = Query(default=2, ge=1, le=3),
    language: str = Query(default="en", regex="^(en|id)$")
):
    """
    GET endpoint for Server-Sent Events (SSE).
    Allows native EventSource API connections from browsers and Next.js frontend.
    """
    return EventSourceResponse(event_generator(topic=topic, max_iterations=max_iterations, language=language))


@router.post("/api/research/stream")
async def stream_research_post(request: ResearchRequest):
    """
    POST endpoint for Server-Sent Events (SSE).
    """
    return EventSourceResponse(event_generator(topic=request.topic, max_iterations=request.max_iterations, language=request.language))


@router.post("/api/research/run")
async def run_research_sync(request: ResearchRequest):
    """
    Synchronous execution endpoint. Runs the full LangGraph pipeline and returns
    the finalized structured report as a standard JSON response.
    """
    initial_state: MarketResearchState = {
        "topic": request.topic,
        "language": request.language,
        "plan": None,
        "collected_evidence": [],
        "citations": [],
        "verification": None,
        "iteration_count": 0,
        "max_iterations": request.max_iterations,
        "final_report": None,
        "status_updates": [],
        "error": None
    }

    try:
        final_state = await research_graph.ainvoke(initial_state)
        if not final_state.get("final_report"):
            raise HTTPException(status_code=500, detail="Failed to synthesize final report.")
        return final_state["final_report"]
    except Exception as exc:
        logger.error(f"Error running research pipeline: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


# =========================================================================
# Conversational Follow-up Chat Endpoints (Chatbot with Research Context)
# =========================================================================

async def chat_event_generator(request: FollowUpChatRequest) -> AsyncGenerator[dict, None]:
    """Streams conversational follow-up tokens from the LLM."""
    if request.language == "id":
        system_instruction = (
            f"Anda adalah Asisten Strategis Intelijen Pasar yang cerdas dan analitis. "
            f"Pengguna telah menerima laporan riset pasar mendalam mengenai topik: '{request.topic}'.\n\n"
            f"Berikut adalah dokumen ringkasan laporan riset yang telah diverifikasi:\n{request.report_context}\n\n"
            f"TUGAS ANDA: Jawab pertanyaan lanjutan pengguna secara interaktif, percakapan (seperti chatbot ahli), "
            f"namun tetap tajam, berbasis data, dan bernilai bisnis tinggi. "
            f"Jawab sepenuhnya dalam Bahasa Indonesia yang profesional dan ramah. "
            f"Gunakan poin-poin atau tabel Markdown jika mempermudah perbandingan."
        )
    else:
        system_instruction = (
            f"You are an expert Market Intelligence AI Strategist. "
            f"The user has already generated an in-depth competitor intelligence dossier on the topic: '{request.topic}'.\n\n"
            f"Here is the verified research report dossier:\n{request.report_context}\n\n"
            f"YOUR TASK: Answer the user's follow-up questions conversationally and insightfully, grounded in the research report. "
            f"Maintain an executive, helpful, and analytical tone. Use Markdown bullet points or tables where appropriate."
        )

    langchain_messages = [SystemMessage(content=system_instruction)]
    for m in request.messages:
        if m.role == "user":
            langchain_messages.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            langchain_messages.append(AIMessage(content=m.content))

    try:
        llm = get_llm(temperature=0.3)
        async for chunk in llm.astream(langchain_messages):
            # Extract content from chunk (handling string or list of content parts)
            content_piece = ""
            if isinstance(chunk.content, str):
                content_piece = chunk.content
            elif isinstance(chunk.content, list):
                for part in chunk.content:
                    if isinstance(part, str):
                        content_piece += part
                    elif isinstance(part, dict) and "text" in part:
                        content_piece += part["text"]

            if content_piece:
                yield {
                    "event": "token",
                    "data": json.dumps({"token": content_piece})
                }

        yield {
            "event": "done",
            "data": json.dumps({"status": "completed"})
        }

    except Exception as exc:
        logger.error(f"Error streaming follow-up chat: {exc}", exc_info=True)
        fallback_reply = (
            f"Berdasarkan laporan riset '{request.topic}', saya siap membantu menganalisis lebih jauh. "
            f"Silakan ajukan pertanyaan spesifik mengenai fitur, harga, atau strategi kompetitor tersebut."
            if request.language == "id"
            else f"Based on the research report for '{request.topic}', I can provide further details on pricing, features, or competitive positioning."
        )
        yield {
            "event": "token",
            "data": json.dumps({"token": fallback_reply})
        }
        yield {
            "event": "done",
            "data": json.dumps({"status": "completed"})
        }


@router.post("/api/research/chat/stream")
async def stream_follow_up_chat(request: FollowUpChatRequest):
    """
    Server-Sent Events endpoint for conversational follow-up questions grounded
    in the previously generated intelligence dossier.
    """
    return EventSourceResponse(chat_event_generator(request))


@router.post("/api/research/chat")
async def follow_up_chat_sync(request: FollowUpChatRequest):
    """
    Synchronous fallback endpoint for follow-up conversational answers.
    """
    tokens = []
    async for event in chat_event_generator(request):
        if event.get("event") == "token":
            data = json.loads(event["data"])
            tokens.append(data.get("token", ""))
    return {"reply": "".join(tokens)}
