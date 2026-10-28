import os
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables or .env file.
    Follows 12-factor app principles with strict type safety.
    """
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # LLM Settings (Primary: Gemini, Fallback: Groq)
    gemini_api_key: str = Field(default="", description="Google Gemini API Key")
    gemini_model: str = Field(default="gemini-3.1-flash-lite", description="Gemini model name")

    groq_api_key: str = Field(default="", description="Groq API Key (Fallback provider)")
    groq_model: str = Field(default="openai/gpt-oss-120b", description="Groq model name")

    # Search APIs
    tavily_api_key: str = Field(default="", description="Tavily Search API key")

    # Observability (Langfuse)
    langfuse_public_key: str = Field(default="", description="Langfuse Public Key")
    langfuse_secret_key: str = Field(default="", description="Langfuse Secret Key")
    langfuse_host: str = Field(default="http://localhost:3001", description="Langfuse Host URL")

    # ChromaDB Vector Store
    chroma_persist_directory: str = Field(default="./chroma_data", description="Local ChromaDB storage path")
    chroma_collection_name: str = Field(default="competitor_research", description="Default Chroma collection name")

    # Backend Server
    backend_host: str = Field(default="127.0.0.1", description="API Host (localhost only by default)")
    backend_port: int = Field(default=8000, description="API Port")
    allowed_origins: str = Field(default="http://localhost:3000", description="Comma-separated CORS origins")

    # Abuse protection (in-memory, per process)
    rate_limit_enabled: bool = Field(default=True, description="Enable research/chat rate limits")
    research_rate_limit_per_hour: int = Field(default=5, description="Research starts per IP per window")
    research_rate_limit_window_hours: int = Field(default=5, description="Research rate-limit window in hours")
    research_rate_limit_per_day: int = Field(default=20, description="Research starts per day across all IPs")
    chat_rate_limit_per_hour: int = Field(default=20, description="Chat requests per IP per hour")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @field_validator("langfuse_host")
    @classmethod
    def normalize_langfuse_host(cls, value: str) -> str:
        # The Langfuse SDK falls back to Langfuse Cloud when no host is given.
        return value.strip() or "http://localhost:3001"


# Global singleton settings instance
settings = Settings()
