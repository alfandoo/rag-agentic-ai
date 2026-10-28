# StratAgent

Multi-agent research system that turns a market question into a sourced competitor briefing.

Ask "Cursor vs Windsurf vs GitHub Copilot" and four agents plan the research, search and scrape the web, fact-check their own evidence, and write a report. Every claim links back to a source. A follow-up chat answers questions from the indexed sources.

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2+-orange?logo=langchain)](https://langchain.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## What it does

1. **Plan**: the planner splits the question into research subtasks.
2. **Research**: the researcher searches (Google grounding, then Tavily, then DuckDuckGo), scrapes pages and indexes them in ChromaDB.
3. **Check**: the fact-checker scores the evidence. Below 80% confidence, it sends the researcher back with targeted queries (up to 2 retries).
4. **Write**: the writer produces the report. Unverified numbers are flagged, not invented.

Progress streams to the browser over SSE. Reports export to Markdown and PDF.

## Design decisions

- **Self-correcting loop, not a linear chain.** A LangGraph state machine routes back to research when evidence is weak.
- **Dual LLM with failover.** Gemini is primary. Groq takes over on `429` or `503`.
- **Typed handoffs.** Pydantic v2 models (`ResearchPlan`, `VerificationVerdict`, `CompetitorReport`) sit between agents, so a malformed LLM output fails fast instead of reaching the report.
- **Guardrails before research.** Off-topic, jailbreak and raw-math requests are rejected before any search runs.
- **Per-IP and global rate limits** on research runs and chat, since each run spends paid API quota.

## Stack

Python 3.12, FastAPI, LangGraph, ChromaDB, Pydantic v2 · Next.js 16, TypeScript, Tailwind CSS · Gemini, Groq (GPT-OSS 120B) · Docker, Caddy · Langfuse (optional tracing)

## Run it

Needs a Gemini key and a Groq key. Both have free tiers.

```bash
cp backend/.env.example backend/.env   # add GEMINI_API_KEY and GROQ_API_KEY
docker compose up --build
```

Open http://localhost:3000. Or run without Docker:

```bash
# terminal 1
pip install -r backend/requirements.txt
python backend/run.py

# terminal 2
cd frontend && npm install && npm run dev
```

API docs: http://localhost:8000/docs

## Tests

```bash
pytest backend/tests/ -v
```

42 tests cover schema validation, citation dedup, vector store caching, search fallback, scraper URL safety, graph routing, guardrails, rate limits, and the FastAPI endpoints (including SSE). Latest run: 42 passed.

## Configuration

Key variables. The full list is in `backend/.env.example`.

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | — | Primary LLM (required) |
| `GROQ_API_KEY` | — | Fallback LLM (required for failover) |
| `TAVILY_API_KEY` | — | Optional search provider |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins |
| `RESEARCH_RATE_LIMIT_PER_HOUR` | `5` | Research runs per IP per window |
| `RESEARCH_RATE_LIMIT_PER_DAY` | `20` | Research runs per day, all IPs |
| `CHAT_RATE_LIMIT_PER_HOUR` | `20` | Chat requests per IP per hour |

Rate limits live in process memory. They reset on restart and don't sync across instances.

## Production

Single VPS, Docker Compose, Caddy for HTTPS. The backend has no public port. Steps are in [DEPLOY.md](DEPLOY.md).

## Project layout

```text
backend/src/
  agents/   planner, researcher, fact-checker, writer, guardrails, LLM failover
  graph/    LangGraph workflow and routing
  tools/    search, scraper, vector store, language detection
  api/      FastAPI routes, rate limiting
  models/   Pydantic schemas and graph state
frontend/src/
  app/         dashboard, /about, /observability
  components/  AgentTimeline, ReportViewer, FollowUpChat, ...
```

## License

MIT. See [LICENSE](LICENSE).
