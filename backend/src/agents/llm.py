import logging
from typing import Type, TypeVar, Optional, Any
from pydantic import BaseModel
from langchain_core.language_models.chat_models import BaseChatModel
from backend.src.config.settings import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def get_gemini_llm(temperature: float = 0.2) -> BaseChatModel:
    """Initializes Google Gemini as Primary LLM Provider."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key or "DUMMY_KEY_FOR_INIT",
        temperature=temperature,
        max_retries=1
    )


RETIRED_GROQ_MODELS = ("llama-3.3-70b-versatile", "llama3-70b-8192", "llama-3.1-70b-versatile")


def resolve_groq_model(model: str) -> str:
    """Maps retired Groq model IDs (still possible in .env) to the current fallback model."""
    return "openai/gpt-oss-120b" if model in RETIRED_GROQ_MODELS else model


def get_groq_llm(temperature: float = 0.2, model_override: Optional[str] = None) -> Optional[BaseChatModel]:
    """Initializes Groq (openai/gpt-oss-120b) as High-Speed Fallback LLM Provider."""
    if not settings.groq_api_key:
        return None

    configured_model = resolve_groq_model(model_override or settings.groq_model)

    try:
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=configured_model,
            groq_api_key=settings.groq_api_key,
            temperature=temperature,
            max_retries=2
        )
    except Exception as exc:
        logger.warning(f"Could not initialize Groq fallback LLM: {exc}")
        return None


def get_llm(temperature: float = 0.2) -> BaseChatModel:
    """
    Factory function for resilient multi-provider LLM execution.
    Primary: Google Gemini (gemini-3.1-flash-lite)
    Fallback: Groq (openai/gpt-oss-120b)
    If Gemini throws 429 Resource Exhausted or 503 Unavailable, LangChain automatically fails over to Groq.
    """
    primary_llm = get_gemini_llm(temperature=temperature)
    fallback_llm = get_groq_llm(temperature=temperature)

    if fallback_llm:
        logger.info(f"LLM configured with Multi-Provider Fallback: {settings.gemini_model} ➡️ Groq ({fallback_llm.model_name})")
        return primary_llm.with_fallbacks([fallback_llm])

    return primary_llm


def get_structured_llm(schema: Type[T], temperature: float = 0.1) -> Any:
    """
    Binds a Pydantic schema to the LLM with automatic multi-provider fallback.
    If Gemini structured output fails (429/503), automatically retries with Groq JSON Schema mode.
    """
    primary_llm = get_gemini_llm(temperature=temperature)
    primary_structured = primary_llm.with_structured_output(schema)

    fallback_llm = get_groq_llm(temperature=temperature)
    if fallback_llm:
        groq_structured = fallback_llm.with_structured_output(schema, method="json_schema")
        return primary_structured.with_fallbacks([groq_structured])

    return primary_structured
