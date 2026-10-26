# 🚀 StratAgent: Autonomous Market & Competitor Intelligence System

> **Production-Grade Multi-Agent System** with self-correcting research loops, in-memory ChromaDB RAG, cascading Tri-Search grounding, and real-time SSE streaming.

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2+-orange?logo=langchain)](https://langchain.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-red)](https://trychroma.com)
[![Google Gemini](https://img.shields.io/badge/LLM-Gemini_Flash-4285F4?logo=google)](https://aistudio.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 Executive Summary

Modern product managers, market analysts, and founders spend dozens of hours manually auditing competitor pricing, feature matrices, user complaints, and release notes. 

**StratAgent** is an autonomous multi-agent intelligence platform built with **LangGraph**, **ChromaDB**, and **Google Gemini**. Given a market question (e.g., *"Cursor vs Windsurf vs GitHub Copilot"*), four specialized autonomous agents collaborate in a state machine to plan, gather, audit, and synthesize an executive-grade market briefing with verified source citations.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User([User / Browser UI]) -->|1. Submit Query| NextJS[Next.js 16 Frontend App]
    NextJS -->|2. SSE Connection EventSource| FastAPI[FastAPI Backend Server]
    
    subgraph MultiAgentEngine [LangGraph Orchestration Engine]
        Planner[1. Market Planner Node] -->|ResearchPlan Schema| Researcher[2. Intelligence Researcher]
        
        subgraph DataTools [Tool Layer & Context Gathering]
            Researcher -->|Primary| Google[Google Search Grounding]
            Researcher -->|Fallback 1| Tavily[Tavily Search API]
            Researcher -->|Fallback 2| DDG[DuckDuckGo Zero-Key Search]
            Researcher -->|Scrape & Clean| Scraper[Trafilatura / BeautifulSoup]
            Scraper -->|Semantic Chunking| Chroma[(ChromaDB Vector Store)]
            Chroma -->|Targeted RAG Retrieval| Researcher
        end
        
        Researcher -->|Collected Evidence| FactChecker{3. Fact-Checker & Auditor}
        
        FactChecker -->|Score < 80% & Iteration < Max| Researcher
        FactChecker -->|Score >= 80% Verified| Writer[4. Executive Writer Node]
    end
    
    Writer -->|CompetitorReport Schema| FastAPI
    FastAPI -->|Live Event Streaming: status, plan, report| NextJS
    NextJS -->|3. Interactive Dashboard & Export PDF| User
```

---

## 🔄 Self-Correction State Machine Flow

Unlike linear LLM chains or consumer chatbots that hallucinate when data is missing, **StratAgent** enforces an audited feedback loop:

```mermaid
stateDiagram-v2
    [*] --> Planner: User Query Received
    Planner --> Researcher: 4-Dimension Subtasks Formulated
    
    state Researcher {
        [*] --> TriSearch: Query Google/Tavily/DDG
        TriSearch --> Ingestion: Scrape Top URLs
        Ingestion --> ChromaRAG: Semantic Index & Similarity Search
        ChromaRAG --> [*]
    }
    
    Researcher --> FactChecker: Evaluate Gathered Evidence
    
    state FactChecker {
        [*] --> ConfidenceAudit: Calculate Score (0-100)
        ConfidenceAudit --> Decision
    }
    
    FactChecker --> Researcher: [Score < 80% & Iterations < 2] Retry with Targeted Queries
    FactChecker --> Writer: [Score >= 80% or Limit Reached] Approved
    
    Writer --> [*]: Synthesize Final CompetitorReport
```

---

## ✨ Production-Grade Engineering Highlights

| Pillar | Engineering Implementation | Why It Matters for Production |
| :--- | :--- | :--- |
| **Strict Type Safety** | **Pydantic v2** models (`ResearchPlan`, `VerificationVerdict`, `CompetitorReport`). | Guarantees zero format corruption between agent handoffs. |
| **Cascading Tri-Search** | Google Search Grounding ➡️ Tavily ➡️ DuckDuckGo fallback. | High search precision with zero-downtime tolerance when API quotas expire. |
| **In-Session RAG** | **ChromaDB** with recursive semantic text chunking. | Prevents LLM context overflow (*lost-in-the-middle*) when scraping multiple web pages. |
| **Cyclical Self-Correction** | LangGraph `route_fact_checker` conditional edge. | Automatically detects and re-researches vague or missing pricing/feature data. |
| **Real-time UX** | **FastAPI Server-Sent Events (SSE)** + **Next.js 16**. | Real-time agent status tracker and Perplexity-style thought visibility. |
| **Observability** | Native **Langfuse** callback integration. | Real-time tracking of latency, token expenses, and execution traces. |

---

## 📂 Project Structure

```text
rag-agentic-ai/
├── backend/
│   ├── src/
│   │   ├── config/          # Pydantic Settings & environment variables
│   │   ├── models/          # Schemas (Pydantic v2) and LangGraph State
│   │   ├── tools/           # Tri-Search, Web Scraper, ChromaDB RAG
│   │   ├── agents/          # Planner, Researcher, Fact-Checker, Writer
│   │   ├── graph/           # LangGraph StateGraph & conditional routing
│   │   └── api/             # FastAPI application & SSE endpoints
│   ├── tests/               # 11 unit & integration tests (100% passing)
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Backend container
│
├── frontend/                # Next.js 16 (App Router + Tailwind CSS)
│   ├── src/
│   │   ├── components/      # Navbar, TopicInput, AgentTimeline, ReportViewer
│   │   ├── types/           # TypeScript interfaces matching backend models
│   │   └── app/             # Main dashboard page consuming SSE stream
│   ├── package.json
│   └── Dockerfile           # Frontend container
│
├── docker-compose.yml       # 1-command container orchestration
└── README.md                # Documentation & portfolio guide
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- Python 3.12+
- Node.js 20+
- Google Gemini API Key ([Get free key here](https://aistudio.google.com/app/apikey))

### 2. Environment Setup

Clone repository and configure environment:
```bash
# In backend directory
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Optional:
TAVILY_API_KEY=your_tavily_key
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
```

### 3. Running Locally

#### Start the Backend (Terminal 1):
```bash
# Dari folder root project (f:\rag-agentic-ai):
python -m uvicorn backend.src.api.main:app --host 0.0.0.0 --port 8000 --reload

# Atau jika Anda sedang berada di dalam folder backend/:
python run.py
```
*Backend Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)*

#### Start the Frontend (Terminal 2):
```bash
cd frontend
npm install
npm run dev
```
*Frontend Dashboard: [http://localhost:3000](http://localhost:3000)*

---

### 4. Running with Docker Compose

Deploy the entire stack in one command:
```bash
docker compose up --build
```

---

## 🧪 Automated Testing

StratAgent includes 11 automated test suites covering data validation, vector store operations, search failover, graph routing, and API endpoints:

```bash
# Run tests from project root
$env:PYTHONPATH="."
python -m pytest backend/tests/ -v
```

**Results:**
```text
backend/tests/test_schemas.py::test_research_plan_schema PASSED
backend/tests/test_schemas.py::test_verification_verdict_confidence_boundaries PASSED
backend/tests/test_schemas.py::test_update_citations_deduplication PASSED
backend/tests/test_tools.py::test_chunk_text PASSED
backend/tests/test_tools.py::test_chroma_vector_store PASSED
backend/tests/test_tools.py::test_duckduckgo_fallback_search PASSED
backend/tests/test_graph.py::test_graph_compilation PASSED
backend/tests/test_graph.py::test_conditional_loop_routing PASSED
backend/tests/test_api.py::test_root_endpoint PASSED
backend/tests/test_api.py::test_health_check_endpoint PASSED
backend/tests/test_api.py::test_stream_endpoint_initialization PASSED

======================== 11 passed in 19.96s ========================
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
