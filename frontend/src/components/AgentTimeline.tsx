"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Check,
  Loader2,
  Terminal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  Compass,
  Target,
  Sparkles,
  Search,
  Globe,
  Square
} from "lucide-react";
import { ResearchPlan, StatusEvent, VerificationVerdict, CompetitorReport } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { VERIFIED_THRESHOLD } from "@/lib/constants";

interface AgentTimelineProps {
  currentNode: string | null;
  events: StatusEvent[];
  plan: ResearchPlan | null;
  verification: VerificationVerdict | null;
  iteration: number;
  isComplete: boolean;
  isStopped?: boolean;
  onStop?: () => void;
  report?: CompetitorReport | null;
  elapsedMs?: number;
  stageStartedOffset?: Record<string, number>;
}

const formatDuration = (ms: number): string => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

const STAGE_ETA_SECONDS: Record<string, number> = {
  planner: 5,
  researcher: 20,
  fact_checker: 5,
  writer: 10
};

const ETA_HISTORY_KEY = "stratagent.stageEtaSeconds";

const readEtaHistory = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ETA_HISTORY_KEY) || "{}");
  } catch {
    return {};
  }
};

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  currentNode,
  events,
  plan,
  verification,
  iteration,
  isComplete,
  isStopped = false,
  onStop,
  report,
  elapsedMs = 0,
  stageStartedOffset = {}
}) => {
  const { language, t } = useLanguage();
  const [logsOpen, setLogsOpen] = useState<boolean | null>(null);
  const [blueprintOpen, setBlueprintOpen] = useState<boolean | null>(null);
  const [stageEtaHistory] = useState<Record<string, number>>(readEtaHistory);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Derive auto-open/auto-collapse without setState inside effects
  const showLogs = logsOpen ?? !isComplete;
  const showBlueprint = blueprintOpen ?? Boolean(plan && !isComplete);

  // Auto-scroll trace logs as new events stream in
  useEffect(() => {
    if (showLogs && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [events, showLogs]);

  const STAGES = [
    {
      id: "planner",
      stepNum: "01",
      label: t.pipeline.stages.planner.label,
      role: t.pipeline.stages.planner.role,
      eta: t.pipeline.stages.planner.eta
    },
    {
      id: "researcher",
      stepNum: "02",
      label: t.pipeline.stages.researcher.label,
      role: t.pipeline.stages.researcher.role,
      eta: t.pipeline.stages.researcher.eta
    },
    {
      id: "fact_checker",
      stepNum: "03",
      label: t.pipeline.stages.fact_checker.label,
      role: t.pipeline.stages.fact_checker.role,
      eta: t.pipeline.stages.fact_checker.eta
    },
    {
      id: "writer",
      stepNum: "04",
      label: t.pipeline.stages.writer.label,
      role: t.pipeline.stages.writer.role,
      eta: t.pipeline.stages.writer.eta
    }
  ];

  const stageDurations = useMemo(() => {
    const durations: Record<string, number> = {};
    events.forEach((event) => {
      if (
        typeof event.duration_ms === "number" &&
        ["planner", "researcher", "fact_checker", "writer"].includes(event.node)
      ) {
        durations[event.node] = event.duration_ms;
      }
    });
    return durations;
  }, [events]);

  useEffect(() => {
    if (!isComplete) return;
    const next = { ...readEtaHistory() };
    Object.entries(stageDurations).forEach(([node, ms]) => {
      if (STAGE_ETA_SECONDS[node] && ms > 0) next[node] = Math.round(ms / 1000);
    });
    window.localStorage.setItem(ETA_HISTORY_KEY, JSON.stringify(next));
  }, [isComplete, stageDurations]);

  const getStageStatus = (stageId: string, index: number) => {
    if (isComplete) return "completed";
    if (isStopped) {
      if (stageId === "planner" && plan) return "completed";
      if (stageId === "fact_checker" && verification) return "completed";
      return "pending";
    }
    if (currentNode === stageId) return "active";

    const stageOrder = ["planner", "researcher", "fact_checker", "writer"];
    const currentIndex = stageOrder.indexOf(currentNode || "");

    if (currentIndex > index) return "completed";
    return "pending";
  };

  const getStageEstimate = (stageId: string) =>
    stageEtaHistory[stageId] ?? STAGE_ETA_SECONDS[stageId] ?? 1;

  const getRemainingSeconds = (stageId: string, status: string, elapsedSec: number) => {
    if (status === "completed") return 0;
    const estimate = getStageEstimate(stageId);
    if (status !== "active") return estimate;
    return elapsedSec < estimate ? estimate - elapsedSec : Math.max(5, estimate * 0.2);
  };

  const totalRemainingSec = STAGES.reduce((total, stage, idx) => {
    const status = getStageStatus(stage.id, idx);
    const offset = stageStartedOffset[stage.id];
    const elapsedSec = offset !== undefined ? Math.max(0, elapsedMs - offset) / 1000 : 0;
    return total + getRemainingSeconds(stage.id, status, elapsedSec);
  }, 0);

  const getNodeBadgeStyle = (node: string) => {
    switch (node.toLowerCase()) {
      case "planner":
        return "text-sky-300 bg-sky-950/50 border-sky-800/60";
      case "researcher":
        return "text-indigo-300 bg-indigo-950/50 border-indigo-800/60";
      case "fact_checker":
        return "text-amber-300 bg-amber-950/50 border-amber-800/60";
      case "writer":
        return "text-emerald-300 bg-emerald-950/50 border-emerald-800/60";
      default:
        return "text-zinc-400 bg-zinc-900 border-zinc-800";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-2.5 print:hidden">
      {/* Pipeline Status Bar */}
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80 mb-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-zinc-400">{t.pipeline.title}</span>
            <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
              {t.pipeline.totalTime}: {formatDuration(elapsedMs)}
            </span>
            {!isComplete && !isStopped && (
              <span className="font-mono text-[10px] text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded-md border border-sky-800/50">
                {t.pipeline.eta}: ~{formatDuration(totalRemainingSec * 1000)}
              </span>
            )}
            {isComplete ? (
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3" />
                {t.pipeline.completed}
              </span>
            ) : isStopped ? (
              <span className="flex items-center gap-1 font-mono text-[11px] text-rose-300 bg-rose-950/50 px-2.5 py-0.5 rounded-md border border-rose-800/50">
                <Square className="w-2.5 h-2.5 fill-rose-300 text-rose-300" />
                {language === "id" ? "Dihentikan oleh Pengguna" : "Stopped by User"}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-300 bg-emerald-950/30 px-2.5 py-0.5 rounded-md border border-emerald-800/40">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  {t.pipeline.stepPrefix} {currentNode || "Init"}
                </span>
                {onStop && (
                  <button
                    type="button"
                    onClick={onStop}
                    className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-500 px-2.5 py-0.5 rounded-md border border-rose-500 transition-colors cursor-pointer"
                  >
                    <Square className="w-2.5 h-2.5 fill-white text-white" />
                    <span>{t.input.buttonStop}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Fact-check confidence badge */}
          {((verification !== null && verification !== undefined) || (report?.confidence_score !== undefined)) && (
            (() => {
              const effectiveScore = report?.confidence_score ?? verification?.confidence_score ?? 0;
              const isVerified = effectiveScore >= VERIFIED_THRESHOLD;
              return (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-zinc-500">{t.pipeline.confidence}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md border font-semibold transition-colors duration-300 ${
                      isVerified
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                        : "bg-amber-950/40 text-amber-400 border-amber-800/40"
                    }`}
                  >
                    {effectiveScore.toFixed(1)}%
                  </span>
                  {iteration > 1 && (
                    <span
                      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors duration-300 ${
                        isVerified
                          ? "bg-emerald-950/30 text-emerald-400/90 border-emerald-800/30"
                          : "bg-amber-950/30 text-amber-400/90 border-amber-800/30"
                      }`}
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      {t.pipeline.loopPrefix} {iteration}
                    </span>
                  )}
                </div>
              );
            })()
          )}
        </div>

        {/* 4-Stage Stepper Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {STAGES.map((stage, idx) => {
            const status = getStageStatus(stage.id, idx);
            const startedAt = stageStartedOffset[stage.id] !== undefined;
            const activeElapsed = Math.max(0, elapsedMs - (stageStartedOffset[stage.id] || 0));
            const estimateSeconds = getStageEstimate(stage.id);
            const elapsedSeconds = activeElapsed / 1000;
            const remainingSeconds = getRemainingSeconds(stage.id, status, startedAt ? elapsedSeconds : 0);
            const progress =
              status === "completed"
                ? 100
                : status === "active"
                ? Math.min(100, Math.max(4, Math.round((elapsedSeconds / estimateSeconds) * 100)))
                : 0;
            const timingLabel =
              status === "completed" && stageDurations[stage.id]
                ? `${t.pipeline.actualTime} ${formatDuration(stageDurations[stage.id])}`
                : status === "active" && startedAt
                ? `${progress}% · ${t.pipeline.eta} ~${Math.ceil(remainingSeconds)}s`
                : `${t.pipeline.eta} ${stage.eta}`;

            return (
              <div
                key={stage.id}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-300 relative overflow-hidden ${
                  status === "active"
                    ? "bg-zinc-800/95 border-emerald-500/60 text-zinc-100"
                    : status === "completed"
                    ? "bg-zinc-950/70 border-zinc-800 text-zinc-200"
                    : "bg-zinc-950/30 border-zinc-900 text-zinc-600"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                        status === "active"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : status === "completed"
                          ? "bg-zinc-800 text-emerald-400"
                          : "bg-zinc-900 text-zinc-600"
                      }`}
                    >
                      {stage.stepNum}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold truncate">
                      {stage.label}
                    </span>
                  </div>
                  {status === "active" && (
                    <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-emerald-400 shrink-0" />
                  )}
                  {status === "completed" && (
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                  )}
                  {status === "pending" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2 sm:line-clamp-none">
                  {stage.role}
                </p>
                <p className="mt-1 font-mono text-[9px] text-zinc-500">
                  {timingLabel}
                </p>
                <div className="mt-1.5 h-1 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      status === "completed"
                        ? "bg-emerald-500"
                        : status === "active"
                        ? "bg-emerald-500"
                        : "bg-zinc-800"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible Planner Research Blueprint Drawer */}
      {plan && (
        <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setBlueprintOpen(!showBlueprint)}
            className="w-full px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800/60 flex items-center justify-between text-xs text-zinc-300 transition-colors cursor-pointer"
          >
            <div className="flex flex-wrap items-center gap-2 font-mono">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-zinc-100 font-medium">
                {t.pipeline.blueprintTitle}
              </span>
              <span className="text-[10px] text-sky-300 bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-800/50">
                {plan.market_domain}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
                {plan.competitors.length}{" "}
                {t.pipeline.blueprintCompetitors.toLowerCase()} •{" "}
                {plan.subtasks.length}{" "}
                {language === "id" ? "sub-tugas" : "subtasks"}
              </span>
              {showBlueprint ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>
          </button>

          {showBlueprint && (
            <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 space-y-4 text-xs">
              {/* Target Competitors with Official Website Domain Badges */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  <Target className="w-3 h-3 text-emerald-400" />
                  <span>{t.pipeline.blueprintCompetitors}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {plan.competitors.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/90 space-y-1.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-bold text-zinc-100 text-xs">
                            {c.name}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                            {c.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          {c.core_value_prop}
                        </p>
                      </div>
                      {c.website && (
                        <div className="pt-1.5 border-t border-zinc-800/60 flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                          <Globe className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{c.website}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Hypotheses */}
              {plan.key_hypotheses && plan.key_hypotheses.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{t.pipeline.blueprintHypotheses}</span>
                  </div>
                  <ul className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/70">
                    {plan.key_hypotheses.map((h, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-zinc-300 flex items-start gap-2 leading-relaxed"
                      >
                        <span className="font-mono text-amber-400/90 text-[10px] bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/40 shrink-0">
                          H{i + 1}
                        </span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subtasks */}
              {plan.subtasks && plan.subtasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    <Search className="w-3 h-3 text-indigo-400" />
                    <span>{t.pipeline.blueprintSubtasks}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.subtasks.map((st, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1.5"
                      >
                        <strong className="text-indigo-300">
                          {st.competitor_target}
                        </strong>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400">
                          {st.focus_dimension.replace(/_/g, " ")}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Terminal Trace Log */}
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setLogsOpen(!showLogs)}
          className="w-full px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800/60 flex items-center justify-between text-xs text-zinc-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 font-mono">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-300 text-xs">{t.pipeline.traceTitle}</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              ({events.length} {t.pipeline.eventsCount})
            </span>
          </div>
          {showLogs ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>

        {showLogs && (
          <div
            ref={logContainerRef}
            className="p-3.5 bg-zinc-950 max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px] border-t border-zinc-800/80"
          >
            {events.length === 0 ? (
              <p className="text-zinc-600 italic">{t.pipeline.emptyTrace}</p>
            ) : (
              events.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-zinc-300 leading-relaxed"
                >
                  <span className="text-zinc-600 select-none text-[10px] shrink-0">
                    {ev.timestamp
                      ? new Date(ev.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })
                      : "--:--"}
                  </span>
                  <span
                    className={`font-semibold uppercase text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${getNodeBadgeStyle(
                      ev.node
                    )}`}
                  >
                    {ev.node}
                  </span>
                  <span className="text-zinc-300 break-words">{ev.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
