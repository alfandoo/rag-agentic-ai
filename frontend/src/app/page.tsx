"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { TopicInput } from "@/components/TopicInput";
import { AgentTimeline } from "@/components/AgentTimeline";
import { ReportViewer } from "@/components/ReportViewer";
import { FollowUpChat } from "@/components/FollowUpChat";
import { API_BASE_URL } from "@/lib/config";
import { VERIFIED_THRESHOLD } from "@/lib/constants";
import {
  ResearchPlan,
  VerificationVerdict,
  CompetitorReport,
  StatusEvent
} from "@/types";
import {
  AlertCircle,
  RotateCcw,
  Clock,
  Trash2,
  Loader2,
  Sparkles,
  Info,
  Activity,
  X
} from "lucide-react";

interface SavedDossier {
  topic: string;
  report: CompetitorReport;
  plan?: ResearchPlan | null;
  verification: VerificationVerdict | null;
  events?: StatusEvent[];
  savedAt: string;
}

const HISTORY_STORAGE_KEY = "stratagent_history_v1";

function HomeContent() {
  const { language, t } = useLanguage();
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);

  // Agent State Artifacts
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [verification, setVerification] = useState<VerificationVerdict | null>(null);
  const [report, setReport] = useState<CompetitorReport | null>(null);
  const [iteration, setIteration] = useState(1);
  const [history, setHistory] = useState<SavedDossier[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [, setStageStartedOffset] = useState<Record<string, number>>({});

  const runStartedAtRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isStoppedRef = useRef<boolean>(false);
  const activeTopicRef = useRef<string>("");
  const reportSectionRef = useRef<HTMLDivElement | null>(null);

  // Automatically scroll to the top of the ReportViewer when a report arrives
  useEffect(() => {
    if (report && reportSectionRef.current) {
      const timer = setTimeout(() => {
        reportSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [report]);

  // Close an active research stream when the page unmounts
  useEffect(() => () => eventSourceRef.current?.close(), []);

  // Live total run timer
  useEffect(() => {
    if (!isLoading || !runStartedAtRef.current) return;
    const interval = setInterval(() => {
      if (runStartedAtRef.current) {
        setElapsedMs(Date.now() - runStartedAtRef.current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Load saved dossiers from localStorage on client mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- loading browser-only storage on mount
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 5));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveToHistory = (
    newTopic: string,
    newReport: CompetitorReport,
    newPlan: ResearchPlan | null,
    newVer: VerificationVerdict | null,
    newEvents: StatusEvent[] = []
  ) => {
    try {
      setHistory((prev) => {
        const filtered = prev.filter(
          (item) => item.topic.toLowerCase() !== newTopic.toLowerCase()
        );
        const updated: SavedDossier[] = [
          {
            topic: newTopic,
            report: newReport,
            plan: newPlan,
            verification: newVer,
            events: newEvents,
            savedAt: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })
          },
          ...filtered
        ].slice(0, 5);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Ignore quota errors
    }
  };

  const removeHistoryItem = (idx: number) => {
    const next = history.filter((_, i) => i !== idx);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const loadFromHistory = (item: SavedDossier) => {
    if (isLoading) return;
    setTopic(item.topic);
    setReport(item.report);
    const finalScore = item.report.confidence_score ?? item.verification?.confidence_score;
    if (finalScore !== undefined && item.verification) {
      setVerification({
        ...item.verification,
        confidence_score: finalScore,
        is_valid: finalScore >= VERIFIED_THRESHOLD
      });
    } else {
      setVerification(item.verification);
    }
    setIsComplete(true);
    setIsStopped(false);
    setError(null);
    setCurrentNode(null);
    setElapsedMs(0);
    setStageStartedOffset({});
    runStartedAtRef.current = null;

    // If plan was not saved in older history entries, synthesize it from competitor profiles
    if (item.plan) {
      setPlan(item.plan);
    } else if (item.report.competitor_profiles && item.report.competitor_profiles.length > 0) {
      setPlan({
        market_domain: item.report.title || item.topic,
        competitors: item.report.competitor_profiles.map((p) => ({
          name: p.name,
          website: p.website,
          category: p.market_positioning || "Competitor",
          core_value_prop: p.tagline || ""
        })),
        subtasks: [],
        key_hypotheses: item.report.strategic_recommendations.slice(0, 3)
      });
    } else {
      setPlan(null);
    }

    // Restore trace log events from history, or synthesize archived events if not present
    if (item.events && item.events.length > 0) {
      setEvents(item.events);
    } else {
      const compNames = item.report.competitor_profiles.map((p) => p.name).join(", ");
      const score = item.report.confidence_score ?? item.verification?.confidence_score ?? 85;
      const isIndo = language === "id";
      const timestamp = item.report.generated_at || new Date().toISOString();

      setEvents([
        {
          node: "system",
          status: "started",
          message: isIndo
            ? `Memuat arsip riwayat riset untuk: "${item.topic}"`
            : `Loaded archived research dossier for: "${item.topic}"`,
          timestamp
        },
        {
          node: "planner",
          status: "completed",
          message: isIndo
            ? `Cetak biru riset: memetakan ${item.report.competitor_profiles.length} target kompetitor (${compNames}).`
            : `Research blueprint: mapped ${item.report.competitor_profiles.length} competitor targets (${compNames}).`,
          timestamp
        },
        {
          node: "researcher",
          status: "completed",
          message: isIndo
            ? `Pengumpulan bukti selesai: ${item.report.verified_citations.length} sitasi web terverifikasi via Tri-Search & ChromaDB RAG.`
            : `Evidence collection completed: ${item.report.verified_citations.length} verified web citations via Tri-Search and ChromaDB.`,
          timestamp
        },
        {
          node: "fact_checker",
          status: "completed",
          message: isIndo
            ? `Audit validasi selesai dengan tingkat keyakinan ${score.toFixed(1)}%.`
            : `Fact-check audit finished with confidence score ${score.toFixed(1)}%.`,
          timestamp
        },
        {
          node: "writer",
          status: "completed",
          message: isIndo
            ? `Sintesis berkas eksekutif selesai dari arsip riwayat (${item.savedAt}).`
            : `Executive dossier synthesis loaded from history archive (${item.savedAt}).`,
          timestamp
        }
      ]);
    }
  };

  const stopResearch = () => {
    isStoppedRef.current = true;

    // 1. Immediately close SSE connection on the client
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // 2. Notify FastAPI backend to abort ongoing search/scraping worker threads for this topic (or '*')
    const targetToStop = activeTopicRef.current || topic || "*";
    fetch(`${API_BASE_URL}/api/research/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: targetToStop })
    }).catch(() => {
      // Ignore network errors on stop signal
    });

    // 3. Return to the initial prompt screen
    setIsLoading(false);
    setIsComplete(false);
    setIsStopped(false);
    setCurrentNode(null);
    setEvents([]);
    setPlan(null);
    setVerification(null);
    setReport(null);
    setIteration(1);
    setError(null);
    setIsLimitError(false);
    setTopic("");
    setElapsedMs(0);
    setStageStartedOffset({});
    runStartedAtRef.current = null;
    activeTopicRef.current = "";
  };

  const startResearch = (selectedTopic: string, maxIterations: number) => {
    isStoppedRef.current = false;
    activeTopicRef.current = selectedTopic;
    setTopic(selectedTopic);
    setIsLoading(true);
    setIsComplete(false);
    setIsStopped(false);
    setError(null);
    setCurrentNode("planner");
    setEvents([]);
    setPlan(null);
    setVerification(null);
    setReport(null);
    setIteration(1);
    const startedAt = Date.now();
    runStartedAtRef.current = startedAt;
    setElapsedMs(0);
    setStageStartedOffset({ planner: 0 });

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const apiUrl = `${API_BASE_URL}/api/research/stream?topic=${encodeURIComponent(
      selectedTopic
    )}&max_iterations=${maxIterations}&language=${language}`;

    let latestPlan: ResearchPlan | null = null;
    let latestVerdict: VerificationVerdict | null = null;
    let hasReceivedReport = false;
    let isStreamFinished = false;
    const accumulatedEvents: StatusEvent[] = [];

    try {
      const es = new EventSource(apiUrl);
      eventSourceRef.current = es;

      es.addEventListener("start", (e) => {
        if (isStoppedRef.current || eventSourceRef.current !== es) return;
        const data = JSON.parse(e.data);
        const startEv: StatusEvent = {
          node: "system",
          status: "started",
          message: data.message,
          timestamp: data.timestamp
        };
        accumulatedEvents.push(startEv);
        setEvents((prev) => [...prev, startEv]);
      });

      es.addEventListener("status", (e) => {
        if (isStoppedRef.current || eventSourceRef.current !== es) return;
        const statusData: StatusEvent = JSON.parse(e.data);
        accumulatedEvents.push(statusData);
        setCurrentNode(statusData.node);
        setEvents((prev) => [...prev, statusData]);

        if (typeof statusData.elapsed_ms === "number") {
          setElapsedMs(statusData.elapsed_ms);
        }
        const nextStage: Record<string, string> = {
          planner: "researcher",
          researcher: "fact_checker",
          fact_checker: "writer"
        };
        const next = nextStage[statusData.node];
        if (next) {
          const offset = runStartedAtRef.current
            ? Date.now() - runStartedAtRef.current
            : 0;
          setStageStartedOffset((prev) => ({ ...prev, [next]: offset }));
        }
        if (statusData.data?.iteration) {
          setIteration(statusData.data.iteration);
        }
      });

      es.addEventListener("plan", (e) => {
        if (isStoppedRef.current || eventSourceRef.current !== es) return;
        const planData: ResearchPlan = JSON.parse(e.data);
        latestPlan = planData;
        setPlan(planData);
        setCurrentNode("researcher");
        const offset = runStartedAtRef.current
          ? Date.now() - runStartedAtRef.current
          : 0;
        setStageStartedOffset((prev) => ({ ...prev, researcher: offset }));
      });

      es.addEventListener("verification", (e) => {
        if (isStoppedRef.current || eventSourceRef.current !== es) return;
        const verData: VerificationVerdict = JSON.parse(e.data);
        latestVerdict = verData;
        setVerification(verData);
        setCurrentNode(verData.is_valid ? "writer" : "researcher");
        const offset = runStartedAtRef.current
          ? Date.now() - runStartedAtRef.current
          : 0;
        setStageStartedOffset((prev) => ({
          ...prev,
          [verData.is_valid ? "writer" : "researcher"]: offset
        }));
      });

      es.addEventListener("report", (e) => {
        if (isStoppedRef.current || eventSourceRef.current !== es) return;
        const repData: CompetitorReport = JSON.parse(e.data);
        repData.generated_at = new Date().toISOString();
        hasReceivedReport = true;
        setReport(repData);
        setCurrentNode("writer");
        const offset = runStartedAtRef.current
          ? Date.now() - runStartedAtRef.current
          : 0;
        setStageStartedOffset((prev) => ({
          ...prev,
          writer: prev.writer ?? offset
        }));

        // Sync verification confidence score with the final synthesized report score
        if (typeof repData.confidence_score === "number") {
          const finalScore = repData.confidence_score;
          setVerification((prev) => {
            const updated: VerificationVerdict = {
              is_valid: finalScore >= VERIFIED_THRESHOLD,
              confidence_score: finalScore,
              critique: repData.audit_critique || prev?.critique || "",
              missing_aspects: repData.missing_data_points || prev?.missing_aspects || [],
              retry_search_queries: prev?.retry_search_queries || []
            };
            latestVerdict = updated;
            return updated;
          });
        }

        saveToHistory(selectedTopic, repData, latestPlan, latestVerdict, [...accumulatedEvents]);
      });

      es.addEventListener("complete", (e) => {
        if (isStoppedRef.current || eventSourceRef.current !== es) return;
        isStreamFinished = true;
        try {
          const payload = JSON.parse(e.data);
          if (typeof payload.elapsed_ms === "number") {
            setElapsedMs(payload.elapsed_ms);
          }
        } catch {
          // Keep the client-side elapsed timer when the payload is malformed
        }
        es.close();
        setIsLoading(false);
        setIsComplete(true);
        setCurrentNode(null);
      });

      es.addEventListener("error", () => {
        if (isStoppedRef.current || eventSourceRef.current !== es) {
          es.close();
          return;
        }
        // Ignore normal EOF closure after report/complete event has already arrived
        if (isStreamFinished || hasReceivedReport) {
          es.close();
          setIsLoading(false);
          setIsComplete(true);
          setCurrentNode(null);
          return;
        }

        es.close();
        setIsLoading(false);
        if (runStartedAtRef.current) {
          setElapsedMs(Date.now() - runStartedAtRef.current);
        }
        setEvents([]);
        setPlan(null);
        setVerification(null);
        setReport(null);
        setCurrentNode(null);
        setElapsedMs(0);
        setStageStartedOffset({});
        runStartedAtRef.current = null;
        const limitMessage =
          language === "id"
            ? "Batas riset tercapai (5 riset per 5 jam). Silakan coba lagi nanti."
            : "Research limit reached (5 runs per 5 hours). Please try again later.";
        const connectionMessage =
          language === "id"
            ? `Tidak dapat terhubung ke backend FastAPI. Pastikan server aktif di ${API_BASE_URL}.`
            : `Cannot connect to the FastAPI backend. Ensure the server is running at ${API_BASE_URL}.`;
        fetch(`${API_BASE_URL}/health`, { method: "GET" })
          .then((health) => {
            setIsLimitError(health.ok);
            setError(health.ok ? limitMessage : connectionMessage);
          })
          .catch(() => {
            setIsLimitError(false);
            setError(connectionMessage);
          });
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initialize EventSource stream.");
      setIsLoading(false);
    }
  };

  // Build complete markdown text context for the follow-up chat (including SWOT & features)
  const reportContextString = useMemo(() => {
    if (!report) return "";
    let str = `# ${report.title}\n\n`;
    str += `## Executive Summary:\n${report.executive_summary}\n\n`;
    str += `## Market Overview:\n${report.market_overview}\n\n`;
    str += `## Competitor Profiles:\n`;
    report.competitor_profiles.forEach((p) => {
      str += `- ${p.name} (${p.market_positioning} | Pricing: ${p.pricing_summary}): Features: ${p.key_features.join(", ")}; Pros: ${p.pros.join(", ")}; Cons: ${p.cons.join(", ")}\n`;
    });
    str += `\n## Feature Matrix:\n${report.feature_matrix_markdown}\n\n`;
    str += `\n## Pricing Matrix:\n${report.pricing_matrix_markdown}\n\n`;
    str += `\n## SWOT Analysis:\n`;
    report.swot_analyses.forEach((s) => {
      str += `- ${s.competitor}: Strengths: ${s.strengths.join("; ")} | Weaknesses: ${s.weaknesses.join("; ")} | Opportunities: ${s.opportunities.join("; ")} | Threats: ${s.threats.join("; ")}\n`;
    });
    str += `\n## Strategic Recommendations:\n${report.strategic_recommendations.join("\n")}\n`;
    if (report.audit_critique) {
      str += `\n## Fact-Checker Audit Note:\n${report.audit_critique}\n`;
    }
    return str;
  }, [report]);

  return (
    <div className="min-h-screen bg-zinc-950 bg-ambient-glow text-zinc-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-7">
        {/* Clean Hero Header */}
        <div className="text-center space-y-2 sm:space-y-2.5 max-w-2xl mx-auto print:hidden animate-slide-down">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 font-mono text-[10px] uppercase tracking-wider shadow-xs transition-transform duration-300 hover:scale-105">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>
              {language === "id"
                ? "Multi-Agent RAG • Closed-World Grounded"
                : "Multi-Agent RAG • Closed-World Grounded"}
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            {t.hero.title}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed px-1 sm:px-0">
            {t.hero.subtitle}
          </p>
        </div>

        {/* Input Bar */}
        <div className="animate-slide-up">
          <TopicInput
            key={topic}
            onSubmit={startResearch}
            onStop={stopResearch}
            isLoading={isLoading}
            activeTopic={topic}
          />
        </div>

        {/* Recent Research History Bar (LocalStorage Persistence) */}
        {history.length > 0 && (
          <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2 px-1 print:hidden animate-fade-in">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                <Clock className="w-3 h-3" />
                {t.input.historyLabel}
              </span>
              {history.map((item, idx) => {
                const isActive =
                  topic.toLowerCase() === item.topic.toLowerCase() && !!report;
                const itemScore = item.report?.confidence_score;
                return (
                  <div
                    key={idx}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-mono pl-2.5 pr-1 py-1 rounded-lg border interactive-btn ${
                      isActive
                        ? "bg-zinc-800 text-zinc-100 border-emerald-500/50 font-medium shadow-xs"
                        : "bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => loadFromHistory(item)}
                      className="inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <span className="max-w-[130px] sm:max-w-[180px] truncate">{item.topic}</span>
                      {itemScore !== undefined && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                            itemScore >= VERIFIED_THRESHOLD
                              ? "bg-emerald-950/60 text-emerald-400"
                              : "bg-amber-950/60 text-amber-400"
                          }`}
                        >
                          {itemScore.toFixed(0)}%
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => removeHistoryItem(idx)}
                      aria-label="Delete"
                      className="p-0.5 rounded text-zinc-500 hover:text-rose-400 cursor-pointer disabled:opacity-30"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={clearHistory}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer interactive-btn disabled:opacity-30"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t.input.clearHistory}</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="max-w-4xl mx-auto p-3.5 rounded-xl bg-zinc-900 border border-rose-900/60 text-rose-300 text-xs flex items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            {!isLimitError && (
              <button
                onClick={() =>
                  startResearch(topic || "Cursor vs GitHub Copilot", 2)
                }
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                {language === "id" ? "Coba Lagi" : "Retry"}
              </button>
            )}
          </div>
        )}

        {/* Live Agent Timeline Tracker & Planner Blueprint */}
        {(events.length > 0 || plan) && (
          <AgentTimeline
            currentNode={currentNode}
            events={events}
            plan={plan}
            verification={verification}
            iteration={iteration}
            isComplete={isComplete}
            isStopped={isStopped}
            onStop={stopResearch}
            report={report}
            elapsedMs={elapsedMs}
          />
        )}

        {/* Active Research Live Progress Skeleton (While Running & Before Report Arrives) */}
        {isLoading && !report && events.length > 0 && (
          <div className="w-full max-w-4xl mx-auto bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 animate-slide-up shadow-lg print:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                <span className="text-xs font-mono text-zinc-200 font-medium">
                  {events.length > 0
                    ? events[events.length - 1].message
                    : language === "id"
                    ? "Menyiapkan agen riset otonom..."
                    : "Initializing autonomous research agents..."}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/50 shrink-0 flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {language === "id" ? "Sedang Berjalan" : "Live Execution"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="h-16 rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3 flex flex-col justify-between overflow-hidden relative">
                <div className="w-24 h-2.5 rounded shimmer-effect" />
                <div className="w-full h-2 rounded shimmer-effect opacity-60" />
              </div>
              <div className="h-16 rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3 flex flex-col justify-between overflow-hidden relative">
                <div className="w-28 h-2.5 rounded shimmer-effect" />
                <div className="w-4/5 h-2 rounded shimmer-effect opacity-60" />
              </div>
              <div className="h-16 rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3 flex flex-col justify-between overflow-hidden relative">
                <div className="w-20 h-2.5 rounded shimmer-effect" />
                <div className="w-3/4 h-2 rounded shimmer-effect opacity-60" />
              </div>
            </div>
          </div>
        )}

        {/* Synthesized Report Dossier */}
        {report && (
          <div ref={reportSectionRef} className="scroll-mt-16 animate-slide-up">
            <ReportViewer report={report} />
          </div>
        )}

        {/* Conversational Follow-Up Chatbot */}
        {report && (
          <div className="animate-slide-up">
            <FollowUpChat
              key={topic}
              topic={topic}
              reportSummary={reportContextString}
              competitorNames={report.competitor_profiles.map((p) => p.name)}
            />
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500 font-mono print:hidden space-y-2">
        <p>{t.footer}</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-emerald-300 underline underline-offset-4 transition-colors cursor-pointer"
          >
            <Info className="w-3 h-3 text-emerald-400" />
            <span>{t.footerAbout}</span>
          </Link>
          <span className="text-zinc-700">•</span>
          <Link
            href="/observability"
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-sky-300 underline underline-offset-4 transition-colors cursor-pointer"
          >
            <Activity className="w-3 h-3 text-sky-400" />
            <span>{t.footerObservability}</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
