"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Loader2,
  CornerDownLeft,
  SlidersHorizontal,
  Square,
  X,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface TopicInputProps {
  onSubmit: (topic: string, maxIterations: number) => void;
  onStop?: () => void;
  isLoading: boolean;
  activeTopic?: string;
}

interface PresetTopic {
  category: string;
  query: string;
  badgeColor: string;
}

const SAMPLE_TOPICS_EN: PresetTopic[] = [
  {
    category: "AI Code",
    query: "Cursor vs GitHub Copilot vs Windsurf",
    badgeColor: "text-emerald-300 bg-emerald-950/50 border-emerald-800/50"
  },
  {
    category: "Fintech",
    query: "Stripe vs Adyen vs Xendit",
    badgeColor: "text-sky-300 bg-sky-950/50 border-sky-800/50"
  },
  {
    category: "Cloud DB",
    query: "Supabase vs Firebase vs Neon",
    badgeColor: "text-indigo-300 bg-indigo-950/50 border-indigo-800/50"
  },
  {
    category: "DevOps",
    query: "Datadog vs Dynatrace vs New Relic",
    badgeColor: "text-amber-300 bg-amber-950/50 border-amber-800/50"
  }
];

const SAMPLE_TOPICS_ID: PresetTopic[] = [
  {
    category: "Fintech",
    query: "Bandingkan GoPay vs OVO vs DANA",
    badgeColor: "text-sky-300 bg-sky-950/50 border-sky-800/50"
  },
  {
    category: "E-Commerce",
    query: "Analisis Tokopedia vs Shopee vs Blibli",
    badgeColor: "text-emerald-300 bg-emerald-950/50 border-emerald-800/50"
  },
  {
    category: "Cloud DB",
    query: "Perbandingan Supabase vs Firebase vs Neon",
    badgeColor: "text-indigo-300 bg-indigo-950/50 border-indigo-800/50"
  },
  {
    category: "AI Code",
    query: "Cursor vs GitHub Copilot vs Windsurf",
    badgeColor: "text-amber-300 bg-amber-950/50 border-amber-800/50"
  }
];

export const TopicInput: React.FC<TopicInputProps> = ({
  onSubmit,
  onStop,
  isLoading,
  activeTopic
}) => {
  const { language, t } = useLanguage();
  const [topic, setTopic] = useState("");
  const [maxIterations, setMaxIterations] = useState(2);

  const sampleTopics = React.useMemo(() => {
    return language === "id" ? SAMPLE_TOPICS_ID : SAMPLE_TOPICS_EN;
  }, [language]);

  useEffect(() => {
    if (activeTopic && activeTopic !== topic) {
      setTopic(activeTopic);
    }
  }, [activeTopic]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    onSubmit(topic.trim(), maxIterations);
  };

  const handleChipClick = (query: string) => {
    if (isLoading) return;
    setTopic(query);
    onSubmit(query, maxIterations);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3.5 print:hidden">
      {/* Command-Center Search Input Card */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-zinc-900/95 border border-zinc-800 rounded-2xl focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300 shadow-lg hover:border-zinc-700/80"
      >
        <div className="px-3.5 sm:px-4 py-3 sm:py-3.5 flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-[180px]">
            <Search
              className={`w-4 h-4 shrink-0 transition-colors ${
                topic.trim() ? "text-emerald-400" : "text-zinc-400"
              }`}
            />

            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isLoading}
              placeholder={t.input.placeholder}
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-base sm:text-sm focus:outline-none disabled:opacity-50 font-normal"
            />

            {topic && !isLoading && (
              <button
                type="button"
                onClick={() => setTopic("")}
                aria-label="Clear topic"
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-zinc-800/70 shrink-0">
            {/* Self-Correction Loop Depth Selector with Helpful Tooltip */}
            <div
              title={
                language === "id"
                  ? "Jumlah maksimum siklus verifikasi ulang (Fact-Checker Loop) jika bukti web belum lengkap"
                  : "Maximum Fact-Checker self-correction loops if web evidence is incomplete"
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[11px] font-mono text-zinc-400 transition-colors min-h-[38px]"
            >
              <SlidersHorizontal className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{t.input.loops}</span>
              <select
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                disabled={isLoading}
                className="bg-transparent text-zinc-100 font-semibold focus:outline-none cursor-pointer"
              >
                <option value={1} className="bg-zinc-900 text-zinc-200">
                  1x {language === "id" ? "(Cepat)" : "(Fast)"}
                </option>
                <option value={2} className="bg-zinc-900 text-zinc-200">
                  2x {language === "id" ? "(Standar)" : "(Balanced)"}
                </option>
                <option value={3} className="bg-zinc-900 text-zinc-200">
                  3x {language === "id" ? "(Mendalam)" : "(Deep)"}
                </option>
              </select>
            </div>

            {isLoading && onStop ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStop();
                }}
                className="flex items-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white border border-rose-500 hover:bg-rose-500 cursor-pointer shadow-xs interactive-btn min-h-[38px]"
              >
                <Square className="w-3 h-3 fill-white text-white" />
                <span>{t.input.buttonStop}</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!topic.trim() || isLoading}
                className="flex items-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer disabled:cursor-not-allowed shadow-xs interactive-btn min-h-[38px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.input.buttonRunning}</span>
                  </>
                ) : (
                  <>
                    <span>{t.input.buttonIdle}</span>
                    <CornerDownLeft className="w-3 h-3 opacity-80" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Balanced 2x2 Quick Presets Grid */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{t.input.presetsLabel}</span>
          </span>
          <span className="text-[10px] text-zinc-500 hidden sm:inline">
            {language === "id"
              ? "Klik contoh topik untuk langsung memulai riset 4-dimensi"
              : "Click any preset to launch a 4-dimension competitor audit"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sampleTopics.map((sample) => {
            const isSelected =
              topic.toLowerCase() === sample.query.toLowerCase();
            return (
              <button
                key={sample.query}
                type="button"
                onClick={() => handleChipClick(sample.query)}
                disabled={isLoading}
                className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left disabled:opacity-50 cursor-pointer group interactive-card ${
                  isSelected
                    ? "bg-zinc-800/95 border-emerald-500/60 text-zinc-100 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                    : "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700/90 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded-md border shrink-0 font-semibold ${sample.badgeColor}`}
                  >
                    {sample.category}
                  </span>
                  <span className="text-xs text-zinc-300 group-hover:text-zinc-100 truncate font-medium">
                    {sample.query}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
