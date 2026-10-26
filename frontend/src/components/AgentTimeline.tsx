"use client";

import React, { useState } from "react";
import { 
  Check, 
  Loader2, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  CheckCircle2
} from "lucide-react";
import { StatusEvent, VerificationVerdict } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface AgentTimelineProps {
  currentNode: string | null;
  events: StatusEvent[];
  verification: VerificationVerdict | null;
  iteration: number;
  isComplete: boolean;
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  currentNode,
  events,
  verification,
  iteration,
  isComplete
}) => {
  const { t } = useLanguage();
  const [showLogs, setShowLogs] = useState(true);

  const STAGES = [
    { 
      id: "planner", 
      label: t.pipeline.stages.planner.label, 
      role: t.pipeline.stages.planner.role 
    },
    { 
      id: "researcher", 
      label: t.pipeline.stages.researcher.label, 
      role: t.pipeline.stages.researcher.role 
    },
    { 
      id: "fact_checker", 
      label: t.pipeline.stages.fact_checker.label, 
      role: t.pipeline.stages.fact_checker.role 
    },
    { 
      id: "writer", 
      label: t.pipeline.stages.writer.label, 
      role: t.pipeline.stages.writer.role 
    }
  ];

  const getStageStatus = (stageId: string, index: number) => {
    if (isComplete) return "completed";
    if (currentNode === stageId) return "active";

    const stageOrder = ["planner", "researcher", "fact_checker", "writer"];
    const currentIndex = stageOrder.indexOf(currentNode || "");

    if (currentIndex > index) return "completed";
    return "pending";
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">
      {/* Pipeline Status Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-400">{t.pipeline.title}</span>
            {isComplete ? (
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3" />
                {t.pipeline.completed}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/50">
                <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                {t.pipeline.stepPrefix} {currentNode || "Init"}
              </span>
            )}
          </div>

          {/* Fact-check confidence badge */}
          {verification && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-zinc-500">{t.pipeline.confidence}</span>
              <span className={`px-1.5 py-0.5 rounded border font-medium ${
                verification.confidence_score >= 80
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                  : "bg-amber-950/40 text-amber-400 border-amber-800/40"
              }`}>
                {verification.confidence_score.toFixed(1)}%
              </span>
              {iteration > 1 && (
                <span className="flex items-center gap-1 text-amber-400/90 text-[10px]">
                  <RotateCcw className="w-2.5 h-2.5" />
                  {t.pipeline.loopPrefix} {iteration}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Step List */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAGES.map((stage, idx) => {
            const status = getStageStatus(stage.id, idx);

            return (
              <div
                key={stage.id}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  status === "active"
                    ? "bg-zinc-800/60 border-zinc-600 text-zinc-100"
                    : status === "completed"
                    ? "bg-zinc-950/40 border-zinc-800 text-zinc-300"
                    : "bg-zinc-950/20 border-zinc-900 text-zinc-600"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-[11px] font-semibold">{stage.label}</span>
                  {status === "active" && <Loader2 className="w-3 h-3 animate-spin text-zinc-300" />}
                  {status === "completed" && <Check className="w-3 h-3 text-emerald-400" />}
                  {status === "pending" && <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />}
                </div>
                <p className="text-[10px] text-zinc-500 truncate">{stage.role}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Trace Log */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowLogs(!showLogs)}
          className="w-full px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-850 flex items-center justify-between text-xs text-zinc-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 font-mono">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-300 text-xs">{t.pipeline.traceTitle}</span>
            <span className="text-[10px] text-zinc-500 font-mono">({events.length} {t.pipeline.eventsCount})</span>
          </div>
          {showLogs ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
        </button>

        {showLogs && (
          <div className="p-3 bg-zinc-950 max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px] border-t border-zinc-800/80">
            {events.length === 0 ? (
              <p className="text-zinc-600 italic">{t.pipeline.emptyTrace}</p>
            ) : (
              events.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-zinc-300 leading-relaxed">
                  <span className="text-zinc-600 select-none text-[10px]">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : "--:--"}
                  </span>
                  <span className="text-zinc-400 font-semibold uppercase text-[10px] bg-zinc-900 px-1 rounded border border-zinc-800">
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
