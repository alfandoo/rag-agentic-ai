"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Cpu,
  Layers,
  Workflow,
  Sparkles,
  Database,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Activity,
  Terminal,
  Search,
  Globe
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/context/LanguageContext";

export default function AboutPage() {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "architecture" | "innovations" | "stack">("overview");

  const ab = t.about;

  return (
    <div className="min-h-screen bg-zinc-950 bg-ambient-glow text-zinc-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Top Breadcrumb & Back Link */}
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
            href="/observability"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-sky-300 font-mono transition-colors group cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {language === "id" ? "Buka Observabilitas Live" : "Open Live Observability"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Hero Section */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/95 border border-zinc-800 shadow-xl space-y-4 animate-slide-down">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              {ab.modalBadge}
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              {language === "id" ? "Proyek Portofolio AI Engineer" : "AI Engineering Portfolio Project"}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-3">
              <Cpu className="w-8 h-8 text-emerald-400 shrink-0" />
              <span>{ab.modalTitle}</span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-normal">
              {ab.tagline}
            </p>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block truncate">
                {ab.overview.kpi1Title}
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                {ab.overview.kpi1Value}
              </span>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 leading-tight mt-0.5">
                {ab.overview.kpi1Desc}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block truncate">
                {ab.overview.kpi2Title}
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-sky-400">
                {ab.overview.kpi2Value}
              </span>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 leading-tight mt-0.5">
                {ab.overview.kpi2Desc}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block truncate">
                {ab.overview.kpi3Title}
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-amber-400">
                {ab.overview.kpi3Value}
              </span>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 leading-tight mt-0.5">
                {ab.overview.kpi3Desc}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block truncate">
                {ab.overview.kpi4Title}
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                {ab.overview.kpi4Value}
              </span>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 leading-tight mt-0.5">
                {ab.overview.kpi4Desc}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1.5 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none touch-pan-x">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 whitespace-nowrap interactive-btn ${
              activeTab === "overview"
                ? "bg-zinc-800 text-emerald-300 border border-emerald-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{ab.tabs.overview}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("architecture")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 whitespace-nowrap interactive-btn ${
              activeTab === "architecture"
                ? "bg-zinc-800 text-emerald-300 border border-emerald-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Workflow className="w-3.5 h-3.5 text-emerald-400" />
            <span>{ab.tabs.architecture}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("innovations")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 whitespace-nowrap interactive-btn ${
              activeTab === "innovations"
                ? "bg-zinc-800 text-emerald-300 border border-emerald-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{ab.tabs.innovations}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stack")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 whitespace-nowrap interactive-btn ${
              activeTab === "stack"
                ? "bg-zinc-800 text-emerald-300 border border-emerald-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>{ab.tabs.stack}</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-slide-up">
            {/* Comparison Grid: Single-Turn Chat vs Multi-Agent System */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs uppercase font-mono tracking-wider">
                  <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{ab.overview.problemTitle}</span>
                </div>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {ab.overview.problemDesc}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase font-mono tracking-wider">
                  <Workflow className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{ab.overview.solutionTitle}</span>
                </div>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {ab.overview.solutionDesc}
                </p>
              </div>
            </div>

            {/* Engineering Summary Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{ab.overview.title}</span>
              </h3>
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                {ab.overview.summary}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Architecture */}
        {activeTab === "architecture" && (
          <div className="space-y-6 animate-slide-up">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-100">
                {ab.architecture.title}
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                {ab.architecture.desc}
              </p>
            </div>

            {/* 4 Agent Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-sky-900/40 hover:border-sky-500/60 transition-colors space-y-2 interactive-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm">
                    {ab.architecture.agent1Name}
                  </span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/50">
                    {ab.architecture.agent1Role}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {ab.architecture.agent1Desc}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-indigo-900/40 hover:border-indigo-500/60 transition-colors space-y-2 interactive-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm">
                    {ab.architecture.agent2Name}
                  </span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                    {ab.architecture.agent2Role}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {ab.architecture.agent2Desc}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-amber-900/40 hover:border-amber-500/60 transition-colors space-y-2 interactive-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm">
                    {ab.architecture.agent3Name}
                  </span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                    {ab.architecture.agent3Role}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {ab.architecture.agent3Desc}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-emerald-900/40 hover:border-emerald-500/60 transition-colors space-y-2 interactive-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm">
                    {ab.architecture.agent4Name}
                  </span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                    {ab.architecture.agent4Role}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {ab.architecture.agent4Desc}
                </p>
              </div>
            </div>

            {/* Self-Correction Loop Banner */}
            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/50 shrink-0 mt-0.5">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-zinc-100 text-sm">
                  {ab.architecture.loopTitle}
                </h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {ab.architecture.loopDesc}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Innovations */}
        {activeTab === "innovations" && (
          <div className="space-y-6 animate-slide-up">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-100">
                {ab.innovations.title}
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                {ab.innovations.desc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ab.innovations.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-2.5 flex flex-col justify-between interactive-card"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-zinc-100 text-sm">
                        {item.title}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-700/80 text-emerald-300 font-semibold shrink-0">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Tech Stack */}
        {activeTab === "stack" && (
          <div className="space-y-6 animate-slide-up">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-100">
                {ab.stack.title}
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                {ab.stack.desc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ab.stack.categories.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 interactive-card"
                >
                  <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    {cat.category}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map((it, i) => (
                      <span
                        key={i}
                        className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <p className="font-mono text-xs text-zinc-500">
                {ab.stack.footerNote}
              </p>
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
