import logging
import time
import uuid
from fastapi import FastAPI, Request
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
    description="Production-grade Multi-Agent System powered by LangGraph, ChromaDB, Google Gemini, and Groq.",
    version="1.2.0"
)

# Configure CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time-Ms"],
)


@app.middleware("http")
async def request_telemetry_middleware(request: Request, call_next):
    """Attaches unique Request-ID and execution latency headers to every HTTP response."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start_time = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"
    return response


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
