"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Download, 
  ExternalLink, 
  FileText, 
  Table, 
  Grid, 
  Link2,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { CompetitorReport } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface ReportViewerProps {
  report: CompetitorReport;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report }) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "matrix" | "swot" | "sources">("overview");
  const [copied, setCopied] = useState(false);

  const isVerified = report.confidence_score === undefined || report.confidence_score >= 80;
  const score = report.confidence_score !== undefined ? report.confidence_score : 80;

  const handleDownloadMarkdown = () => {
    let mdContent = `# ${report.title}\n\n`;
    mdContent += `*Date: ${report.generated_at}*\n`;
    mdContent += `*Audit Confidence: ${score.toFixed(1)}% (${isVerified ? "VERIFIED" : "PARTIAL EVIDENCE - UNVERIFIED DATA POINTS"})*\n\n`;
    
    if (!isVerified) {
      mdContent += `> ⚠️ **AUDIT WARNING**: Verification score was ${score.toFixed(1)}%. Certain pricing points or metrics could not be confirmed from official public web sources. Do not rely on unverified claims without secondary confirmation.\n\n`;
    }

    mdContent += `## ${t.report.sections.executiveSummary}\n${report.executive_summary}\n\n`;
    mdContent += `## ${t.report.sections.marketOverview}\n${report.market_overview}\n\n`;
    mdContent += `## ${t.report.sections.featureMatrix}\n${report.feature_matrix_markdown}\n\n`;
    mdContent += `## ${t.report.sections.pricingMatrix}\n${report.pricing_matrix_markdown}\n\n`;
    
    mdContent += `## ${t.report.sections.competitorProfiles}\n`;
    report.competitor_profiles.forEach(p => {
      mdContent += `### ${p.name}\n- **Tagline**: ${p.tagline}\n- **Pricing**: ${p.pricing_summary}\n- **Target Audience**: ${p.market_positioning}\n- **Key Features**: ${p.key_features.join(", ")}\n- **Pros**: ${p.pros.join(", ")}\n- **Cons**: ${p.cons.join(", ")}\n\n`;
    });

    mdContent += `## ${t.report.sections.swotTitle}\n`;
    report.swot_analyses.forEach(s => {
      mdContent += `### ${s.competitor}\n- **Strengths**: ${s.strengths.join(", ")}\n- **Weaknesses**: ${s.weaknesses.join(", ")}\n- **Opportunities**: ${s.opportunities.join(", ")}\n- **Threats**: ${s.threats.join(", ")}\n\n`;
    });

    mdContent += `## ${t.report.sections.strategicRecommendations}\n`;
    report.strategic_recommendations.forEach((rec, i) => {
      mdContent += `${i + 1}. ${rec}\n`;
    });

    mdContent += `\n## ${t.report.sections.sourcesTitle}\n`;
    report.verified_citations.forEach((c) => {
      mdContent += `- [${c.title}](${c.url}) (${c.source_engine})\n`;
    });

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_report.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report.executive_summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pt-2">
      {/* Top Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              {isVerified ? (
                <span className="font-mono text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {t.report.badge}
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {language === "id" ? `Bukti Parsial (${score.toFixed(1)}%)` : `Partial Evidence (${score.toFixed(1)}%)`}
                </span>
              )}
              <span className="text-[11px] font-mono text-zinc-500">{report.generated_at}</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">{report.title}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
            >
              {copied ? t.report.copiedSummary : t.report.copySummary}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.report.exportMarkdown}</span>
            </button>
          </div>
        </div>

        {/* Audit Warning Banner if score < 80% */}
        {!isVerified && (
          <div className="mt-3.5 p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed font-sans">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">
                {language === "id" 
                  ? `Peringatan Kualitas Data (Tingkat Keyakinan: ${score.toFixed(1)}%)` 
                  : `Data Quality Audit Notice (Confidence: ${score.toFixed(1)}%)`}
              </p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                {language === "id"
                  ? "Sebagian data harga atau rincian spesifik untuk kompetitor ini tidak ditemukan di sumber publik resmi. Sistem menerapkan aturan ketat anti-halusinasi sehingga tidak mengarang angka. Periksa rujukan sumber sebelum mengambil keputusan bisnis."
                  : "Certain pricing tiers or specific competitor metrics could not be confirmed from official public sources. The agent enforced strict anti-hallucination guardrails and refused to invent numbers. Verify with primary sources before making strategic decisions."}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 pt-3 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {t.report.tabs.overview}
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "matrix"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            {t.report.tabs.matrix}
          </button>
          <button
            onClick={() => setActiveTab("swot")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "swot"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            {t.report.tabs.swot}
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === "sources"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            {t.report.tabs.sources} ({report.verified_citations.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Tab 1: Executive Summary & Profiles */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Executive Summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                {t.report.sections.executiveSummary}
              </h3>
              <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                {report.executive_summary}
              </p>
            </div>

            {/* Market Overview */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                {t.report.sections.marketOverview}
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                {report.market_overview}
              </p>
            </div>

            {/* Profiles */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 px-1">
                {t.report.sections.competitorProfiles}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.competitor_profiles.map((comp, idx) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-zinc-100 text-base">{comp.name}</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">{comp.tagline}</p>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                        {comp.market_positioning}
                      </span>
                    </div>

                    <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 text-xs">
                      <span className="text-zinc-500 font-mono">{t.report.sections.pricingModel} </span>
                      <span className="text-zinc-300 font-medium">{comp.pricing_summary}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-zinc-800/60">
                      <div>
                        <span className="font-mono text-[11px] text-zinc-400 uppercase block mb-1">
                          {t.report.sections.pros}
                        </span>
                        <ul className="space-y-1 text-zinc-300">
                          {comp.pros.map((p, i) => (
                            <li key={i} className="text-[11px] leading-tight">• {p}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-mono text-[11px] text-zinc-400 uppercase block mb-1">
                          {t.report.sections.cons}
                        </span>
                        <ul className="space-y-1 text-zinc-400">
                          {comp.cons.map((c, i) => (
                            <li key={i} className="text-[11px] leading-tight">• {c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Recommendations */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                {t.report.sections.strategicRecommendations}
              </h3>
              <div className="space-y-2">
                {report.strategic_recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <span className="font-mono text-zinc-500 shrink-0 mt-0.5">[{i + 1}]</span>
                    <p className="leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Matrices */}
        {activeTab === "matrix" && (
          <div className="space-y-5">
            {/* Feature Matrix */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                {t.report.sections.featureMatrix}
              </h3>
              <div className="overflow-x-auto text-xs text-zinc-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <table className="w-full border-collapse border border-zinc-800 text-left my-2" {...props} />
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-zinc-950 font-mono text-zinc-400" {...props} />,
                    th: ({ node, ...props }) => (
                      <th className="border border-zinc-800 px-3 py-2 text-[11px] font-semibold" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="border border-zinc-800/80 px-3 py-2 text-xs" {...props} />
                    ),
                  }}
                >
                  {report.feature_matrix_markdown}
                </ReactMarkdown>
              </div>
            </div>

            {/* Pricing Matrix */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                {t.report.sections.pricingMatrix}
              </h3>
              <div className="overflow-x-auto text-xs text-zinc-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <table className="w-full border-collapse border border-zinc-800 text-left my-2" {...props} />
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-zinc-950 font-mono text-zinc-400" {...props} />,
                    th: ({ node, ...props }) => (
                      <th className="border border-zinc-800 px-3 py-2 text-[11px] font-semibold" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="border border-zinc-800/80 px-3 py-2 text-xs" {...props} />
                    ),
                  }}
                >
                  {report.pricing_matrix_markdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: SWOT Analysis */}
        {activeTab === "swot" && (
          <div className="space-y-4">
            {report.swot_analyses.map((swot, idx) => (
              <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center justify-between">
                  <span>{t.report.sections.swotTitle}: {swot.competitor}</span>
                  <span className="font-mono text-[10px] text-zinc-500 uppercase">Competitive Audit</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Strengths */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                    <span className="font-mono text-[10px] uppercase font-semibold text-zinc-400">
                      Strengths (Kekuatan)
                    </span>
                    <ul className="space-y-1 text-zinc-300">
                      {swot.strengths.map((s, i) => (
                        <li key={i} className="text-[11px] leading-tight">• {s}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                    <span className="font-mono text-[10px] uppercase font-semibold text-zinc-400">
                      Weaknesses (Kelemahan)
                    </span>
                    <ul className="space-y-1 text-zinc-300">
                      {swot.weaknesses.map((w, i) => (
                        <li key={i} className="text-[11px] leading-tight">• {w}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Opportunities */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                    <span className="font-mono text-[10px] uppercase font-semibold text-zinc-400">
                      Opportunities (Peluang)
                    </span>
                    <ul className="space-y-1 text-zinc-300">
                      {swot.opportunities.map((o, i) => (
                        <li key={i} className="text-[11px] leading-tight">• {o}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Threats */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                    <span className="font-mono text-[10px] uppercase font-semibold text-zinc-400">
                      Threats (Ancaman)
                    </span>
                    <ul className="space-y-1 text-zinc-300">
                      {swot.threats.map((t, i) => (
                        <li key={i} className="text-[11px] leading-tight">• {t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Sources */}
        {activeTab === "sources" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              {t.report.sections.sourcesTitle}
            </h3>
            <p className="text-xs text-zinc-500">
              {t.report.sections.sourcesSubtitle}
            </p>

            <div className="divide-y divide-zinc-800/80">
              {report.verified_citations.map((c, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-200 hover:text-zinc-100 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <span>{c.title}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                    <p className="text-[11px] text-zinc-400 italic">"{c.snippet}"</p>
                    <p className="text-[10px] font-mono text-zinc-500 truncate">{c.url}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                    {c.source_engine.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
