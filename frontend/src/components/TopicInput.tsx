"use client";

import React, { useState } from "react";
import { Search, Loader2, CornerDownLeft, SlidersHorizontal, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface TopicInputProps {
  onSubmit: (topic: string, maxIterations: number) => void;
  isLoading: boolean;
}

const SAMPLE_TOPICS = [
  {
    category: "AI Code",
    query: "Cursor vs GitHub Copilot vs Windsurf"
  },
  {
    category: "Fintech",
    query: "Stripe vs Adyen vs Xendit"
  },
  {
    category: "Cloud DB",
    query: "Supabase vs Firebase vs Neon"
  },
  {
    category: "DevOps",
    query: "Datadog vs Dynatrace vs New Relic"
  }
];

export const TopicInput: React.FC<TopicInputProps> = ({ onSubmit, isLoading }) => {
  const { t } = useLanguage();
  const [topic, setTopic] = useState("");
  const [maxIterations, setMaxIterations] = useState(2);

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
    <div className="w-full max-w-3xl mx-auto space-y-3">
      {/* Search Input Box */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600/50 transition-all shadow-sm"
      >
        <div className="px-3.5 py-3 flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />

          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isLoading}
            placeholder={t.input.placeholder}
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none disabled:opacity-50 font-normal"
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Iteration selector */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400">
              <SlidersHorizontal className="w-3 h-3 text-zinc-500" />
              <span>{t.input.loops}</span>
              <select
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                disabled={isLoading}
                className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value={1} className="bg-zinc-900 text-zinc-200">1x</option>
                <option value={2} className="bg-zinc-900 text-zinc-200">2x</option>
                <option value={3} className="bg-zinc-900 text-zinc-200">3x</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!topic.trim() || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-zinc-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.input.buttonRunning}</span>
                </>
              ) : (
                <>
                  <span>{t.input.buttonIdle}</span>
                  <CornerDownLeft className="w-3 h-3 text-zinc-600" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Balanced 2x2 Preset Grid with Clean Alignment */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 px-1">
          <span>{t.input.presetsLabel}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SAMPLE_TOPICS.map((sample) => (
            <button
              key={sample.query}
              type="button"
              onClick={() => handleChipClick(sample.query)}
              disabled={isLoading}
              className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 text-left transition-all disabled:opacity-50 cursor-pointer group"
            >
              <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                {sample.category}
              </span>
              <span className="text-xs text-zinc-300 group-hover:text-zinc-100 truncate">
                {sample.query}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
