import logging
from typing import Type, TypeVar, Optional, Any
from pydantic import BaseModel
from langchain_core.language_models.chat_models import BaseChatModel
from backend.src.config.settings import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def get_llm(temperature: float = 0.2) -> BaseChatModel:
    """
    Factory function to initialize the configured LLM.
    Defaults to Google Gemini (gemini-2.5-flash / gemini-1.5-flash) via langchain-google-genai.
    """
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY is not set. Real LLM calls will fail without a valid key.")

    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key or "DUMMY_KEY_FOR_INIT",
        temperature=temperature,
        max_retries=2
    )


def get_structured_llm(schema: Type[T], temperature: float = 0.1) -> Any:
    """
    Binds a Pydantic schema to the LLM to guarantee structured output.
    """
    llm = get_llm(temperature=temperature)
    return llm.with_structured_output(schema)
