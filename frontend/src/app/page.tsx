"use client";

import React, { useState, useRef, useMemo } from "react";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { TopicInput } from "@/components/TopicInput";
import { AgentTimeline } from "@/components/AgentTimeline";
import { ReportViewer } from "@/components/ReportViewer";
import { FollowUpChat } from "@/components/FollowUpChat";
import { 
  ResearchPlan, 
  VerificationVerdict, 
  CompetitorReport, 
  StatusEvent 
} from "@/types";
import { AlertCircle, RotateCcw } from "lucide-react";

function HomeContent() {
  const { language, t } = useLanguage();
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agent State Artifacts
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [verification, setVerification] = useState<VerificationVerdict | null>(null);
  const [report, setReport] = useState<CompetitorReport | null>(null);
  const [iteration, setIteration] = useState(1);

  const eventSourceRef = useRef<EventSource | null>(null);

  const startResearch = (selectedTopic: string, maxIterations: number) => {
    setTopic(selectedTopic);
    setIsLoading(true);
    setIsComplete(false);
    setError(null);
    setCurrentNode("planner");
    setEvents([]);
    setPlan(null);
    setVerification(null);
    setReport(null);
    setIteration(1);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const apiUrl = `http://localhost:8000/api/research/stream?topic=${encodeURIComponent(
      selectedTopic
    )}&max_iterations=${maxIterations}&language=${language}`;

    try {
      const es = new EventSource(apiUrl);
      eventSourceRef.current = es;

      es.addEventListener("start", (e) => {
        const data = JSON.parse(e.data);
        setEvents((prev) => [
          ...prev,
          {
            node: "system",
            status: "started",
            message: data.message,
            timestamp: data.timestamp
          }
        ]);
      });

      es.addEventListener("status", (e) => {
        const statusData: StatusEvent = JSON.parse(e.data);
        setCurrentNode(statusData.node);
        setEvents((prev) => [...prev, statusData]);

        if (statusData.data?.iteration) {
          setIteration(statusData.data.iteration);
        }
      });

      es.addEventListener("plan", (e) => {
        const planData: ResearchPlan = JSON.parse(e.data);
        setPlan(planData);
        setCurrentNode("researcher");
      });

      es.addEventListener("verification", (e) => {
        const verData: VerificationVerdict = JSON.parse(e.data);
        setVerification(verData);
      });

      es.addEventListener("report", (e) => {
        const repData: CompetitorReport = JSON.parse(e.data);
        setReport(repData);
        setCurrentNode("writer");
      });

      es.addEventListener("complete", () => {
        setIsLoading(false);
        setIsComplete(true);
        setCurrentNode(null);
        es.close();
      });

      es.addEventListener("error", (e: any) => {
        console.error("SSE connection error:", e);
        if (report) {
          setIsLoading(false);
          setIsComplete(true);
          es.close();
        } else {
          setError(
            language === "id"
              ? "Tidak dapat terhubung ke backend FastAPI. Pastikan server aktif di http://localhost:8000 (jalankan 'python run.py' di folder backend/)."
              : "Cannot connect to FastAPI backend. Ensure server is active at http://localhost:8000 (run 'python run.py' inside backend/)."
          );
          setIsLoading(false);
          es.close();
        }
      });
    } catch (err: any) {
      setError(err?.message || "Failed to initialize EventSource stream.");
      setIsLoading(false);
    }
  };

  // Build condensed markdown text context for the follow-up chat
  const reportContextString = useMemo(() => {
    if (!report) return "";
    let str = `# ${report.title}\n\n`;
    str += `## Executive Summary:\n${report.executive_summary}\n\n`;
    str += `## Market Overview:\n${report.market_overview}\n\n`;
    str += `## Competitor Profiles:\n`;
    report.competitor_profiles.forEach((p) => {
      str += `- ${p.name} (${p.pricing_summary}): Pros: ${p.pros.join(", ")}; Cons: ${p.cons.join(", ")}\n`;
    });
    str += `\n## Feature Matrix:\n${report.feature_matrix_markdown}\n\n`;
    str += `## Pricing Matrix:\n${report.pricing_matrix_markdown}\n\n`;
    str += `## Strategic Recommendations:\n${report.strategic_recommendations.join("\n")}\n`;
    return str;
  }, [report]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Clean Hero Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
            {t.hero.title}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-normal">
            {t.hero.subtitle}
          </p>
        </div>

        {/* Input Bar */}
        <TopicInput onSubmit={startResearch} isLoading={isLoading} />

        {/* Error Alert */}
        {error && (
          <div className="max-w-3xl mx-auto p-3.5 rounded-xl bg-zinc-900 border border-rose-900/60 text-rose-300 text-xs flex items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => startResearch(topic || "Cursor vs GitHub Copilot", 2)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              {language === "id" ? "Coba Lagi" : "Retry"}
            </button>
          </div>
        )}

        {/* Live Agent Timeline Tracker */}
        {(isLoading || events.length > 0) && (
          <AgentTimeline
            currentNode={currentNode}
            events={events}
            verification={verification}
            iteration={iteration}
            isComplete={isComplete}
          />
        )}

        {/* Synthesized Report Dossier */}
        {report && <ReportViewer report={report} />}

        {/* Conversational Follow-Up Chatbot */}
        {report && (
          <FollowUpChat
            topic={topic}
            reportSummary={reportContextString}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-900 py-5 text-center text-xs text-zinc-500 font-mono">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  );
}
