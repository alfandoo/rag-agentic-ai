import os
from typing import List
from pydantic import Field
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

    # LLM Settings
    gemini_api_key: str = Field(default="", description="Google Gemini API Key")
    gemini_model: str = Field(default="gemini-3.5-flash", description="Gemini model name")

    # Search APIs
    tavily_api_key: str = Field(default="", description="Tavily Search API key")

    # Observability (Langfuse)
    langfuse_public_key: str = Field(default="", description="Langfuse Public Key")
    langfuse_secret_key: str = Field(default="", description="Langfuse Secret Key")
    langfuse_host: str = Field(default="https://cloud.langfuse.com", description="Langfuse Host URL")

    # ChromaDB Vector Store
    chroma_persist_directory: str = Field(default="./chroma_data", description="Local ChromaDB storage path")
    chroma_collection_name: str = Field(default="competitor_research", description="Default Chroma collection name")

    # Backend Server
    backend_host: str = Field(default="0.0.0.0", description="API Host")
    backend_port: int = Field(default=8000, description="API Port")
    allowed_origins: str = Field(default="http://localhost:3000", description="Comma-separated CORS origins")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


# Global singleton settings instance
settings = Settings()
