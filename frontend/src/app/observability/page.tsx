"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Server,
  Terminal,
  Cpu,
  Search,
  Database,
  Radio,
  RefreshCw,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  Info
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE_URL } from "@/lib/config";
import { StatusEvent } from "@/types";
import { LangfuseMetricsPanel } from "@/components/LangfuseMetricsPanel";

interface TelemetryData {
  service?: string;
  status: string;
  timestamp: string;
  fastapi_version?: string;
  python_runtime?: string;
  infrastructure?: {
    python_runtime?: string;
    fastapi_version?: string;
    orchestration_engine?: string;
    streaming_protocol?: string;
    vector_engine?: string;
    total_cached_chunks?: number;
    total_collections?: number;
  };
  providers?: {
    gemini_configured?: boolean;
    gemini_model?: string;
    groq_fallback_configured?: boolean;
    groq_model?: string;
    tavily_configured?: boolean;
    ddg_configured?: boolean;
    google_grounding_configured?: boolean;
    langfuse_configured?: boolean;
    langfuse_host?: string;
    vector_store?: string;
  };
}

export default function ObservabilityPage() {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"telemetry" | "langfuse" | "inspector">("telemetry");
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Latest session inspect state from history or local storage
  const [latestSession, setLatestSession] = useState<{
    topic: string;
    confidenceScore?: number;
    events: StatusEvent[];
    savedAt: string;
  } | null>(null);

  const fetchTelemetry = async () => {
    setIsRefreshing(true);
    const startTime = performance.now();
    try {
      const telemetryRes = await fetch(`${API_BASE_URL}/api/observability/telemetry`, { method: "GET" });
      const endTime = performance.now();
      setPingLatency(Math.round(endTime - startTime));

      if (telemetryRes.ok) {
        const data = await telemetryRes.json();
        setTelemetry(data);
      } else {
        const healthRes = await fetch(`${API_BASE_URL}/health`);
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setTelemetry(healthData);
        }
      }
    } catch {
      setPingLatency(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();

    // Load latest session from localStorage if available
    try {
      const raw = localStorage.getItem("stratagent_history_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          setLatestSession({
            topic: first.topic,
            confidenceScore: first.report?.confidence_score ?? first.verification?.confidence_score,
            events: first.events || [],
            savedAt: first.savedAt || ""
          });
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const ob = t.observability;

  const handleCopyTelemetry = () => {
    const payload = {
      telemetry,
      pingLatencyMs: pingLatency,
      session: latestSession,
      clientTimestamp: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 bg-ambient-glow text-zinc-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Top Breadcrumb & Action Links */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-emerald-300 font-mono transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>
              {language === "id" ? "Kembali ke Mesin Riset" : "Back to Research Engine"}
            </span>
          </Link>

          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-emerald-300 font-mono transition-colors group cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {language === "id" ? "Tentang Portofolio" : "About Portfolio"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Hero Section */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/95 border border-zinc-800 shadow-xl space-y-4 animate-slide-down">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold text-sky-400 bg-sky-950/70 border border-sky-800/60 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
                {ob.modalBadge}
              </span>
              {pingLatency !== null && (
                <span className="font-mono text-[10px] text-zinc-300 bg-zinc-950 px-2.5 py-0.5 rounded-md border border-zinc-800">
                  {pingLatency} ms ping
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={fetchTelemetry}
              disabled={isRefreshing}
              title={ob.refresh}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-emerald-300 hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono min-h-[32px] interactive-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
              <span>{isRefreshing ? ob.refreshing : ob.refresh}</span>
            </button>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-sky-400 shrink-0" />
              <span>{ob.modalTitle}</span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-normal">
              {ob.tagline}
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block truncate">
                Backend Status
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${telemetry ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                {telemetry?.infrastructure?.fastapi_version ? `FastAPI ${telemetry.infrastructure.fastapi_version}` : (telemetry ? "FastAPI Online" : "Offline")}
              </span>
              <p className="text-[10px] text-zinc-400 leading-tight mt-0.5 truncate">
                {telemetry?.infrastructure?.python_runtime || "Python Server Runtime"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block truncate">
                LLM Failover
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-sky-400 mt-0.5 block truncate">
                Gemini + Groq
              </span>
              <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                Multi-Provider Redundancy
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block truncate">
                Search Engine
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-indigo-400 mt-0.5 block truncate">
                Tri-Search Grounding
              </span>
              <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                Tavily / DDG / Google
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block truncate">
                Vector Store
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-amber-400 mt-0.5 block truncate">
                ChromaDB Persistent
              </span>
              <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                Cosine Chunk Deduplication
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1.5 flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("telemetry")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex-1 sm:flex-none justify-center whitespace-normal sm:whitespace-nowrap text-center interactive-btn ${
              activeTab === "telemetry"
                ? "bg-zinc-800 text-sky-300 border border-sky-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Server className="w-3.5 h-3.5 text-sky-400" />
            <span>{ob.tabs.telemetry}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("langfuse")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex-1 sm:flex-none justify-center whitespace-normal sm:whitespace-nowrap text-center interactive-btn ${
              activeTab === "langfuse"
                ? "bg-zinc-800 text-sky-300 border border-sky-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>{ob.tabs.langfuse || "Langfuse LLMOps Metrics"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inspector")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex-1 sm:flex-none justify-center whitespace-normal sm:whitespace-nowrap text-center interactive-btn ${
              activeTab === "inspector"
                ? "bg-zinc-800 text-sky-300 border border-sky-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>{ob.tabs.inspector}</span>
          </button>
        </div>

        {/* Tab 1: Live Telemetry */}
        {activeTab === "telemetry" && (
          <div className="space-y-6 animate-slide-up">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-100">
                {ob.telemetry.title}
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                {ob.telemetry.desc}
              </p>
            </div>

            {/* 4 Provider Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. FastAPI Backend Health */}
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 interactive-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                    <Server className={`w-4 h-4 ${telemetry ? "text-emerald-400" : "text-rose-400"}`} />
                    <span>{ob.telemetry.backendStatus}</span>
                  </span>
                  {telemetry ? (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {ob.telemetry.onlineText}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {ob.telemetry.offlineText}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 font-mono text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Service:</span>
                    <span className="text-zinc-200">{telemetry?.service || "market-intelligence-agent"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">FastAPI Runtime:</span>
                    <span className="text-zinc-200">
                      {telemetry?.infrastructure?.fastapi_version ? `${telemetry.infrastructure.fastapi_version} (uvicorn)` : "v0.162.0 (uvicorn)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{ob.telemetry.latencyMs}:</span>
                    <span className={pingLatency !== null ? "text-emerald-300 font-bold" : "text-rose-400 font-bold"}>
                      {pingLatency !== null ? `${pingLatency} ms` : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. LLM Engine Providers */}
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 interactive-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    <span>{ob.telemetry.llmEngine}</span>
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/50 font-semibold">
                    Multi-LLM Failover
                  </span>
                </div>
                <div className="space-y-2 text-xs text-zinc-400">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="flex items-center gap-1.5 text-zinc-200 font-medium truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${telemetry?.providers?.gemini_configured !== false ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                      <span>
                        {language === "id" ? "Utama: " : "Primary: "}
                        <span className="font-semibold text-zinc-100">
                          Google Gemini ({telemetry?.providers?.gemini_model || "gemini-3.1-flash-lite"})
                        </span>
                      </span>
                    </p>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shrink-0 font-semibold">
                      {telemetry?.providers?.gemini_configured !== false ? "Primary (Live)" : "Missing Key"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="flex items-center gap-1.5 text-zinc-300 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${telemetry?.providers?.groq_fallback_configured ? "bg-sky-400" : "bg-zinc-600"}`} />
                      <span>
                        {language === "id" ? "Cadangan: " : "Failover: "}
                        <span className="font-medium text-zinc-200">
                          Groq ({telemetry?.providers?.groq_model || "openai/gpt-oss-120b"})
                        </span>
                      </span>
                    </p>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-300 border border-sky-800/50 shrink-0 font-semibold">
                      {telemetry?.providers?.groq_fallback_configured ? "Standby (Ready)" : "Unconfigured"}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-zinc-500 pt-1">
                    {language === "id"
                      ? "Failover otomatis LangChain jika Gemini terkena batas kuota (429)"
                      : "Automatic LangChain failover when Gemini encounters rate limits (429)"}
                  </p>
                </div>
              </div>

              {/* 3. Search Engine & Grounding */}
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 interactive-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                    <Search className="w-4 h-4 text-indigo-400" />
                    <span>{ob.telemetry.searchEngine}</span>
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 font-semibold">
                    Tri-Search
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {ob.telemetry.searchDesc}
                </p>
                <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                  <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${telemetry?.providers?.tavily_configured ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50" : "bg-zinc-950 text-zinc-400 border-zinc-800"}`}>
                    <span className={`w-1 h-1 rounded-full ${telemetry?.providers?.tavily_configured ? "bg-emerald-400" : "bg-zinc-600"}`} />
                    Tavily Search {telemetry?.providers?.tavily_configured ? "(Live)" : "(Fallback to DDG)"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    DuckDuckGo (Live)
                  </span>
                  <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${telemetry?.providers?.google_grounding_configured ? "bg-indigo-950/40 text-indigo-300 border-indigo-800/50" : "bg-zinc-950 text-zinc-400 border-zinc-800"}`}>
                    <span className={`w-1 h-1 rounded-full ${telemetry?.providers?.google_grounding_configured ? "bg-indigo-400" : "bg-zinc-600"}`} />
                    Google Grounding
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    Trafilatura Scraper
                  </span>
                </div>
              </div>

              {/* 4. ChromaDB Vector Store & Storage */}
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 interactive-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>{ob.telemetry.vectorEngine}</span>
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Persistent Disk
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {ob.telemetry.vectorDesc}
                </p>
                <div className="pt-1 flex items-center justify-between font-mono text-xs text-zinc-500 border-t border-zinc-800/60">
                  <span>{ob.telemetry.cachedChunks}:</span>
                  <span className="text-zinc-200 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {telemetry?.infrastructure?.total_cached_chunks !== undefined
                      ? `${telemetry.infrastructure.total_cached_chunks} chunks`
                      : "Calculating..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Langfuse LLMOps Metrics */}
        {activeTab === "langfuse" && (
          <div className="space-y-6 animate-slide-up">
            <LangfuseMetricsPanel language={language} />
          </div>
        )}

        {/* Tab 3: Session Inspector */}
        {activeTab === "inspector" && (
          <div className="space-y-6 animate-slide-up">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-100">
                {ob.inspector.title}
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                {ob.inspector.desc}
              </p>
            </div>

            {latestSession ? (
              <div className="space-y-4">
                {/* Active Session Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                      {ob.inspector.sessionTopic}
                    </span>
                    <span className="text-xs font-bold text-zinc-100 truncate block">
                      {latestSession.topic}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                      {ob.inspector.eventsRecorded}
                    </span>
                    <span className="text-sm font-bold font-mono text-zinc-100">
                      {latestSession.events.length} events
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                      {ob.inspector.confidenceScore}
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {latestSession.confidenceScore !== undefined
                        ? `${latestSession.confidenceScore.toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                      Timestamp
                    </span>
                    <span className="text-xs font-mono text-zinc-300">
                      {latestSession.savedAt || "Terakhir"}
                    </span>
                  </div>
                </div>

                {/* Event Logs Trace Viewer */}
                {latestSession.events.length > 0 && (
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                    <span className="font-mono text-xs uppercase text-zinc-400 font-semibold block">
                      Audit Trace Sequence
                    </span>
                    <div className="p-3 bg-zinc-950 rounded-xl max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px] border border-zinc-800">
                      {latestSession.events.map((ev, i) => (
                        <div key={i} className="flex items-start gap-2 text-zinc-300">
                          <span className="text-zinc-600 text-[10px] shrink-0">
                            {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : "--:--"}
                          </span>
                          <span className="font-semibold uppercase text-[9px] px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 shrink-0">
                            {ev.node}
                          </span>
                          <span className="break-words">{ev.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-zinc-900/60 border border-dashed border-zinc-800 space-y-2">
                <Terminal className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  {ob.inspector.noActiveSession}
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors cursor-pointer mt-2"
                >
                  {language === "id" ? "Mulai Riset di Beranda" : "Launch Query on Home"}
                </Link>
              </div>
            )}

            {/* Action Buttons: Copy Raw Telemetry JSON */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleCopyTelemetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer interactive-btn"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">{ob.inspector.copiedJson}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{ob.inspector.copyJson}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500 font-mono print:hidden space-y-2">
        <p>{t.footer}</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-emerald-300 underline underline-offset-4 transition-colors cursor-pointer"
          >
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>{language === "id" ? "Mesin Riset" : "Research Engine"}</span>
          </Link>
          <span className="text-zinc-700">•</span>
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-emerald-300 underline underline-offset-4 transition-colors cursor-pointer"
          >
            <Info className="w-3 h-3 text-emerald-400" />
            <span>{t.footerAbout}</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
