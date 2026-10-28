"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Coins,
  Cpu,
  Hash,
  Layers,
  RefreshCw,
  Timer,
  Zap
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

/** Aggregated, non-sensitive metrics returned by GET /api/observability/langfuse/metrics */
export interface LangfuseMetrics {
  connected: boolean;
  window_days: number;
  generated_at?: string;
  message?: string;
  summary?: {
    total_traces: number;
    total_observations: number;
    llm_generations: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    total_cost_usd: number;
    llm_latency_avg_ms: number;
    llm_latency_p50_ms: number;
    llm_latency_p95_ms: number;
    error_count: number;
    warning_count: number;
    error_rate_pct: number;
  };
  models?: Array<{
    model: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    latency_p95_ms: number;
  }>;
  agents?: Array<{
    node: string;
    runs: number;
    latency_avg_ms: number;
    latency_p95_ms: number;
  }>;
  latency_percentiles?: Array<{
    name: string;
    count: number;
    p50_ms: number;
    p90_ms: number;
    p95_ms: number;
    p99_ms: number;
  }>;
  observation_types?: Array<{ type: string; count: number }>;
  daily?: Array<{ date: string; observations: number; tokens: number; cost_usd: number }>;
}

const LABELS = {
  en: {
    title: "Langfuse LLMOps Metrics",
    desc: "Aggregated metrics pulled live from your self-hosted Langfuse. Only counts, tokens, cost, and latency are shown — no prompts, outputs, or identifiers.",
    range: "Window",
    days: (d: number) => (d === 1 ? "24h" : `${d}d`),
    refresh: "Refresh",
    loading: "Loading metrics from Langfuse...",
    notConnected: "Langfuse is not configured or unreachable. Add LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to backend/.env.",
    traces: "Traces (Runs)",
    observations: "Observations",
    generations: "LLM Calls",
    tokens: "Total Tokens",
    cost: "Total Cost",
    latencyP50: "LLM Latency p50",
    latencyP95: "LLM Latency p95",
    errors: "Error Rate",
    inOut: "in / out",
    perModel: "Usage per Model",
    model: "Model",
    calls: "Calls",
    inputTok: "Input Tok",
    outputTok: "Output Tok",
    costCol: "Cost",
    p95: "p95",
    latencyPercentiles: "Observation Latency Percentiles",
    obsName: "Observation / Node",
    perAgent: "Latency per Agent Node",
    runs: "runs",
    avg: "avg",
    noRuns: "no runs yet",
    daily: "Daily Activity",
    types: "Observation Types",
    noData: "No data in this window yet. Run a research query to generate telemetry.",
    updated: "Updated"
  },
  id: {
    title: "Metrik LLMOps Langfuse",
    desc: "Metrik agregat yang diambil langsung dari Langfuse self-hosted. Hanya menampilkan jumlah, token, biaya, dan latensi — tanpa prompt, output, atau ID.",
    range: "Rentang",
    days: (d: number) => (d === 1 ? "24 jam" : `${d} hari`),
    refresh: "Segarkan",
    loading: "Memuat metrik dari Langfuse...",
    notConnected: "Langfuse belum dikonfigurasi atau tidak dapat dijangkau. Isi LANGFUSE_PUBLIC_KEY dan LANGFUSE_SECRET_KEY di backend/.env.",
    traces: "Trace (Eksekusi)",
    observations: "Observasi",
    generations: "Panggilan LLM",
    tokens: "Total Token",
    cost: "Total Biaya",
    latencyP50: "Latensi LLM p50",
    latencyP95: "Latensi LLM p95",
    errors: "Tingkat Error",
    inOut: "masuk / keluar",
    perModel: "Penggunaan per Model",
    model: "Model",
    calls: "Panggilan",
    inputTok: "Token Masuk",
    outputTok: "Token Keluar",
    costCol: "Biaya",
    p95: "p95",
    latencyPercentiles: "Persentil Latensi Observasi",
    obsName: "Observasi / Node",
    perAgent: "Latensi per Node Agen",
    runs: "eksekusi",
    avg: "rata-rata",
    noRuns: "belum ada eksekusi",
    daily: "Aktivitas Harian",
    types: "Tipe Observasi",
    noData: "Belum ada data pada rentang ini. Jalankan riset untuk menghasilkan telemetri.",
    updated: "Diperbarui"
  }
};

const AGENT_LABELS: Record<string, string> = {
  planner: "Planner",
  researcher: "Researcher",
  fact_checker: "Fact-Checker",
  writer: "Writer"
};

const fmtInt = (n: number) => n.toLocaleString("en-US");
const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : ms > 0 ? `${Math.round(ms)}ms` : "< 1ms");
const fmtUsd = (v: number) => (v === 0 ? "$0" : v < 0.01 ? `$${v.toFixed(5)}` : `$${v.toFixed(3)}`);

export function LangfuseMetricsPanel({ language }: { language: "en" | "id" | string }) {
  const L = language === "id" ? LABELS.id : LABELS.en;
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<LangfuseMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(async (windowDays: number, refresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/observability/langfuse/metrics?days=${windowDays}${refresh ? "&refresh=true" : ""}`
      );
      if (res.ok) setData(await res.json());
      else setData({ connected: false, window_days: windowDays });
    } catch {
      setData({ connected: false, window_days: windowDays });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const s = data?.summary;
  const daily = (data?.daily || []).slice(-Math.min(days, 14));
  const maxDaily = Math.max(1, ...daily.map((d) => d.observations));
  const maxAgentP95 = Math.max(1, ...(data?.agents || []).map((a) => a.latency_p95_ms));
  const totalTypes = Math.max(1, (data?.observation_types || []).reduce((acc, x) => acc + x.count, 0));

  const kpis = s
    ? [
        { label: L.traces, value: fmtInt(s.total_traces), icon: Hash, color: "text-sky-400" },
        { label: L.generations, value: fmtInt(s.llm_generations), sub: `${fmtInt(s.total_observations)} ${L.observations.toLowerCase()}`, icon: Bot, color: "text-emerald-400" },
        { label: L.tokens, value: fmtInt(s.total_tokens), sub: `${fmtInt(s.input_tokens)} / ${fmtInt(s.output_tokens)} ${L.inOut}`, icon: Layers, color: "text-indigo-400" },
        { label: L.cost, value: fmtUsd(s.total_cost_usd), sub: "USD", icon: Coins, color: "text-amber-400" },
        { label: L.latencyP50, value: fmtMs(s.llm_latency_p50_ms), sub: `${L.avg} ${fmtMs(s.llm_latency_avg_ms)}`, icon: Timer, color: "text-sky-400" },
        { label: L.latencyP95, value: fmtMs(s.llm_latency_p95_ms), icon: Activity, color: "text-amber-400" },
        { label: L.errors, value: `${s.error_rate_pct}%`, sub: `${s.error_count} error · ${s.warning_count} warning`, icon: AlertTriangle, color: s.error_count > 0 ? "text-rose-400" : "text-emerald-400" }
      ]
    : [];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 max-w-2xl">
          <h3 className="font-bold text-zinc-100 text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{L.title}</span>
            {data?.connected && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">{L.desc}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                  days === d ? "bg-zinc-800 text-amber-300" : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {L.days(d)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => load(days, true)}
            disabled={loading}
            title={L.refresh}
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* States */}
      {loading && !data ? (
        <div className="py-10 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-400">{L.loading}</p>
        </div>
      ) : !data?.connected || !s ? (
        <div className="p-6 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-xs text-zinc-400">
          {L.notConnected}
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {kpis.map((k) => (
              <div key={k.label} className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold flex items-center gap-1.5 truncate">
                  <k.icon className={`w-3 h-3 ${k.color}`} />
                  {k.label}
                </span>
                <span className={`text-lg font-bold font-mono block ${k.color}`}>{k.value}</span>
                {k.sub && <span className="text-[10px] font-mono text-zinc-500 block truncate">{k.sub}</span>}
              </div>
            ))}
          </div>

          {s.total_observations === 0 ? (
            <div className="p-6 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-xs text-zinc-400">
              {L.noData}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Per-agent latency */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-sky-400" />
                  {L.perAgent}
                </span>
                <div className="space-y-2.5">
                  {(data.agents || []).map((a) => (
                    <div key={a.node} className="space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-zinc-300 font-semibold">{AGENT_LABELS[a.node] || a.node}</span>
                        <span className="text-zinc-500">
                          {a.runs > 0
                            ? `${a.runs} ${L.runs} · ${L.avg} ${fmtMs(a.latency_avg_ms)} · p95 `
                            : L.noRuns}
                          {a.runs > 0 && <span className="text-amber-300 font-bold">{fmtMs(a.latency_p95_ms)}</span>}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-amber-400"
                          style={{ width: `${a.runs > 0 ? Math.max(3, (a.latency_p95_ms / maxAgentP95) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily activity */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  {L.daily}
                </span>
                <div className="flex items-end gap-1 h-28">
                  {daily.map((d) => (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center justify-end gap-1 h-full group"
                      title={`${d.date}: ${d.observations} obs · ${fmtInt(d.tokens)} tok · ${fmtUsd(d.cost_usd)}`}
                    >
                      <div
                        className={`w-full rounded-t ${d.observations > 0 ? "bg-emerald-500/80 group-hover:bg-emerald-400" : "bg-zinc-800"}`}
                        style={{ height: `${d.observations > 0 ? Math.max(6, (d.observations / maxDaily) * 100) : 3}%` }}
                      />
                      <span className="text-[8px] font-mono text-zinc-600">{d.date.slice(8, 10)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-model table */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3 lg:col-span-2 overflow-x-auto">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  {L.perModel}
                </span>
                <table className="w-full font-mono text-[11px] min-w-[520px]">
                  <thead>
                    <tr className="text-zinc-500 uppercase text-[10px] text-left">
                      <th className="py-1.5 font-semibold">{L.model}</th>
                      <th className="py-1.5 font-semibold text-right">{L.calls}</th>
                      <th className="py-1.5 font-semibold text-right">{L.inputTok}</th>
                      <th className="py-1.5 font-semibold text-right">{L.outputTok}</th>
                      <th className="py-1.5 font-semibold text-right">{L.costCol}</th>
                      <th className="py-1.5 font-semibold text-right">{L.p95}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.models || []).map((m) => (
                      <tr key={m.model} className="border-t border-zinc-800/60 text-zinc-300">
                        <td className="py-2 text-zinc-100 font-semibold">{m.model}</td>
                        <td className="py-2 text-right">{fmtInt(m.calls)}</td>
                        <td className="py-2 text-right">{fmtInt(m.input_tokens)}</td>
                        <td className="py-2 text-right">{fmtInt(m.output_tokens)}</td>
                        <td className="py-2 text-right text-amber-300">{fmtUsd(m.cost_usd)}</td>
                        <td className="py-2 text-right">{fmtMs(m.latency_p95_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Observation types */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3 lg:col-span-2">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  {L.types}
                </span>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-zinc-800">
                  {(data.observation_types || []).map((x, i) => (
                    <div
                      key={x.type}
                      className={["bg-sky-500", "bg-amber-400", "bg-emerald-500", "bg-indigo-500", "bg-rose-500"][i % 5]}
                      style={{ width: `${(x.count / totalTypes) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 font-mono text-[11px] text-zinc-400">
                  {(data.observation_types || []).map((x, i) => (
                    <span key={x.type} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-sm ${["bg-sky-500", "bg-amber-400", "bg-emerald-500", "bg-indigo-500", "bg-rose-500"][i % 5]}`} />
                      {x.type} <span className="text-zinc-200 font-semibold">{fmtInt(x.count)}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Observation Latency Percentiles Table (p50, p90, p95, p99 per observation name) */}
              {(data.latency_percentiles || []).length > 0 && (
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3 lg:col-span-2 overflow-x-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-400" />
                      {L.latencyPercentiles}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      p50 · p90 · p95 · p99
                    </span>
                  </div>
                  <table className="w-full font-mono text-[11px] min-w-[520px]">
                    <thead>
                      <tr className="text-zinc-500 uppercase text-[10px] text-left">
                        <th className="py-1.5 font-semibold">{L.obsName}</th>
                        <th className="py-1.5 font-semibold text-right">p50</th>
                        <th className="py-1.5 font-semibold text-right">p90</th>
                        <th className="py-1.5 font-semibold text-right text-amber-400">p95 ▼</th>
                        <th className="py-1.5 font-semibold text-right">p99</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.latency_percentiles?.map((p) => (
                        <tr key={p.name} className="border-t border-zinc-800/60 text-zinc-300">
                          <td className="py-2 text-zinc-100 font-semibold">{p.name}</td>
                          <td className="py-2 text-right text-zinc-400">{fmtMs(p.p50_ms)}</td>
                          <td className="py-2 text-right text-zinc-400">{fmtMs(p.p90_ms)}</td>
                          <td className="py-2 text-right font-bold text-amber-300">{fmtMs(p.p95_ms)}</td>
                          <td className="py-2 text-right text-zinc-400">{fmtMs(p.p99_ms)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {data.generated_at && (
            <p className="text-[10px] font-mono text-zinc-600 text-right">
              {L.updated}: {new Date(data.generated_at).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}
