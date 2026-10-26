import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.src.config.settings import settings
from backend.src.api.routes import router

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("market_intelligence_api")

app = FastAPI(
    title="Market & Competitor Intelligence Agent API",
    description="Production-grade Multi-Agent System powered by LangGraph, ChromaDB, and Google Gemini.",
    version="1.0.0"
)

# Configure CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


@app.get("/")
def root():
    return {
        "name": "Market & Competitor Intelligence Agent API",
        "docs": "/docs",
        "health": "/health",
        "streaming_endpoint": "/api/research/stream"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.src.api.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True
    )
