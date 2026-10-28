export type Language = "en" | "id";

export interface Translations {
  navbar: {
    title: string;
    version: string;
    live: string;
    offline: string;
    audited: string;
    about: string;
    observability: string;
  };
  hero: {
    title: string;
    subtitle: string;
  };
  input: {
    placeholder: string;
    loops: string;
    buttonIdle: string;
    buttonRunning: string;
    buttonStop: string;
    presetsLabel: string;
    historyLabel: string;
    clearHistory: string;
  };
  pipeline: {
    title: string;
    completed: string;
    stepPrefix: string;
    confidence: string;
    loopPrefix: string;
    totalTime: string;
    eta: string;
    actualTime: string;
    elapsed: string;
    traceTitle: string;
    eventsCount: string;
    emptyTrace: string;
    blueprintTitle: string;
    blueprintCompetitors: string;
    blueprintHypotheses: string;
    blueprintSubtasks: string;
    stages: {
      planner: { label: string; role: string; eta: string };
      researcher: { label: string; role: string; eta: string };
      fact_checker: { label: string; role: string; eta: string };
      writer: { label: string; role: string; eta: string };
    };
  };
  report: {
    badge: string;
    copySummary: string;
    copiedSummary: string;
    exportMarkdown: string;
    printPdf: string;
    kpi: {
      competitors: string;
      swotPoints: string;
      verifiedSources: string;
      confidenceScore: string;
    };
    tabs: {
      overview: string;
      matrix: string;
      swot: string;
      sources: string;
    };
    sections: {
      executiveSummary: string;
      marketOverview: string;
      competitorProfiles: string;
      strategicRecommendations: string;
      featureMatrix: string;
      pricingMatrix: string;
      swotTitle: string;
      swotFilterAll: string;
      viewSwotButton: string;
      sourcesTitle: string;
      sourcesSubtitle: string;
      sourcesSearchPlaceholder: string;
      sourcesFilterAll: string;
      sourcesEmptyTitle: string;
      sourcesEmptyDesc: string;
      sourcesNoMatchTitle: string;
      sourcesNoMatchReset: string;
      pricingModel: string;
      goToMarket: string;
      userSentiment: string;
      keyFeatures: string;
      pros: string;
      cons: string;
      swotStrengths: string;
      swotWeaknesses: string;
      swotOpportunities: string;
      swotThreats: string;
      swotSubtitle: string;
      swotViewCards: string;
      swotViewMatrix: string;
      swotEmptyStrengths: string;
      swotEmptyWeaknesses: string;
      swotEmptyOpportunities: string;
      swotEmptyThreats: string;
      swotInternalPositive: string;
      swotInternalNegative: string;
      swotExternalPositive: string;
      swotExternalNegative: string;
    };
  };
  chat: {
    header: string;
    subtitle: string;
    placeholder: string;
    send: string;
    clearChat: string;
    copyReply: string;
    copiedReply: string;
    ragBadge: string;
    suggestionsLabel: string;
    suggestions: string[];
    waiting: string;
  };
  about: {
    modalTitle: string;
    modalBadge: string;
    close: string;
    tagline: string;
    tabs: {
      overview: string;
      architecture: string;
      innovations: string;
      stack: string;
    };
    overview: {
      title: string;
      summary: string;
      problemTitle: string;
      problemDesc: string;
      solutionTitle: string;
      solutionDesc: string;
      kpi1Title: string;
      kpi1Value: string;
      kpi1Desc: string;
      kpi2Title: string;
      kpi2Value: string;
      kpi2Desc: string;
      kpi3Title: string;
      kpi3Value: string;
      kpi3Desc: string;
      kpi4Title: string;
      kpi4Value: string;
      kpi4Desc: string;
    };
    architecture: {
      title: string;
      desc: string;
      agentsTitle: string;
      agent1Name: string;
      agent1Role: string;
      agent1Desc: string;
      agent2Name: string;
      agent2Role: string;
      agent2Desc: string;
      agent3Name: string;
      agent3Role: string;
      agent3Desc: string;
      agent4Name: string;
      agent4Role: string;
      agent4Desc: string;
      loopTitle: string;
      loopDesc: string;
    };
    innovations: {
      title: string;
      desc: string;
      items: Array<{
        title: string;
        badge: string;
        desc: string;
      }>;
    };
    stack: {
      title: string;
      desc: string;
      categories: Array<{
        category: string;
        items: string[];
      }>;
      footerNote: string;
    };
  };
  footer: string;
  footerAbout: string;
  footerObservability: string;
  observability: {
    modalTitle: string;
    modalBadge: string;
    close: string;
    refresh: string;
    refreshing: string;
    tagline: string;
    tabs: {
      telemetry: string;
      langfuse: string;
      slos?: string;
      inspector: string;
    };
    telemetry: {
      title: string;
      desc: string;
      backendStatus: string;
      onlineText: string;
      offlineText: string;
      llmEngine: string;
      llmPrimary: string;
      llmFallback: string;
      searchEngine: string;
      searchDesc: string;
      vectorEngine: string;
      vectorDesc: string;
      langfuseEngine: string;
      langfuseActive: string;
      langfuseInactive: string;
      cachedChunks: string;
      latencyMs: string;
    };
    slos: {
      title: string;
      desc: string;
      stages: Array<{
        name: string;
        target: string;
        p95: string;
        note: string;
        status: string;
      }>;
      gateTitle: string;
      gateDesc: string;
    };
    tracing: {
      title: string;
      desc: string;
      flowTitle: string;
      flowSteps: string[];
      metricsTitle: string;
      metricsDesc: string;
    };
    inspector: {
      title: string;
      desc: string;
      sessionTopic: string;
      eventsRecorded: string;
      loopIteration: string;
      confidenceScore: string;
      copyJson: string;
      copiedJson: string;
      noActiveSession: string;
    };
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    navbar: {
      title: "StratAgent",
      version: "v1.2 • research-engine",
      live: "Engine Online",
      offline: "API Offline",
      audited: "Fact-Audited",
      about: "About Portfolio",
      observability: "Observability"
    },
    hero: {
      title: "Market Intelligence Engine",
      subtitle: "Autonomous multi-agent research with self-correcting feedback loops, Tri-Search grounding, and verified SWOT synthesis."
    },
    input: {
      placeholder: "Search competitor, market sector, or product comparison...",
      loops: "Loops:",
      buttonIdle: "Research",
      buttonRunning: "Running",
      buttonStop: "Stop",
      presetsLabel: "Quick Presets:",
      historyLabel: "Recent Dossiers:",
      clearHistory: "Clear"
    },
    pipeline: {
      title: "Agent Pipeline:",
      completed: "Execution Completed",
      stepPrefix: "Step:",
      confidence: "Confidence:",
      loopPrefix: "Loop",
      totalTime: "Total time",
      eta: "ETA",
      actualTime: "Done",
      elapsed: "Elapsed",
      traceTitle: "Execution Trace Log",
      eventsCount: "events",
      emptyTrace: "Awaiting pipeline execution...",
      blueprintTitle: "Planner Research Blueprint",
      blueprintCompetitors: "Target Competitors",
      blueprintHypotheses: "Key Hypotheses Under Test",
      blueprintSubtasks: "Targeted Search Subtasks",
      stages: {
        planner: { label: "Planner", role: "Formulating dimensions", eta: "~5s" },
        researcher: { label: "Researcher", role: "Tri-Search & ChromaDB", eta: "15–25s" },
        fact_checker: { label: "Fact-Checker", role: "Auditing & Confidence score", eta: "3–5s" },
        writer: { label: "Synthesizer", role: "Executive dossier compilation", eta: "8–12s" }
      }
    },
    report: {
      badge: "Audited Intelligence Dossier",
      copySummary: "Copy Full .MD",
      copiedSummary: "Copied Dossier",
      exportMarkdown: "Export .MD",
      printPdf: "Export PDF",
      kpi: {
        competitors: "Competitors Analyzed",
        swotPoints: "SWOT Insights Mapped",
        verifiedSources: "Audited Web Sources",
        confidenceScore: "Audit Confidence"
      },
      tabs: {
        overview: "Executive Summary",
        matrix: "Comparison Matrices",
        swot: "SWOT Analysis",
        sources: "Sources"
      },
      sections: {
        executiveSummary: "1. Executive Summary",
        marketOverview: "2. Market Overview & Sector Dynamics",
        competitorProfiles: "3. Competitor Deep-Dives",
        strategicRecommendations: "4. Strategic Recommendations",
        featureMatrix: "Feature & Architecture Comparison Matrix",
        pricingMatrix: "Pricing & Subscription Tier Matrix",
        swotTitle: "SWOT Analysis",
        swotFilterAll: "All Competitors",
        viewSwotButton: "View SWOT",
        sourcesTitle: "Audited Citations & Grounding Sources",
        sourcesSubtitle: "Factual web sources scraped, chunked into ChromaDB, and audited during Tri-Search grounding:",
        sourcesSearchPlaceholder: "Filter citations by title, URL, or keyword...",
        sourcesFilterAll: "All Engines",
        sourcesEmptyTitle: "No Verified Sources Recorded",
        sourcesEmptyDesc: "No external web URLs were indexed for this report. Try running the research again or checking your search engine connection.",
        sourcesNoMatchTitle: "No citations match your current search or engine filter.",
        sourcesNoMatchReset: "Reset Filter",
        pricingModel: "Pricing & Commercial Model",
        goToMarket: "Go-To-Market & Target Segment",
        userSentiment: "User Sentiment & Community Feedback",
        keyFeatures: "Key Capabilities & Architecture",
        pros: "Strengths / Pros",
        cons: "Limitations / Cons",
        swotStrengths: "Strengths",
        swotWeaknesses: "Weaknesses",
        swotOpportunities: "Opportunities",
        swotThreats: "Threats",
        swotSubtitle: "4-Quadrant Strategic Analysis evaluating internal capabilities and external market dynamics.",
        swotViewCards: "Card View",
        swotViewMatrix: "Quadrant Matrix",
        swotEmptyStrengths: "No specific strengths identified in this cycle.",
        swotEmptyWeaknesses: "No specific weaknesses identified in this cycle.",
        swotEmptyOpportunities: "No specific opportunities identified in this cycle.",
        swotEmptyThreats: "No specific threats identified in this cycle.",
        swotInternalPositive: "Internal • Advantages",
        swotInternalNegative: "Internal • Limitations",
        swotExternalPositive: "External • Market Opportunities",
        swotExternalNegative: "External • Competitive Threats"
      }
    },
    chat: {
      header: "Dossier Debrief",
      subtitle: "Explore intelligence findings, probe competitor vulnerabilities, or draft tactical battlecards grounded in ChromaDB RAG.",
      placeholder: "Ask follow-up question (e.g., 'Compare GoPay vs OVO fees', 'Draft marketing battlecard')...",
      send: "Send",
      clearChat: "Clear",
      copyReply: "Copy",
      copiedReply: "Copied",
      ragBadge: "ChromaDB RAG",
      suggestionsLabel: "Follow-up Prompts:",
      suggestions: [
        "Compare pricing tiers in more detail",
        "What is the best strategy to beat the market leader?",
        "What are the primary regulatory and compliance risks?"
      ],
      waiting: "Analyzing evidence..."
    },
    about: {
      modalTitle: "About StratAgent",
      modalBadge: "Autonomous Multi-Agent System",
      close: "Close",
      tagline: "An automated AI-powered market intelligence and competitor research application. It coordinates 4 specialized agents using LangGraph to search live web sources, verify evidence, and synthesize comprehensive comparison dossiers with real citation links.",
      tabs: {
        overview: "Overview & Purpose",
        architecture: "4-Agent Workflow",
        innovations: "Core Highlights",
        stack: "Technology Stack"
      },
      overview: {
        title: "Motivation & Architecture Philosophy",
        summary: "This application was engineered to demonstrate how a specialized multi-agent architecture bridges the gap between general conversational AI and structured market research. Rather than relying on a single prompt, StratAgent distributes tasks across 4 dedicated agents (Planner, Researcher, Fact-Checker, and Writer) coordinated via LangGraph. By decoupling web investigation, evidence verification, and report synthesis, the system provides transparent, source-backed market analyses in structured matrices and downloadable PDF dossiers.",
        problemTitle: "Single-Turn Chat Prompts (General AI)",
        problemDesc: "1. Requires Complex Manual Prompting: To get a structured comparison, users must manually write long, specific prompts every time.\n2. Single-Pass Generation (No Audit Loop): Standard chat generates an answer in one pass without an independent auditor agent verifying if key evidence is complete.\n3. Ephemeral Chat Output: Answers remain as conversational chat text, requiring manual effort to format into tables or shareable documents.",
        solutionTitle: "Multi-Agent System Workflow (StratAgent)",
        solutionDesc: "1. Automated Orchestration from a Single Topic: Input a competitor topic, and the system autonomously decomposes it into 4 key research dimensions.\n2. Role Separation & Self-Correction: The Researcher and Fact-Checker operate independently. If evidence is lacking (confidence < 80%), the system automatically re-searches the web before writing.\n3. Executive-Ready Deliverable: Directly compiles structured feature matrices, pricing breakdowns, 4-quadrant SWOT, and instant one-click PDF downloads.",
        kpi1Title: "Automated Workflow",
        kpi1Value: "1–3 Minutes",
        kpi1Desc: "Full research pipeline orchestrated from a simple topic input without manual prompt crafting.",
        kpi2Title: "Research Scope",
        kpi2Value: "4 Key Dimensions",
        kpi2Desc: "Product features, pricing models, user reviews/sentiment, and target market positioning.",
        kpi3Title: "Quality Gate",
        kpi3Value: "80% Threshold",
        kpi3Desc: "If evidence is < 80%, the system re-searches the web. If still missing, it is explicitly flagged as 'Unverified in Sources' without guessing.",
        kpi4Title: "Structured Deliverable",
        kpi4Value: "Tables & PDF",
        kpi4Desc: "Feature comparison matrix, pricing breakdown, 4-quadrant SWOT, and instant PDF download.",
      },
      architecture: {
        title: "How the 4 AI Agents Work Together",
        desc: "The system uses LangGraph to coordinate tasks between agents. Each agent has a dedicated responsibility, mirroring a real-world research team.",
        agentsTitle: "The 4 Specialized Agents",
        agent1Name: "01. Planner Agent",
        agent1Role: "Research Strategist",
        agent1Desc: "Analyzes the user's topic, identifies the primary competitors to compare, and organizes research into 4 essential focus areas: product features, pricing tiers, user sentiment, and market strategy.",
        agent2Name: "02. Researcher Agent",
        agent2Role: "Web Investigator",
        agent2Desc: "Queries live web sources using Tri-Search (Tavily, DuckDuckGo, and Gemini Google Grounding), retrieves page content, extracts clean text with Trafilatura, and stores relevant text chunks into the ChromaDB vector store.",
        agent3Name: "03. Fact-Checker Agent",
        agent3Role: "Evidence Auditor",
        agent3Desc: "Evaluates whether gathered evidence sufficiently covers all 4 dimensions and calculates a confidence score (0–100%). If data is incomplete (score < 80%), it sends targeted retry queries back to the Researcher according to the user-selected loop limit (1x Fast, 2x Balanced, or 3x Deep).",
        agent4Name: "04. Writer Agent",
        agent4Role: "Report Synthesizer",
        agent4Desc: "Compiles all verified findings into an organized dossier: executive summary, competitor profiles, feature comparison table, pricing breakdown, 4-quadrant SWOT matrix, strategic takeaways, and citation links.",
        loopTitle: "Automated Self-Correction Loop",
        loopDesc: "If initial search findings are incomplete, the system does not give up or invent answers. It automatically re-runs targeted queries for missing areas up to the user-selected loop limit (1x–3x). If data is still unavailable across public sources after the chosen iterations, the report is compiled with those specific metrics explicitly flagged as 'Unverified in Sources'."
      },
      innovations: {
        title: "Key Capabilities & Engineering Features",
        desc: "Practical technical implementations that ensure the research workflow remains reliable, responsive, and verifiable.",
        items: [
          {
            title: "Multi-Source Web Search (Tri-Search)",
            badge: "Smart Search",
            desc: "Uses the Tavily Search API for targeted web crawling, with automatic fallback to DuckDuckGo and Google Grounding if the API is unavailable or rate-limited."
          },
          {
            title: "Local Vector Database (ChromaDB)",
            badge: "Semantic Storage",
            desc: "Stores extracted article text chunks into local ChromaDB storage on the server, enabling semantic similarity search for grounded follow-up Q&A."
          },
          {
            title: "Dual LLM Provider Support (Gemini + Groq)",
            badge: "Auto Failover",
            desc: "Uses Google Gemini as the primary language model, with automatic LangChain failover to Groq if Gemini encounters quota limits (429) or downtime."
          },
          {
            title: "Interactive Follow-Up Chat (Dossier Debrief)",
            badge: "Grounded Q&A",
            desc: "Allows users to ask specific follow-up questions about the generated dossier, protected by guardrails that keep the conversation focused on the research topic."
          },
          {
            title: "Real-Time Streaming (Server-Sent Events)",
            badge: "Live Updates",
            desc: "Streams agent progress, audit scores, and report generation live from the FastAPI backend to the browser without requiring manual page reloads."
          },
          {
            title: "Instant File Exports (.MD & .PDF)",
            badge: "One-Click Download",
            desc: "Export generated dossiers directly to clean Markdown (.md) or formatted PDF (.pdf) documents in the browser, ready for sharing and offline reading."
          }
        ]
      },
      stack: {
        title: "Technologies Used in This Project",
        desc: "A breakdown of the open-source libraries and frameworks powering the backend and frontend.",
        categories: [
          {
            category: "AI & Agent Orchestration",
            items: ["LangGraph (Agent State Machine)", "LangChain Core", "Google Gemini (gemini-3.1-flash-lite)", "Groq (openai/gpt-oss-120b)", "Tavily Search API", "DuckDuckGo Search (ddgs)", "Google Search Grounding (Gemini Tool)"]
          },
          {
            category: "Text Extraction & Storage",
            items: ["ChromaDB (Local Persistent Vector Store)", "Trafilatura (Web Content Extraction)", "BeautifulSoup4 (HTML Cleaning)", "Pydantic v2 (Strict Schema Validation)"]
          },
          {
            category: "Backend & Streaming",
            items: ["Python 3.11+", "FastAPI (Async Web Framework)", "SSE-Starlette (Real-Time Event Streaming)", "HTTPX (Async HTTP Client)", "Langfuse (Optional Tracing & Monitoring)"]
          },
          {
            category: "Frontend & User Interface",
            items: ["Next.js 16 (App Router)", "React 19", "TypeScript", "Tailwind CSS v4", "Lucide React (Icons)", "jsPDF & AutoTable (Direct PDF Export)"]
          }
        ],
        footerNote: "Built as an evidence-grounded multi-agent AI engineering portfolio demonstration."
      }
    },
    footer: "StratAgent • LangGraph Multi-Agent Architecture • Production AI Engineering Portfolio",
    footerAbout: "About This Portfolio",
    footerObservability: "Observability Console",
    observability: {
      modalTitle: "Observability & LLMOps Console",
      modalBadge: "Real-Time Telemetry • Langfuse • SLIs",
      close: "Close",
      refresh: "Refresh Telemetry",
      refreshing: "Pinging...",
      tagline: "Live system telemetry, multi-agent execution tracing, vector store cache analytics, and Langfuse LLMOps instrumentation.",
      tabs: {
        telemetry: "Metrics & Infrastructure",
        langfuse: "Langfuse LLMOps Metrics",
        slos: "Langfuse LLMOps Metrics",
        inspector: "Latest Session Inspector"
      },
      telemetry: {
        title: "Live Provider Health & Vector Storage Telemetry",
        desc: "Real-time connection status across LLM inference providers, search APIs, vector store cache, and Langfuse tracing instrumentation.",
        backendStatus: "FastAPI Engine Health",
        onlineText: "Connected (Live SSE)",
        offlineText: "Disconnected / Offline",
        llmEngine: "LLM Orchestration Providers",
        llmPrimary: "Primary: Google Gemini (gemini-3.1-flash-lite)",
        llmFallback: "Failover: Groq (openai/gpt-oss-120b)",
        searchEngine: "Grounding Search Engine",
        searchDesc: "Tri-Search: Tavily API + DuckDuckGo fallback + Google Grounding (Gemini) + Trafilatura Scraper",
        vectorEngine: "Vector Store Engine",
        vectorDesc: "ChromaDB Persistent Store on local server disk for semantic retrieval and debrief Q&A",
        langfuseEngine: "Langfuse Observability Tracing",
        langfuseActive: "Active (Telemetry Callbacks Registered)",
        langfuseInactive: "Standby (Ready with API Keys)",
        cachedChunks: "Indexed Vector Chunks in Storage",
        latencyMs: "API Ping Latency"
      },
      slos: {
        title: "Agent Execution Latency & Reliability SLIs",
        desc: "Service Level Indicators (SLIs) tracking execution duration, token latency budgets, and fact-checking confidence gating per pipeline stage.",
        stages: [
          {
            name: "01. Planner Agent",
            target: "3 - 5s",
            p95: "6.0s",
            note: "Decomposes topic into 4 research dimensions and verifies competitor domains.",
            status: "Nominal"
          },
          {
            name: "02. Researcher Agent",
            target: "15 - 25s",
            p95: "30.0s",
            note: "Tri-Search + Web scraping. Drops to <0.5s when Smart Vector Cache hits.",
            status: "Nominal"
          },
          {
            name: "03. Fact-Checker Agent",
            target: "3 - 5s",
            p95: "6.0s",
            note: "Audits evidence against Citation Matrix. Triggers retry if score < 80%.",
            status: "Nominal"
          },
          {
            name: "04. Executive Synthesizer",
            target: "8 - 12s",
            p95: "15.0s",
            note: "Synthesizes final dossier under strict closed-world zero-hallucination policy.",
            status: "Nominal"
          },
          {
            name: "05. Multi-Tier Guardrails",
            target: "< 1ms",
            p95: "2.0ms",
            note: "Deterministic regex heuristics intercepting prompt injections and off-topic queries.",
            status: "Active"
          }
        ],
        gateTitle: "Fact-Check Quality Gate (80.0% Threshold)",
        gateDesc: "If the Fact-Checker confidence score falls below 80.0%, LangGraph activates a conditional edge to re-dispatch the Researcher with targeted retry queries (up to max configured iterations) before synthesizing the final dossier."
      },
      tracing: {
        title: "Langfuse & OpenTelemetry Tracing Pipeline",
        desc: "Captures end-to-end lineage: user query, agent state transitions, LLM generation spans, prompt versions, token consumption, and cost tracking.",
        flowTitle: "Distributed Tracing Architecture",
        flowSteps: [
          "1. User Query & Session ID initiated via Next.js Frontend",
          "2. FastAPI Server-Sent Events stream initializes LangGraph StateGraph",
          "3. Langfuse CallbackHandler instruments each agent node as a nested trace span",
          "4. LLM calls log model parameters (temperature=0.1, model name, tokens consumed)",
          "5. ChromaDB similarity lookups log query embeddings and top-k retrieval latency",
          "6. Fact-Checker assigns audit verdict and confidence score into span metadata",
          "7. Final report synthesis logged with citation count and output token usage"
        ],
        metricsTitle: "Observed LLMOps Metrics",
        metricsDesc: "Token usage (Prompt / Completion / Total), Step Latency (p50 / p95 / p99), Error Rate & Fallback Triggers, Cost Accounting ($/run), and Citation Grounding Percentage."
      },
      inspector: {
        title: "Active Session Live Telemetry Inspector",
        desc: "Real-time instrumentation metrics collected during your active browser session.",
        sessionTopic: "Active Research Topic",
        eventsRecorded: "Trace Events Streamed",
        loopIteration: "Fact-Check Loop Iteration",
        confidenceScore: "Audit Confidence Score",
        copyJson: "Copy Raw Telemetry JSON",
        copiedJson: "Copied JSON",
        noActiveSession: "No active research run. Launch a research query above or click a preset to inspect real-time agent telemetry."
      }
    }
  },
  id: {
    navbar: {
      title: "StratAgent",
      version: "v1.2 • mesin-riset",
      live: "Mesin Aktif",
      offline: "API Terputus",
      audited: "Terverifikasi Fakta",
      about: "Tentang Portofolio",
      observability: "Observabilitas"
    },
    hero: {
      title: "Mesin Riset Intelijen Pasar",
      subtitle: "Riset multi-agent otonom dengan siklus koreksi diri (self-correcting loops), Tri-Search grounding, dan sintesis analisis SWOT tervalidasi."
    },
    input: {
      placeholder: "Cari kompetitor, sektor pasar, atau perbandingan produk...",
      loops: "Siklus:",
      buttonIdle: "Riset Pasar",
      buttonRunning: "Memproses",
      buttonStop: "Hentikan",
      presetsLabel: "Contoh Topik:",
      historyLabel: "Riwayat Riset:",
      clearHistory: "Hapus"
    },
    pipeline: {
      title: "Alur Eksekusi Agen:",
      completed: "Eksekusi Selesai",
      stepPrefix: "Langkah:",
      confidence: "Tingkat Keyakinan:",
      loopPrefix: "Siklus",
      totalTime: "Total waktu",
      eta: "ETA",
      actualTime: "Selesai",
      elapsed: "Berjalan",
      traceTitle: "Catatan Jejak Eksekusi Agen",
      eventsCount: "catatan",
      emptyTrace: "Menunggu eksekusi riset dimulai...",
      blueprintTitle: "Cetak Biru Rencana Riset (Planner Blueprint)",
      blueprintCompetitors: "Target Kompetitor",
      blueprintHypotheses: "Hipotesis Utama yang Diuji",
      blueprintSubtasks: "Sub-Tugas Pencarian Terfokus",
      stages: {
        planner: { label: "Perencana", role: "Memetakan dimensi riset", eta: "~5 dtk" },
        researcher: { label: "Periset", role: "Tri-Search & ChromaDB", eta: "15–25 dtk" },
        fact_checker: { label: "Pemeriksa Fakta", role: "Audit & Skor Validitas", eta: "3–5 dtk" },
        writer: { label: "Penyusun", role: "Sintesis berkas eksekutif", eta: "8–12 dtk" }
      }
    },
    report: {
      badge: "Berkas Intelijen Terverifikasi",
      copySummary: "Salin Laporan",
      copiedSummary: "Tersalin",
      exportMarkdown: "Unduh .MD",
      printPdf: "Export PDF",
      kpi: {
        competitors: "Kompetitor Dianalisis",
        swotPoints: "Poin Analisis SWOT",
        verifiedSources: "Sumber Web Tervalidasi",
        confidenceScore: "Keyakinan Audit"
      },
      tabs: {
        overview: "Ringkasan Eksekutif",
        matrix: "Matriks Perbandingan",
        swot: "Analisis SWOT",
        sources: "Sumber Terverifikasi"
      },
      sections: {
        executiveSummary: "1. Ringkasan Eksekutif",
        marketOverview: "2. Lanskap Pasar & Dinamika Sektor",
        competitorProfiles: "3. Profil Mendalam Kompetitor",
        strategicRecommendations: "4. Rekomendasi Strategis",
        featureMatrix: "Matriks Perbandingan Fitur & Arsitektur",
        pricingMatrix: "Matriks Harga & Model Langganan",
        swotTitle: "Analisis SWOT",
        swotFilterAll: "Semua Kompetitor",
        viewSwotButton: "Lihat SWOT",
        sourcesTitle: "Sitasi & Sumber Referensi Tervalidasi",
        sourcesSubtitle: "Kutipan faktual dari web yang di-scrape, diindeks ke ChromaDB, dan diaudit selama proses Tri-Search:",
        sourcesSearchPlaceholder: "Cari sumber berdasarkan judul, URL, atau kata kunci...",
        sourcesFilterAll: "Semua Mesin",
        sourcesEmptyTitle: "Belum Ada Sumber Terverifikasi",
        sourcesEmptyDesc: "Tidak ada URL referensi eksternal yang tercatat pada sesi riset ini. Silakan jalankan ulang riset atau periksa koneksi mesin pencari.",
        sourcesNoMatchTitle: "Tidak ada sumber yang cocok dengan kata kunci atau filter mesin pencari.",
        sourcesNoMatchReset: "Reset Filter",
        pricingModel: "Model Harga & Komersial",
        goToMarket: "Strategi Go-To-Market & Target Segmen",
        userSentiment: "Sentimen Pengguna & Komunitas",
        keyFeatures: "Fitur Utama & Arsitektur",
        pros: "Kelebihan",
        cons: "Kekurangan",
        swotStrengths: "Kekuatan (Strengths)",
        swotWeaknesses: "Kelemahan (Weaknesses)",
        swotOpportunities: "Peluang (Opportunities)",
        swotThreats: "Ancaman (Threats)",
        swotSubtitle: "Analisis Strategis 4-Kuadran mengevaluasi kapabilitas internal serta dinamika eksternal pasar.",
        swotViewCards: "Tampilan Kartu",
        swotViewMatrix: "Matriks Kuadran",
        swotEmptyStrengths: "Tidak ada catatan kekuatan spesifik pada siklus ini.",
        swotEmptyWeaknesses: "Tidak ada catatan kelemahan spesifik pada siklus ini.",
        swotEmptyOpportunities: "Tidak ada catatan peluang spesifik pada siklus ini.",
        swotEmptyThreats: "Tidak ada catatan ancaman spesifik pada siklus ini.",
        swotInternalPositive: "Internal • Keunggulan",
        swotInternalNegative: "Internal • Keterbatasan",
        swotExternalPositive: "Eksternal • Peluang Pasar",
        swotExternalNegative: "Eksternal • Ancaman Pasar"
      }
    },
    chat: {
      header: "Dossier Debrief (Eksplorasi Temuan)",
      subtitle: "Eksplorasi temuan intelijen lebih dalam, bedah celah kompetitor, atau rancang battlecard bisnis berbasis ChromaDB RAG.",
      placeholder: "Tanyakan hal lanjutan (contoh: 'Bandingkan biaya GoPay vs OVO', 'Buatkan strategi pemasaran')...",
      send: "Kirim",
      clearChat: "Reset",
      copyReply: "Salin",
      copiedReply: "Tersalin",
      ragBadge: "ChromaDB RAG",
      suggestionsLabel: "Contoh Pertanyaan Lanjutan:",
      suggestions: [
        "Bandingkan model harga dan biaya transaksi lebih detail",
        "Bagaimana strategi terbaik untuk merebut market share?",
        "Apa saja risiko regulasi dan kepatuhan hukumnya?"
      ],
      waiting: "Sedang menganalisis bukti..."
    },
    about: {
      modalTitle: "Tentang StratAgent",
      modalBadge: "Sistem Riset Multi-Agen Otonom",
      close: "Tutup",
      tagline: "Aplikasi riset pasar dan analisis kompetitor otomatis berbasis AI. Menggunakan alur kerja 4 agen cerdas (LangGraph) yang mencari data langsung ke internet, memvalidasi bukti, dan menyusun laporan perbandingan lengkap beserta sumber aslinya.",
      tabs: {
        overview: "Ringkasan & Tujuan",
        architecture: "Alur 4 Agen AI",
        innovations: "Fitur Unggulan",
        stack: "Teknologi yang Digunakan"
      },
      overview: {
        title: "Tujuan & Filosofi Pengembangan",
        summary: "Aplikasi ini dibangun untuk menjembatani kesenjangan antara jendela chat AI serbaguna dengan kebutuhan riset bisnis nyata. Alih-alih mengandalkan satu prompt panjang, StratAgent membagi tugas ke 4 agen AI spesialis (Planner, Researcher, Fact-Checker, Writer) yang dikoordinasikan oleh LangGraph. Dengan memisahkan tugas pencarian web, audit kelengkapan bukti, dan penulisan, sistem menghasilkan analisis pasar yang lebih terarah, transparan dengan tautan sumber asli, dan langsung siap dipakai dalam format PDF.",
        problemTitle: "Pendekatan Satu Prompt Chat Biasa",
        problemDesc: "1. Butuh Rekayasa Prompt Manual: Untuk memperoleh perbandingan lengkap, pengguna harus memikirkan dan mengetik instruksi prompt yang panjang dan rumit setiap kali riset.\n2. Generasi Satu Lintasan (Tanpa Audit Loop): Chatbot biasa langsung menulis jawaban dalam satu kali jalan tanpa agen pemeriksa terpisah yang memvalidasi apakah data penting sudah terpenuhi.\n3. Hasil Masih Berupa Obrolan: Jawaban berada di dalam jendela chat dan masih harus disalin atau dirapikan manual jika ingin dijadikan berkas presentasi atau laporan.",
        solutionTitle: "Pendekatan Sistem Multi-Agen (StratAgent)",
        solutionDesc: "1. Otomatisasi Penuh dari Nama Topik: Pengguna cukup memasukkan nama topik/kompetitor, sistem yang otomatis merumuskan 4 fokus riset tanpa perlu instruksi prompt berulang.\n2. Pemisahan Peran & Koreksi Diri: Agen Periset dan Pemeriksa Fakta bekerja terpisah. Jika bukti dirasa kurang lengkap (skor < 80%), sistem otomatis mencari data tambahan ke web sebelum laporan ditulis.\n3. Berkas Laporan Siap Pakai: Langsung menghasilkan matriks fitur, rincian biaya, analisis SWOT 4-kuadran, dan tombol ekspor sekali klik ke file PDF dan Markdown.",
        kpi1Title: "Alur Otomatis",
        kpi1Value: "1–3 Menit",
        kpi1Desc: "Menjalankan seluruh alur riset hanya dari input nama topik tanpa perlu instruksi prompt rumit.",
        kpi2Title: "Fokus Riset",
        kpi2Value: "4 Aspek Kunci",
        kpi2Desc: "Fitur produk, struktur harga, ulasan/sentimen pengguna, dan target pasar dianalisis secara seimbang.",
        kpi3Title: "Audit Kualitas",
        kpi3Value: "Ambang 80%",
        kpi3Desc: "Jika bukti < 80%, sistem mencari ulang ke web. Jika data tetap tidak ada, bagian tersebut ditandai jujur sebagai 'Belum Terverifikasi'.",
        kpi4Title: "Format Siap Pakai",
        kpi4Value: "Tabel & PDF",
        kpi4Desc: "Matriks perbandingan fitur, tabel rincian harga, analisis SWOT, dan ekspor instan ke PDF.",
      },
      architecture: {
        title: "Bagaimana 4 Agen AI Bekerja Bersama?",
        desc: "Sistem ini menggunakan LangGraph untuk mengatur alur kerja antar-agen. Setiap agen memiliki peran khusus layaknya tim analis riset di dunia nyata.",
        agentsTitle: "Peran 4 Agen Spesialis",
        agent1Name: "01. Agen Perencana (Planner)",
        agent1Role: "Menyusun Strategi",
        agent1Desc: "Membaca topik yang Anda masukkan, menentukan kompetitor utama yang perlu dibandingkan, dan membagi riset menjadi 4 fokus penting: fitur produk, struktur harga, ulasan pengguna, serta strategi pasar.",
        agent2Name: "02. Agen Periset (Researcher)",
        agent2Role: "Menggali Data Web",
        agent2Desc: "Mencari halaman web melalui Tri-Search (Tavily, DuckDuckGo, dan Google Grounding Gemini), membaca isi konten halaman, membersihkan teks dengan Trafilatura, lalu menyimpannya ke database vektor ChromaDB.",
        agent3Name: "03. Agen Pemeriksa Fakta (Fact-Checker)",
        agent3Role: "Memvalidasi Bukti",
        agent3Desc: "Memeriksa apakah data yang terkumpul sudah cukup untuk menjawab pertanyaan dan menghitung skor keyakinan (0–100%). Jika data belum lengkap (skor < 80%), agen ini meminta periset mencari lagi secara terarah sesuai batas jumlah looping yang Anda pilih (1x Cepat, 2x Standar, atau 3x Mendalam).",
        agent4Name: "04. Agen Penulis (Writer)",
        agent4Role: "Menyusun Laporan",
        agent4Desc: "Merangkum seluruh temuan menjadi laporan terstruktur: ringkasan eksekutif, profil kompetitor, tabel fitur, rincian harga, analisis SWOT 4-kuadran, rekomendasi strategis, dan daftar URL sumber rujukan.",
        loopTitle: "Siklus Koreksi Diri Otomatis (Self-Correction Loop)",
        loopDesc: "Jika hasil pencarian pertama dinilai kurang lengkap oleh Pemeriksa Fakta, sistem tidak langsung menyerah atau mengarang jawaban. Sistem akan mengulang pencarian secara otomatis dengan kata kunci yang lebih spesifik hingga batas jumlah looping yang dipilih pengguna tercapai (1x–3x). Bila setelah dicari ulang data tetap tidak ditemukan di internet, sistem tetap menyusun laporan namun menandai bagian tersebut secara transparan sebagai 'Belum Terverifikasi di Sumber'."
      },
      innovations: {
        title: "Fitur & Kemampuan Utama Proyek Ini",
        desc: "Beberapa implementasi teknis yang membuat sistem riset ini bekerja secara andal, cepat, dan transparan.",
        items: [
          {
            title: "Pencarian Web Berlapis (Tri-Search)",
            badge: "Pencarian Cerdas",
            desc: "Menggunakan Tavily Search API untuk pencarian web yang akurat, dengan cadangan otomatis ke DuckDuckGo dan Google Grounding jika kuota API habis atau gagal."
          },
          {
            title: "Database Vektor Lokal (ChromaDB)",
            badge: "Penyimpanan Semantik",
            desc: "Menyimpan potongan teks hasil riset ke dalam basis data ChromaDB di penyimpanan lokal server, sehingga dapat dicari kembali berdasarkan kemiripan arti untuk fitur tanya jawab."
          },
          {
            title: "Dua Pilihan Model LLM (Gemini + Groq)",
            badge: "Cadangan Otomatis",
            desc: "Menggunakan Google Gemini sebagai model utama, dan otomatis beralih ke model Groq via failover LangChain jika kuota Gemini sedang penuh (429) atau terkena kendala jaringan."
          },
          {
            title: "Tanya Jawab Laporan (Dossier Debrief)",
            badge: "Chat Terarah",
            desc: "Fitur chat interaktif setelah laporan selesai dibuat. Pengguna bisa bertanya hal spesifik seputar laporan dengan pengaman (guardrails) agar AI tetap fokus pada topik riset."
          },
          {
            title: "Streaming Real-Time (Server-Sent Events)",
            badge: "Tampilan Langsung",
            desc: "Kemajuan riset ditampilkan secara langsung detik demi detik dari backend ke browser tanpa perlu me-refresh halaman."
          },
          {
            title: "Ekspor Laporan Cepat (.MD & .PDF)",
            badge: "Unduh Instan",
            desc: "Hasil riset dapat diunduh langsung ke file dokumen Markdown (.md) untuk catatan atau dokumen PDF (.pdf) rapi yang siap dibaca dan dibagikan."
          }
        ]
      },
      stack: {
        title: "Teknologi yang Digunakan",
        desc: "Daftar teknologi dan pustaka yang digunakan dalam membangun aplikasi ini dari sisi backend hingga frontend.",
        categories: [
          {
            category: "Kecerdasan Buatan & Alur Agen",
            items: ["LangGraph (Manajemen Siklus Agen)", "LangChain Core", "Google Gemini (gemini-3.1-flash-lite)", "Groq (openai/gpt-oss-120b)", "Tavily Search API", "DuckDuckGo Search (ddgs)", "Google Search Grounding (Gemini Tool)"]
          },
          {
            category: "Penyimpanan & Pengolahan Teks",
            items: ["ChromaDB (Database Vektor Persisten)", "Trafilatura (Ekstraksi Konten Web)", "BeautifulSoup4 (Pembersih HTML)", "Pydantic v2 (Validasi Struktur Data)"]
          },
          {
            category: "Backend & Komunikasi Data",
            items: ["Python 3.11+", "FastAPI (Framework Web Asinkron)", "SSE-Starlette (Streaming Real-Time)", "HTTPX (Klien HTTP Asinkron)", "Langfuse (Opsional: Tracing & Monitoring)"]
          },
          {
            category: "Frontend & Antarmuka Pengguna",
            items: ["Next.js 16 (App Router)", "React 19", "TypeScript", "Tailwind CSS v4", "Lucide React (Ikon)", "jsPDF & AutoTable (Ekspor PDF)"]
          }
        ],
        footerNote: "Proyek ini dibangun sebagai demonstrasi portofolio rekayasa AI multi-agen berbasis fakta."
      }
    },
    footer: "StratAgent • Arsitektur Multi-Agent LangGraph • Portofolio AI Engineer",
    footerAbout: "Tentang Portofolio Ini",
    footerObservability: "Konsol Observabilitas & LLMOps",
    observability: {
      modalTitle: "Konsol Observabilitas & LLMOps",
      modalBadge: "Telemetri Real-Time • Langfuse • SLIs",
      close: "Tutup",
      refresh: "Perbarui Telemetri",
      refreshing: "Memeriksa...",
      tagline: "Telemetri sistem langsung, pelacakan eksekusi multi-agent (distributed tracing), analitik cache basis data vektor, dan instrumen LLMOps Langfuse.",
      tabs: {
        telemetry: "Metrik & Infrastruktur",
        langfuse: "Metrik LLMOps Langfuse",
        slos: "Metrik LLMOps Langfuse",
        inspector: "Inspektor Sesi Terakhir"
      },
      telemetry: {
        title: "Kesehatan Penyedia Layanan & Telemetri Vektor",
        desc: "Status koneksi langsung antar penyedia inferensi LLM, API pencarian web, cache vektor persisten, dan instrumen tracing Langfuse.",
        backendStatus: "Status Mesin FastAPI",
        onlineText: "Terhubung (Streaming SSE Aktif)",
        offlineText: "Terputus / Offline",
        llmEngine: "Penyedia Inferensi LLM",
        llmPrimary: "Utama: Google Gemini (gemini-3.1-flash-lite)",
        llmFallback: "Cadangan (Failover): Groq (openai/gpt-oss-120b)",
        searchEngine: "Mesin Pencarian Fakta (Grounding)",
        searchDesc: "Tri-Search: Tavily API + DuckDuckGo + Google Grounding (Gemini) + Pembersih Web Trafilatura",
        vectorEngine: "Mesin Vektor Persisten",
        vectorDesc: "ChromaDB Persistent Store di penyimpanan disk server untuk pencarian semantik dan tanya jawab",
        langfuseEngine: "Pelacakan Observabilitas Langfuse",
        langfuseActive: "Aktif (Callback Telemetri Terdaftar)",
        langfuseInactive: "Siaga (Siap dengan Kunci API)",
        cachedChunks: "Dokumen Vektor Terindeks di Server",
        latencyMs: "Latensi Ping API"
      },
      slos: {
        title: "SLI Latensi & Keandalan Eksekusi Agen",
        desc: "Service Level Indicators (SLI) yang memantau durasi eksekusi, kuota latensi token, dan gerbang validasi keyakinan audit per tahap pipeline.",
        stages: [
          {
            name: "01. Agen Perencana (Planner)",
            target: "3 - 5 dtk",
            p95: "6.0 dtk",
            note: "Mendekomposisi kueri ke 4 dimensi riset dan memverifikasi domain resmi.",
            status: "Nominal"
          },
          {
            name: "02. Agen Periset (Researcher)",
            target: "15 - 25 dtk",
            p95: "30.0 dtk",
            note: "Tri-Search + Web scraping. Turun ke <0.5 dtk jika Smart Vector Cache hit.",
            status: "Nominal"
          },
          {
            name: "03. Pemeriksa Fakta (Fact-Checker)",
            target: "3 - 5 dtk",
            p95: "6.0 dtk",
            note: "Audit bukti terhadap Matriks Sitasi. Memicu retry jika skor < 80%.",
            status: "Nominal"
          },
          {
            name: "04. Penyusun Eksekutif (Writer)",
            target: "8 - 12 dtk",
            p95: "15.0 dtk",
            note: "Menyusun berkas akhir dengan kebijakan tertutup (zero hallucination).",
            status: "Nominal"
          },
          {
            name: "05. Multi-Tier Guardrails",
            target: "< 1 ms",
            p95: "2.0 ms",
            note: "Heuristik regex deterministik memblokir injeksi prompt & kueri di luar topik.",
            status: "Aktif"
          }
        ],
        gateTitle: "Gerbang Kualitas Audit Fakta (Batas 80.0%)",
        gateDesc: "Jika skor keyakinan Pemeriksa Fakta di bawah 80.0%, LangGraph secara kondisional mengutus ulang Periset dengan kueri perbaikan terarah (hingga batas iterasi maksimum) sebelum mengizinkan penulisan laporan final."
      },
      tracing: {
        title: "Pipeline Pelacakan Langfuse & OpenTelemetry",
        desc: "Merekam silsilah data menyeluruh: kueri pengguna, transisi status agen, rentang generasi LLM, versi prompt, konsumsi token, dan akuntansi biaya.",
        flowTitle: "Arsitektur Distributed Tracing",
        flowSteps: [
          "1. Kueri pengguna & Session ID diinisialisasi melalui antarmuka Next.js",
          "2. FastAPI Server-Sent Events menginisialisasi StateGraph LangGraph",
          "3. Langfuse CallbackHandler mencatat setiap node agen sebagai trace span bersarang",
          "4. Panggilan LLM mencatat parameter model (suhu=0.1, nama model, token yang terpakai)",
          "5. Kueri ChromaDB mencatat embedding pencarian dan latensi pengambilan top-k",
          "6. Pemeriksa Fakta merekam vonis audit dan skor keyakinan ke metadata span",
          "7. Laporan akhir disintesis beserta jumlah sitasi dan total token keluaran"
        ],
        metricsTitle: "Metrik LLMOps yang Dipantau",
        metricsDesc: "Penggunaan token (Prompt / Completion / Total), Latensi per Langkah (p50 / p95 / p99), Tingkat Error & Pemicu Fallback, Akuntansi Biaya ($/run), dan Persentase Sumber Berlandas Fakta."
      },
      inspector: {
        title: "Inspektor Telemetri Sesi Aktif",
        desc: "Metrik instrumentasi langsung yang dikumpulkan selama sesi browser Anda berjalan.",
        sessionTopic: "Topik Riset Aktif",
        eventsRecorded: "Catatan Jejak Terekam",
        loopIteration: "Iterasi Siklus Riset",
        confidenceScore: "Skor Keyakinan Audit",
        copyJson: "Salin JSON Telemetri Mentah",
        copiedJson: "JSON Berhasil Disalin",
        noActiveSession: "Belum ada sesi riset aktif. Jalankan riset di atas atau klik contoh topik untuk melihat telemetri agen real-time."
      }
    }
  }
};
