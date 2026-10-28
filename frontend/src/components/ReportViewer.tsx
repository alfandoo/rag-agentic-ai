"use client";

import React, { useState, useMemo } from "react";
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
  CheckCircle2,
  Printer,
  Copy,
  Check,
  Search,
  ArrowUpRight,
  Users,
  ShieldCheck,
  Globe,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  LayoutGrid,
  Columns,
  FileDown,
  Loader2
} from "lucide-react";
import { CompetitorReport } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { downloadReportPdf } from "@/lib/pdfExporter";

interface ReportViewerProps {
  report: CompetitorReport;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report }) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "matrix" | "swot" | "sources">("overview");
  const [selectedSwotCompetitor, setSelectedSwotCompetitor] = useState<string>("all");
  const [swotViewMode, setSwotViewMode] = useState<"cards" | "matrix">("cards");
  const [sourceSearch, setSourceSearch] = useState<string>("");
  const [selectedEngine, setSelectedEngine] = useState<string>("all");
  const [selectedDimension, setSelectedDimension] = useState<string>("all");
  const [selectedSourceCompetitor, setSelectedSourceCompetitor] = useState<string>("all");
  const [showAllSources, setShowAllSources] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  // Keep real-time clock updated every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Align threshold with backend Fact-Checker (80%)
  const isVerified = report.confidence_score === undefined || report.confidence_score >= 80;
  const score = report.confidence_score !== undefined ? report.confidence_score : 80;

  // Total SWOT insights mapped across all 4 quadrants
  const totalSwotInsights = useMemo(() => {
    return report.swot_analyses.reduce(
      (acc, s) =>
        acc +
        (s.strengths?.length || 0) +
        (s.weaknesses?.length || 0) +
        (s.opportunities?.length || 0) +
        (s.threats?.length || 0),
      0
    );
  }, [report.swot_analyses]);

  // Filtered SWOT cards
  const filteredSwotList = useMemo(() => {
    if (selectedSwotCompetitor === "all") return report.swot_analyses;
    return report.swot_analyses.filter(
      (s) => s.competitor.toLowerCase() === selectedSwotCompetitor.toLowerCase()
    );
  }, [report.swot_analyses, selectedSwotCompetitor]);

  // Distinct competitors present in citations or profiles
  const sourceCompetitorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    report.competitor_profiles.forEach((p) => {
      counts[p.name] = 0;
    });
    report.verified_citations.forEach((c) => {
      if (c.competitor) {
        const matchedKey =
          Object.keys(counts).find(
            (k) => k.toLowerCase() === c.competitor!.toLowerCase()
          ) || c.competitor;
        counts[matchedKey] = (counts[matchedKey] || 0) + 1;
      }
    });
    return counts;
  }, [report.competitor_profiles, report.verified_citations]);

  // Filtered Sources
  const filteredSources = useMemo(() => {
    return report.verified_citations.filter((c) => {
      const matchesEngine =
        selectedEngine === "all" || c.source_engine === selectedEngine;
      const matchesDimension =
        selectedDimension === "all" || c.dimension === selectedDimension;
      const matchesCompetitor =
        selectedSourceCompetitor === "all" ||
        (c.competitor &&
          c.competitor.toLowerCase() ===
            selectedSourceCompetitor.toLowerCase());
      const q = sourceSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.url.toLowerCase().includes(q) ||
        c.snippet.toLowerCase().includes(q) ||
        (c.competitor && c.competitor.toLowerCase().includes(q));
      return (
        matchesEngine &&
        matchesDimension &&
        matchesCompetitor &&
        matchesQuery
      );
    });
  }, [
    report.verified_citations,
    selectedEngine,
    selectedDimension,
    selectedSourceCompetitor,
    sourceSearch
  ]);

  const visibleSources = useMemo(() => {
    if (showAllSources) return filteredSources;
    return filteredSources.slice(0, 8);
  }, [filteredSources, showAllSources]);

  const getDimensionBadgeStyle = (dim?: string) => {
    switch (dim) {
      case "pricing_model":
        return "text-emerald-300 bg-emerald-950/50 border-emerald-800/50";
      case "product_features":
        return "text-sky-300 bg-sky-950/50 border-sky-800/50";
      case "user_sentiment":
        return "text-amber-300 bg-amber-950/50 border-amber-800/50";
      case "go_to_market":
        return "text-indigo-300 bg-indigo-950/50 border-indigo-800/50";
      default:
        return "text-zinc-300 bg-zinc-900 border-zinc-800";
    }
  };

  const extractHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  // Format report timestamp using real-time local clock in user's selected language
  const formattedDate = useMemo(() => {
    const nowTime = now;
    let targetDate = nowTime;

    if (report.generated_at) {
      const parsed = new Date(report.generated_at);
      // Only use parsed date if it's from today (not an LLM-hallucinated date like Oct 20, 2026)
      const isSameDay =
        !isNaN(parsed.getTime()) &&
        parsed.getFullYear() === nowTime.getFullYear() &&
        parsed.getMonth() === nowTime.getMonth() &&
        parsed.getDate() === nowTime.getDate();

      if (isSameDay) {
        targetDate = parsed;
      }
    }

    return targetDate.toLocaleString(language === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }, [report.generated_at, language, now]);

  const jumpToCompetitorSwot = (compName: string) => {
    const hasMatch = report.swot_analyses.some(
      (s) => s.competitor.toLowerCase() === compName.toLowerCase()
    );
    setSelectedSwotCompetitor(hasMatch ? compName : "all");
    setActiveTab("swot");
  };

  const jumpToCompetitorSources = (compName: string) => {
    const hasMatch = report.verified_citations.some(
      (c) => c.competitor && c.competitor.toLowerCase() === compName.toLowerCase()
    );
    setSelectedSourceCompetitor(hasMatch ? compName : "all");
    setSelectedEngine("all");
    setSelectedDimension("all");
    setSourceSearch("");
    setActiveTab("sources");
  };

  const buildFullMarkdown = () => {
    const isId = language === "id";
    const dateLabel = isId ? "Tanggal" : "Date";
    const confidenceLabel = isId ? "Tingkat Keyakinan Audit" : "Audit Confidence";
    const statusLabel = isVerified
      ? (isId ? "TERVERIFIKASI" : "VERIFIED")
      : (isId ? "BUKTI PARSIAL - DATA BELUM LENGKAP" : "PARTIAL EVIDENCE - UNVERIFIED DATA POINTS");

    let mdContent = `# ${report.title}\n\n`;
    mdContent += `*${dateLabel}: ${formattedDate}*\n`;
    mdContent += `*${confidenceLabel}: ${score.toFixed(1)}% (${statusLabel})*\n\n`;

    if (!isVerified) {
      const warnTitle = isId ? "PERINGATAN AUDIT" : "AUDIT WARNING";
      const warnDefault = isId ? "Bukti parsial yang berhasil dihimpun." : "Partial evidence gathered.";
      mdContent += `> ⚠️ **${warnTitle} (${score.toFixed(1)}%)**: ${
        report.audit_critique || warnDefault
      }\n`;
      if (report.missing_data_points && report.missing_data_points.length > 0) {
        report.missing_data_points.forEach((pt) => {
          mdContent += `> - ${pt}\n`;
        });
      }
      mdContent += `\n`;
    }

    mdContent += `## ${t.report.sections.executiveSummary}\n${report.executive_summary}\n\n`;
    mdContent += `## ${t.report.sections.marketOverview}\n${report.market_overview}\n\n`;
    mdContent += `## ${t.report.sections.featureMatrix}\n${report.feature_matrix_markdown}\n\n`;
    mdContent += `## ${t.report.sections.pricingMatrix}\n${report.pricing_matrix_markdown}\n\n`;

    const tagLabel = isId ? "Posisi / Slogan" : "Tagline";
    const priceLabel = isId ? "Model Harga" : "Pricing";
    const sentLabel = isId ? "Sentimen Pengguna" : "User Sentiment";
    const sentDefault = isId ? "Adopsi pengguna & pengembang positif" : "Positive developer & user adoption";
    const audLabel = isId ? "Segmen Target" : "Target Audience";
    const featLabel = isId ? "Fitur Utama" : "Key Features";
    const prosLabel = isId ? "Kelebihan" : "Pros";
    const consLabel = isId ? "Kekurangan" : "Cons";

    mdContent += `## ${t.report.sections.competitorProfiles}\n`;
    report.competitor_profiles.forEach((p) => {
      mdContent += `### ${p.name}\n- **${tagLabel}**: ${p.tagline}\n- **${priceLabel}**: ${
        p.pricing_summary
      }\n- **${sentLabel}**: ${
        p.user_sentiment || sentDefault
      }\n- **${audLabel}**: ${p.market_positioning}\n- **${featLabel}**: ${p.key_features.join(
        ", "
      )}\n- **${prosLabel}**: ${p.pros.join(", ")}\n- **${consLabel}**: ${p.cons.join(", ")}\n\n`;
    });

    const strLabel = isId ? "Kekuatan" : "Strengths";
    const weakLabel = isId ? "Kelemahan" : "Weaknesses";
    const oppLabel = isId ? "Peluang" : "Opportunities";
    const thrLabel = isId ? "Ancaman" : "Threats";

    mdContent += `## ${t.report.sections.swotTitle}\n`;
    report.swot_analyses.forEach((s) => {
      mdContent += `### ${s.competitor}\n- **${strLabel}**: ${s.strengths.join(
        ", "
      )}\n- **${weakLabel}**: ${s.weaknesses.join(
        ", "
      )}\n- **${oppLabel}**: ${s.opportunities.join(
        ", "
      )}\n- **${thrLabel}**: ${s.threats.join(", ")}\n\n`;
    });

    mdContent += `## ${t.report.sections.strategicRecommendations}\n`;
    report.strategic_recommendations.forEach((rec, i) => {
      mdContent += `${i + 1}. ${rec}\n`;
    });

    mdContent += `\n## ${t.report.sections.sourcesTitle}\n`;
    report.verified_citations.forEach((c) => {
      mdContent += `- [${c.title}](${c.url}) (${c.source_engine})\n`;
    });
    return mdContent;
  };

  const handleDownloadMarkdown = () => {
    const mdContent = buildFullMarkdown();
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase()}_report.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildFullMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      await downloadReportPdf({
        report,
        language,
        formattedDate,
      });
    } catch (err) {
      console.error("Direct PDF export failed, falling back to window.print():", err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Smart cell formatter for Comparison Matrices
  const renderMatrixCellContent = (children: React.ReactNode) => {
    if (typeof children === "string") {
      const text = children.trim();
      const lower = text.toLowerCase();
      if (lower.startsWith("ya ") || lower.startsWith("ya,") || lower.startsWith("ya (") || lower === "ya" || lower.startsWith("yes ") || lower.startsWith("yes,") || lower.startsWith("yes (") || lower === "yes") {
        const match = text.match(/^(Ya|Yes)\b(.*)/i);
        if (match) {
          return (
            <span>
              <span className="inline-flex items-center px-1.5 py-0.2 mr-1.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                {match[1]}
              </span>
              <span className="text-zinc-200">{match[2]}</span>
            </span>
          );
        }
      }
      if (lower.startsWith("tidak ") || lower.startsWith("tidak,") || lower.startsWith("tidak (") || lower === "tidak" || lower.startsWith("no ") || lower.startsWith("no,") || lower.startsWith("no (") || lower === "no") {
        const match = text.match(/^(Tidak|No)\b(.*)/i);
        if (match) {
          return (
            <span>
              <span className="inline-flex items-center px-1.5 py-0.2 mr-1.5 rounded text-[10px] font-mono font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/50">
                {match[1]}
              </span>
              <span className="text-zinc-400">{match[2]}</span>
            </span>
          );
        }
      }
      if (
        lower.includes("belum terverifikasi") ||
        lower.includes("not verified") ||
        lower.includes("verifikasi diperlukan") ||
        lower.includes("verification required") ||
        lower.includes("data tidak ditemukan") ||
        lower.includes("official quote required")
      ) {
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/40 text-amber-300/90 border border-amber-800/40 leading-snug">
            <AlertTriangle className="w-2.5 h-2.5 mr-1 text-amber-400 shrink-0" />
            {text}
          </span>
        );
      }
    }
    return children;
  };

  // Helper to highlight leading labels or key phrases in SWOT bullet points
  const renderSwotText = (text: string) => {
    if (!text) return null;
    const colonIdx = text.indexOf(":");
    if (colonIdx > 0 && colonIdx < 45 && !text.slice(0, colonIdx).includes("http")) {
      const label = text.slice(0, colonIdx).trim();
      const rest = text.slice(colonIdx + 1).trim();
      return (
        <span>
          <strong className="text-zinc-100 font-semibold tracking-tight">{label}:</strong>{" "}
          <span className="text-zinc-300">{rest}</span>
        </span>
      );
    }
    return <span className="text-zinc-200">{text}</span>;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-5 pt-1">
      {/* Top Header Card */}
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm print-card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 sm:gap-4 pb-4 border-b border-zinc-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {isVerified ? (
                <span className="font-mono text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {t.report.badge}
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase font-semibold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-md border border-amber-800/60 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {language === "id"
                    ? `Bukti Parsial (${score.toFixed(1)}%)`
                    : `Partial Evidence (${score.toFixed(1)}%)`}
                </span>
              )}
              <span className="text-[11px] font-mono text-zinc-500">
                {formattedDate}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-zinc-100 tracking-tight leading-snug">
              {report.title}
            </h2>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0 print:hidden">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-mono text-zinc-300 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 cursor-pointer interactive-btn min-h-[36px]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">{t.report.copiedSummary}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{t.report.copySummary}</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-mono text-zinc-200 bg-zinc-950 hover:bg-zinc-800 border border-zinc-700/80 hover:border-emerald-500/50 cursor-pointer shadow-xs interactive-btn min-h-[36px] disabled:opacity-50"
              title={
                language === "id"
                  ? "Unduh Berkas Intelijen Lengkap sebagai file PDF"
                  : "Download Complete Intelligence Dossier as PDF file"
              }
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span className="text-emerald-300">
                    {language === "id" ? "Membuat PDF..." : "Exporting..."}
                  </span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.report.printPdf}</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 cursor-pointer shadow-xs interactive-btn min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.report.exportMarkdown}</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-3.5 sm:pt-4">
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between interactive-card">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block truncate">
                {t.report.kpi.competitors}
              </span>
              <span className="text-sm sm:text-base font-bold text-zinc-100 font-mono">
                {report.competitor_profiles.length}
              </span>
            </div>
            <Users className="w-4 h-4 text-zinc-500 shrink-0" />
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between interactive-card">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block truncate">
                {t.report.kpi.swotPoints}
              </span>
              <span className="text-sm sm:text-base font-bold text-zinc-100 font-mono">
                {totalSwotInsights}
              </span>
            </div>
            <Grid className="w-4 h-4 text-sky-400/80 shrink-0" />
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between interactive-card">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block truncate">
                {t.report.kpi.verifiedSources}
              </span>
              <span className="text-sm sm:text-base font-bold text-zinc-100 font-mono">
                {report.verified_citations.length}
              </span>
            </div>
            <Globe className="w-4 h-4 text-indigo-400/80 shrink-0" />
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between interactive-card">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-zinc-500 truncate">
                {t.report.kpi.confidenceScore}
              </span>
              <ShieldCheck
                className={`w-4 h-4 shrink-0 ${
                  isVerified ? "text-emerald-400" : "text-amber-400"
                }`}
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs sm:text-sm font-bold font-mono ${
                  isVerified ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {score.toFixed(1)}%
              </span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isVerified ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Audit Warning Banner if score < 80% */}
        {!isVerified && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed font-sans">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-semibold text-amber-300">
                {language === "id"
                  ? `Catatan Audit Kualitas Data (Tingkat Keyakinan: ${score.toFixed(1)}%)`
                  : `Data Quality Audit Notice (Confidence: ${score.toFixed(1)}%)`}
              </p>
              {report.audit_critique ? (
                <p className="text-[11px] text-amber-200/90">
                  {report.audit_critique}
                </p>
              ) : (
                <p className="text-[11px] text-amber-200/80">
                  {language === "id"
                    ? "Beberapa rincian metrik spesifik belum terkonfirmasi penuh dari halaman web resmi."
                    : "Certain specific competitor metrics could not be fully confirmed from official public sources."}
                </p>
              )}
              {report.missing_data_points && report.missing_data_points.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/90 block mb-1">
                    {language === "id"
                      ? "Data Spesifik yang Belum Terverifikasi:"
                      : "Specific Unverified Data Points:"}
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/85">
                    {report.missing_data_points.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Navigation Tabs Bar */}
      <div className="sticky top-14 z-30 bg-zinc-950/90 backdrop-blur-md py-2 border-b border-zinc-800/80 print:hidden">
        <div className="-mx-3.5 sm:mx-0 px-3.5 sm:px-0 flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none touch-pan-x">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-medium cursor-pointer shrink-0 whitespace-nowrap interactive-btn ${
              activeTab === "overview"
                ? "bg-zinc-800 text-zinc-100 border border-emerald-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <FileText
              className={`w-3.5 h-3.5 ${
                activeTab === "overview" ? "text-emerald-400" : "text-zinc-400"
              }`}
            />
            <span>{t.report.tabs.overview}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400">
              {report.competitor_profiles.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-medium cursor-pointer shrink-0 whitespace-nowrap interactive-btn ${
              activeTab === "matrix"
                ? "bg-zinc-800 text-zinc-100 border border-emerald-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Table
              className={`w-3.5 h-3.5 ${
                activeTab === "matrix" ? "text-emerald-400" : "text-zinc-400"
              }`}
            />
            <span>{t.report.tabs.matrix}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400">
              2
            </span>
          </button>
          <button
            onClick={() => setActiveTab("swot")}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-medium cursor-pointer shrink-0 whitespace-nowrap interactive-btn ${
              activeTab === "swot"
                ? "bg-zinc-800 text-zinc-100 border border-emerald-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Grid
              className={`w-3.5 h-3.5 ${
                activeTab === "swot" ? "text-emerald-400" : "text-zinc-400"
              }`}
            />
            <span>{t.report.tabs.swot}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400">
              {report.swot_analyses.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-medium cursor-pointer shrink-0 whitespace-nowrap interactive-btn ${
              activeTab === "sources"
                ? "bg-zinc-800 text-zinc-100 border border-emerald-500/40 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Link2
              className={`w-3.5 h-3.5 ${
                activeTab === "sources" ? "text-emerald-400" : "text-zinc-400"
              }`}
            />
            <span>{t.report.tabs.sources}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400">
              {report.verified_citations.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content (All 4 sections automatically expand in Print / PDF mode) */}
      <div className="space-y-6 print:space-y-8">
        {/* Tab 1: Executive Summary & Profiles */}
        <div
          className={
            activeTab === "overview"
              ? "block space-y-5"
              : "hidden print:block print:space-y-5"
          }
        >
          {/* Print-Only Executive Document Cover Header */}
          <div className="hidden print:block border-b-2 border-zinc-900 pb-3 mb-5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-600 mb-1">
              <span>STRATAGENT // AUTONOMOUS MARKET & COMPETITOR INTELLIGENCE</span>
              <span>
                {report.generated_at
                  ? new Date(report.generated_at).toLocaleDateString(
                      language === "id" ? "id-ID" : "en-US",
                      { year: "numeric", month: "long", day: "numeric" }
                    )
                  : formattedDate}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {report.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-600 mt-2">
              <span>
                AUDIT: {isVerified ? "VERIFIED (100% GROUNDED)" : `PARTIAL (${score.toFixed(1)}%)`}
              </span>
              <span>•</span>
              <span>
                COMPETITORS: {report.competitor_profiles.map((p) => p.name).join(", ")}
              </span>
              <span>•</span>
              <span>CONFIDENCE: {score.toFixed(1)}%</span>
            </div>
          </div>

          {/* Print Section 1 Header */}
          <div className="hidden print:flex items-center justify-between border-b-2 border-zinc-900 pb-2 pt-2 mb-4">
            <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-zinc-900">
              01 // {t.report.tabs.overview}
            </h3>
            <span className="text-xs font-mono text-zinc-600">
              {report.competitor_profiles.length} {t.report.kpi.competitors}
            </span>
          </div>

          {/* Executive Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2.5 print-card">
            <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              {t.report.sections.executiveSummary}
            </h3>
            <div className="markdown-content text-sm text-zinc-200 leading-relaxed font-normal">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.executive_summary}
              </ReactMarkdown>
            </div>
          </div>

          {/* Market Overview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2.5 print-card">
            <h3 className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold">
              {t.report.sections.marketOverview}
            </h3>
            <div className="markdown-content text-sm text-zinc-300 leading-relaxed font-normal">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.market_overview}
              </ReactMarkdown>
            </div>
          </div>

          {/* Competitor Deep-Dive Profiles */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 px-1 font-semibold">
              {t.report.sections.competitorProfiles}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              {report.competitor_profiles.map((comp, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 transition-colors rounded-xl p-4 sm:p-5 space-y-4 flex flex-col justify-between print-card"
                >
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 font-mono text-[11px] font-bold text-zinc-200 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-zinc-100 text-base">
                          {comp.name}
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {comp.tagline}
                      </p>
                    </div>

                    {/* 1. Go-To-Market & Target Segment Box */}
                    <div className="bg-indigo-950/15 p-3 rounded-lg border border-indigo-900/35 text-xs leading-relaxed">
                      <span className="text-indigo-400 font-mono font-semibold block text-[10px] uppercase mb-1">
                        {t.report.sections.goToMarket}
                      </span>
                      <span className="text-zinc-200">
                        {comp.market_positioning}
                      </span>
                    </div>

                    {/* 2. Commercial & Pricing Summary Box */}
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/90 text-xs leading-relaxed">
                      <span className="text-zinc-400 font-mono font-semibold block text-[10px] uppercase mb-1">
                        {t.report.sections.pricingModel}
                      </span>
                      <span className="text-zinc-100 font-medium">
                        {comp.pricing_summary}
                      </span>
                    </div>

                    {/* 3. User Sentiment & Community Feedback Box */}
                    {comp.user_sentiment && (
                      <div className="bg-sky-950/15 p-3 rounded-lg border border-sky-900/35 text-xs leading-relaxed">
                        <span className="text-sky-400 font-mono font-semibold block text-[10px] uppercase mb-1">
                          {t.report.sections.userSentiment}
                        </span>
                        <span className="text-zinc-200">
                          {comp.user_sentiment}
                        </span>
                      </div>
                    )}

                    {/* Key Features & Architecture Chips */}
                    {comp.key_features && comp.key_features.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <span className="font-mono text-[10px] text-zinc-400 uppercase block">
                          {t.report.sections.keyFeatures}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {comp.key_features.map((feat, fIdx) => (
                            <span
                              key={fIdx}
                              className="text-[11px] bg-zinc-950 text-zinc-200 px-2.5 py-1 rounded-md border border-zinc-800 leading-tight"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-zinc-800/70">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-emerald-950/15 border border-emerald-900/30 rounded-lg p-2.5">
                        <span className="font-mono text-[10px] text-emerald-400 uppercase font-semibold block mb-1.5">
                          + {t.report.sections.pros}
                        </span>
                        <ul className="space-y-1 text-zinc-300">
                          {comp.pros.map((p, i) => (
                            <li key={i} className="text-[11px] leading-snug">
                              • {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-rose-950/15 border border-rose-900/30 rounded-lg p-2.5">
                        <span className="font-mono text-[10px] text-rose-400 uppercase font-semibold block mb-1.5">
                          - {t.report.sections.cons}
                        </span>
                        <ul className="space-y-1 text-zinc-300">
                          {comp.cons.map((c, i) => (
                            <li key={i} className="text-[11px] leading-snug">
                              • {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => jumpToCompetitorSources(comp.name)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 bg-zinc-950 hover:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-800 transition-colors cursor-pointer"
                      >
                        <Link2 className="w-3 h-3 text-indigo-400" />
                        <span>
                          {language === "id" ? "Sumber" : "Sources"} (
                          {sourceCompetitorCounts[comp.name] || 0})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => jumpToCompetitorSwot(comp.name)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-300 hover:text-zinc-100 bg-zinc-950 hover:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-800 transition-colors cursor-pointer"
                      >
                        <span>
                          {t.report.sections.viewSwotButton}: {comp.name}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Recommendations */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 print-card">
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
              {t.report.sections.strategicRecommendations}
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {report.strategic_recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 text-xs text-zinc-200 bg-zinc-950/70 p-3.5 rounded-lg border border-zinc-800/80"
                >
                  <span className="font-mono text-[11px] bg-amber-950/60 text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded font-semibold shrink-0">
                    0{i + 1}
                  </span>
                  <p className="leading-relaxed text-zinc-200">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 2: Comparison Matrices */}
        <div
          className={
            activeTab === "matrix"
              ? "block space-y-5"
              : "hidden print:block print:space-y-6 print:break-before-page"
          }
        >
          {/* Print Section 2 Header */}
          <div className="hidden print:flex items-center justify-between border-b-2 border-zinc-900 pb-2 pt-2 mb-4">
            <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-zinc-900">
              02 // {t.report.tabs.matrix}
            </h3>
            <span className="text-xs font-mono text-zinc-600">
              {report.competitor_profiles.map((p) => p.name).join(" vs ")}
            </span>
          </div>

          {/* Feature Matrix */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3 print-card">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                {t.report.sections.featureMatrix}
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">
                {report.competitor_profiles.map((p) => p.name).join(" vs ")}
              </span>
            </div>

            {/* Mobile swipe hint banner */}
            <div className="sm:hidden flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[10px] font-mono text-emerald-300">
              <span>{language === "id" ? "👉 Geser tabel ke kanan untuk melihat perbandingan" : "👉 Swipe table right to view full comparison"}</span>
              <span>➡️</span>
            </div>

            <div className="overflow-x-auto touch-pan-x scrollbar-thin print:overflow-visible text-xs text-zinc-300 rounded-lg border border-zinc-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <table
                      className="w-full border-collapse text-left min-w-[540px] print:min-w-0"
                      {...props}
                    />
                  ),
                  thead: ({ node, ...props }) => (
                    <thead
                      className="bg-zinc-950 font-mono text-zinc-200 border-b border-zinc-800"
                      {...props}
                    />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody className="divide-y divide-zinc-800/70" {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr
                      className="even:bg-zinc-950/30 hover:bg-zinc-800/30 transition-colors"
                      {...props}
                    />
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      className="px-3.5 py-3 text-[11px] font-semibold border-r border-zinc-800/80 last:border-r-0 first:sticky first:left-0 first:z-10 first:bg-zinc-950 print:static"
                      {...props}
                    />
                  ),
                  td: ({ node, children, ...props }) => (
                    <td
                      className="px-3.5 py-2.5 text-xs leading-relaxed border-r border-zinc-800/60 last:border-r-0 first:font-semibold first:text-zinc-100 first:bg-zinc-950/90 first:sticky first:left-0 first:z-10 print:static"
                      {...props}
                    >
                      {renderMatrixCellContent(children)}
                    </td>
                  )
                }}
              >
                {report.feature_matrix_markdown}
              </ReactMarkdown>
            </div>
          </div>

          {/* Pricing Matrix */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3 print-card">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold">
                {t.report.sections.pricingMatrix}
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">
                Free / Pro / Usage / Enterprise
              </span>
            </div>

            {/* Mobile swipe hint banner */}
            <div className="sm:hidden flex items-center justify-between px-3 py-1.5 rounded-lg bg-sky-950/30 border border-sky-800/40 text-[10px] font-mono text-sky-300">
              <span>{language === "id" ? "👉 Geser tabel ke kanan untuk melihat harga" : "👉 Swipe table right to view pricing tiers"}</span>
              <span>➡️</span>
            </div>

            <div className="overflow-x-auto touch-pan-x scrollbar-thin print:overflow-visible text-xs text-zinc-300 rounded-lg border border-zinc-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <table
                      className="w-full border-collapse text-left min-w-[540px] print:min-w-0"
                      {...props}
                    />
                  ),
                  thead: ({ node, ...props }) => (
                    <thead
                      className="bg-zinc-950 font-mono text-zinc-200 border-b border-zinc-800"
                      {...props}
                    />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody className="divide-y divide-zinc-800/70" {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr
                      className="even:bg-zinc-950/30 hover:bg-zinc-800/30 transition-colors"
                      {...props}
                    />
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      className="px-3.5 py-3 text-[11px] font-semibold border-r border-zinc-800/80 last:border-r-0 first:sticky first:left-0 first:z-10 first:bg-zinc-950 print:static"
                      {...props}
                    />
                  ),
                  td: ({ node, children, ...props }) => (
                    <td
                      className="px-3.5 py-2.5 text-xs leading-relaxed border-r border-zinc-800/60 last:border-r-0 first:font-semibold first:text-zinc-100 first:bg-zinc-950/90 first:sticky first:left-0 first:z-10 print:static"
                      {...props}
                    >
                      {renderMatrixCellContent(children)}
                    </td>
                  )
                }}
              >
                {report.pricing_matrix_markdown}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Tab 3: SWOT Analysis */}
        <div
          className={
            activeTab === "swot"
              ? "block space-y-4"
              : "hidden print:block print:space-y-6 print:break-before-page"
          }
        >
          {/* Print Section 3 Header */}
          <div className="hidden print:flex items-center justify-between border-b-2 border-zinc-900 pb-2 pt-2 mb-4">
            <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-zinc-900">
              03 // {t.report.tabs.swot} ({report.swot_analyses.length})
            </h3>
            <span className="text-xs font-mono text-zinc-600">
              {totalSwotInsights} {t.report.kpi.swotPoints}
            </span>
          </div>

          {/* Interactive Toolbar: Filter Pills & View Mode (Screen Only) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 print:hidden">
            {/* Competitor Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x sm:flex-wrap pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedSwotCompetitor("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  selectedSwotCompetitor === "all"
                    ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs"
                    : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:bg-zinc-800/50"
                }`}
              >
                {t.report.sections.swotFilterAll} ({report.swot_analyses.length})
              </button>
              {report.swot_analyses.map((s, idx) => {
                const totalCompPoints =
                  (s.strengths?.length || 0) +
                  (s.weaknesses?.length || 0) +
                  (s.opportunities?.length || 0) +
                  (s.threats?.length || 0);
                const isSelected =
                  selectedSwotCompetitor.toLowerCase() ===
                  s.competitor.toLowerCase();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSwotCompetitor(s.competitor)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      isSelected
                        ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs"
                        : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:bg-zinc-800/50"
                    }`}
                  >
                    <span>{s.competitor}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        isSelected
                          ? "bg-zinc-300 text-zinc-900 font-bold"
                          : "bg-zinc-900 text-zinc-500"
                      }`}
                    >
                      {totalCompPoints}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Switcher (Cards vs Matrix) if >= 2 competitors */}
            {report.swot_analyses.length > 1 && (
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setSwotViewMode("cards")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    swotViewMode === "cards"
                      ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title={t.report.sections.swotViewCards}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{t.report.sections.swotViewCards}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSwotViewMode("matrix")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    swotViewMode === "matrix"
                      ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title={t.report.sections.swotViewMatrix}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>{t.report.sections.swotViewMatrix}</span>
                </button>
              </div>
            )}
          </div>

          {/* VIEW 1: Cards View (Default & Print Mode) */}
          <div
            className={`space-y-5 ${
              swotViewMode === "cards" ? "block" : "hidden print:block"
            }`}
          >
            {report.swot_analyses.map((swot, idx) => {
              const isSelectedOnScreen =
                selectedSwotCompetitor === "all" ||
                selectedSwotCompetitor.toLowerCase() ===
                  swot.competitor.toLowerCase();

              const matchedProfile = report.competitor_profiles.find(
                (p) => p.name.toLowerCase() === swot.competitor.toLowerCase()
              );

              return (
                <div
                  key={idx}
                  className={`${
                    isSelectedOnScreen ? "block" : "hidden print:block"
                  } bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 print-card break-inside-avoid shadow-xs`}
                >
                  {/* Competitor Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-zinc-800/80">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                        {swot.competitor.charAt(0).toUpperCase()}
                      </span>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-bold text-zinc-100 tracking-tight">
                            {swot.competitor}
                          </h4>
                          <span className="font-mono text-[10px] text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                            {matchedProfile
                              ? matchedProfile.market_positioning
                              : "Strategic SWOT"}
                          </span>
                        </div>
                        {matchedProfile?.tagline && (
                          <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                            {matchedProfile.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Competitor Quick Actions & Mini Quadrant Balance */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                      {/* Mini SWOT Point Balance Strip */}
                      <div className="flex items-center gap-1 font-mono text-[11px] bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800/80">
                        <span className="text-emerald-400 font-semibold" title="Strengths">
                          +{swot.strengths?.length || 0}S
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-rose-400 font-semibold" title="Weaknesses">
                          -{swot.weaknesses?.length || 0}W
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-sky-400 font-semibold" title="Opportunities">
                          +{swot.opportunities?.length || 0}O
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-amber-400 font-semibold" title="Threats">
                          -{swot.threats?.length || 0}T
                        </span>
                      </div>

                      {/* Jump to Sources button */}
                      <button
                        type="button"
                        onClick={() => jumpToCompetitorSources(swot.competitor)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-300 hover:text-zinc-100 bg-zinc-950 hover:bg-zinc-800 px-2.5 py-1 rounded-xl border border-zinc-800 transition-colors cursor-pointer print:hidden"
                      >
                        <Link2 className="w-3 h-3 text-indigo-400" />
                        <span>
                          {language === "id" ? "Sumber" : "Sources"} (
                          {sourceCompetitorCounts[swot.competitor] || 0})
                        </span>
                      </button>

                      {/* Official Website link if present */}
                      {matchedProfile?.website && (
                        <a
                          href={matchedProfile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-emerald-400 bg-zinc-950 hover:bg-zinc-800 px-2.5 py-1 rounded-xl border border-zinc-800 transition-colors cursor-pointer print:hidden"
                        >
                          <Globe className="w-3 h-3 text-emerald-400" />
                          <span>Website</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 4 Quadrants Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                    {/* 1. Strengths Quadrant */}
                    <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 border-t-2 border-t-emerald-500 space-y-3 print-card">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-mono text-xs uppercase font-bold text-emerald-400">
                            {t.report.sections.swotStrengths}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 rounded">
                            {t.report.sections.swotInternalPositive}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">
                            {swot.strengths?.length || 0}
                          </span>
                        </div>
                      </div>

                      {swot.strengths && swot.strengths.length > 0 ? (
                        <ul className="space-y-2 text-zinc-200">
                          {swot.strengths.map((s, i) => (
                            <li
                              key={i}
                              className="text-xs leading-relaxed flex items-start gap-2.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                              <div className="flex-1">{renderSwotText(s)}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-zinc-500 italic py-2">
                          {t.report.sections.swotEmptyStrengths}
                        </p>
                      )}
                    </div>

                    {/* 2. Weaknesses Quadrant */}
                    <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 border-t-2 border-t-rose-500 space-y-3 print-card">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="font-mono text-xs uppercase font-bold text-rose-400">
                            {t.report.sections.swotWeaknesses}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-rose-300 bg-rose-950/70 border border-rose-800/50 px-2 py-0.5 rounded">
                            {t.report.sections.swotInternalNegative}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">
                            {swot.weaknesses?.length || 0}
                          </span>
                        </div>
                      </div>

                      {swot.weaknesses && swot.weaknesses.length > 0 ? (
                        <ul className="space-y-2 text-zinc-200">
                          {swot.weaknesses.map((w, i) => (
                            <li
                              key={i}
                              className="text-xs leading-relaxed flex items-start gap-2.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                              <div className="flex-1">{renderSwotText(w)}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-zinc-500 italic py-2">
                          {t.report.sections.swotEmptyWeaknesses}
                        </p>
                      )}
                    </div>

                    {/* 3. Opportunities Quadrant */}
                    <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 border-t-2 border-t-sky-500 space-y-3 print-card">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="font-mono text-xs uppercase font-bold text-sky-400">
                            {t.report.sections.swotOpportunities}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-sky-300 bg-sky-950/70 border border-sky-800/50 px-2 py-0.5 rounded">
                            {t.report.sections.swotExternalPositive}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">
                            {swot.opportunities?.length || 0}
                          </span>
                        </div>
                      </div>

                      {swot.opportunities && swot.opportunities.length > 0 ? (
                        <ul className="space-y-2 text-zinc-200">
                          {swot.opportunities.map((o, i) => (
                            <li
                              key={i}
                              className="text-xs leading-relaxed flex items-start gap-2.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                              <div className="flex-1">{renderSwotText(o)}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-zinc-500 italic py-2">
                          {t.report.sections.swotEmptyOpportunities}
                        </p>
                      )}
                    </div>

                    {/* 4. Threats Quadrant */}
                    <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 border-t-2 border-t-amber-500 space-y-3 print-card">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="font-mono text-xs uppercase font-bold text-amber-400">
                            {t.report.sections.swotThreats}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/70 border border-amber-800/50 px-2 py-0.5 rounded">
                            {t.report.sections.swotExternalNegative}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">
                            {swot.threats?.length || 0}
                          </span>
                        </div>
                      </div>

                      {swot.threats && swot.threats.length > 0 ? (
                        <ul className="space-y-2 text-zinc-200">
                          {swot.threats.map((th, i) => (
                            <li
                              key={i}
                              className="text-xs leading-relaxed flex items-start gap-2.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              <div className="flex-1">{renderSwotText(th)}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-zinc-500 italic py-2">
                          {t.report.sections.swotEmptyThreats}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VIEW 2: Quadrant Matrix View (Side-by-Side Comparison across all competitors, Screen Only) */}
          {report.swot_analyses.length > 1 && (
            <div
              className={`space-y-5 print:hidden ${
                swotViewMode === "matrix" ? "block" : "hidden"
              }`}
            >
              {/* 1. Strengths Comparison Row */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h4 className="font-mono text-xs uppercase font-bold text-emerald-400">
                      {t.report.sections.swotStrengths} — {language === "id" ? "Perbandingan Antar-Kompetitor" : "Cross-Competitor Comparison"}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 rounded">
                    {t.report.sections.swotInternalPositive}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.swot_analyses.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 border-t-2 border-t-emerald-500 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-100 text-sm">
                          {s.competitor}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {s.strengths?.length || 0} {language === "id" ? "poin" : "points"}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-zinc-200">
                        {s.strengths?.map((item, i) => (
                          <li
                            key={i}
                            className="text-xs leading-relaxed flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            <div className="flex-1">{renderSwotText(item)}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Weaknesses Comparison Row */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                    <h4 className="font-mono text-xs uppercase font-bold text-rose-400">
                      {t.report.sections.swotWeaknesses} — {language === "id" ? "Perbandingan Antar-Kompetitor" : "Cross-Competitor Comparison"}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-rose-300 bg-rose-950/70 border border-rose-800/50 px-2 py-0.5 rounded">
                    {t.report.sections.swotInternalNegative}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.swot_analyses.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 border-t-2 border-t-rose-500 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-100 text-sm">
                          {s.competitor}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {s.weaknesses?.length || 0} {language === "id" ? "poin" : "points"}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-zinc-200">
                        {s.weaknesses?.map((item, i) => (
                          <li
                            key={i}
                            className="text-xs leading-relaxed flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                            <div className="flex-1">{renderSwotText(item)}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Opportunities Comparison Row */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-sky-400 shrink-0" />
                    <h4 className="font-mono text-xs uppercase font-bold text-sky-400">
                      {t.report.sections.swotOpportunities} — {language === "id" ? "Perbandingan Antar-Kompetitor" : "Cross-Competitor Comparison"}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-sky-300 bg-sky-950/70 border border-sky-800/50 px-2 py-0.5 rounded">
                    {t.report.sections.swotExternalPositive}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.swot_analyses.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 border-t-2 border-t-sky-500 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-100 text-sm">
                          {s.competitor}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {s.opportunities?.length || 0} {language === "id" ? "poin" : "points"}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-zinc-200">
                        {s.opportunities?.map((item, i) => (
                          <li
                            key={i}
                            className="text-xs leading-relaxed flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                            <div className="flex-1">{renderSwotText(item)}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Threats Comparison Row */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <h4 className="font-mono text-xs uppercase font-bold text-amber-400">
                      {t.report.sections.swotThreats} — {language === "id" ? "Perbandingan Antar-Kompetitor" : "Cross-Competitor Comparison"}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/70 border border-amber-800/50 px-2 py-0.5 rounded">
                    {t.report.sections.swotExternalNegative}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.swot_analyses.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 border-t-2 border-t-amber-500 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-100 text-sm">
                          {s.competitor}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {s.threats?.length || 0} {language === "id" ? "poin" : "points"}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-zinc-200">
                        {s.threats?.map((item, i) => (
                          <li
                            key={i}
                            className="text-xs leading-relaxed flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                            <div className="flex-1">{renderSwotText(item)}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab 4: Verified Sources */}
        <div
          className={
            activeTab === "sources"
              ? "block space-y-4"
              : "hidden print:block print:space-y-6 print:break-before-page"
          }
        >
          {/* Print Section 4 Header */}
          <div className="hidden print:flex items-center justify-between border-b-2 border-zinc-900 pb-2 pt-2 mb-4">
            <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-zinc-900">
              04 // {t.report.tabs.sources} ({report.verified_citations.length})
            </h3>
            <span className="text-xs font-mono text-zinc-600">
              {t.report.sections.sourcesTitle}
            </span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 print-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                  {t.report.sections.sourcesTitle}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {t.report.sections.sourcesSubtitle}
                </p>
              </div>
              <span className="font-mono text-[11px] text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800 self-start sm:self-auto">
                <span className="print:hidden">{filteredSources.length} / </span>
                {report.verified_citations.length} URL
              </span>
            </div>

            {/* Search, Engine & Dimension Filter Bar (Screen Only) */}
            {report.verified_citations.length > 0 && (
              <div className="space-y-2.5 pt-1 print:hidden">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      placeholder={t.report.sections.sourcesSearchPlaceholder}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-base sm:text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 min-h-[38px]"
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none touch-pan-x pb-1 sm:pb-0">
                    {["all", "tavily", "duckduckgo", "google_grounding"].map(
                      (eng) => (
                        <button
                          key={eng}
                          type="button"
                          onClick={() => setSelectedEngine(eng)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono uppercase transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[32px] ${
                            selectedEngine === eng
                              ? "bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold"
                              : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                          }`}
                        >
                          {eng === "all"
                            ? t.report.sections.sourcesFilterAll
                            : eng.replace(/_/g, " ")}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Competitor Filter Pills in Sources Tab */}
                {Object.keys(sourceCompetitorCounts).length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x sm:flex-wrap pb-1 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceCompetitor("all")}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                        selectedSourceCompetitor === "all"
                          ? "bg-emerald-500 text-zinc-950 font-semibold"
                          : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800/90"
                      }`}
                    >
                      {language === "id"
                        ? "Semua Kompetitor"
                        : "All Competitors"}{" "}
                      ({report.verified_citations.length})
                    </button>
                    {Object.entries(sourceCompetitorCounts).map(
                      ([compName, count]) => (
                        <button
                          key={compName}
                          type="button"
                          onClick={() => setSelectedSourceCompetitor(compName)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                            selectedSourceCompetitor.toLowerCase() ===
                            compName.toLowerCase()
                              ? "bg-emerald-500 text-zinc-950 font-semibold"
                              : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800/90"
                          }`}
                        >
                          {compName} ({count})
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Dimension Subtask Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x sm:flex-wrap pb-1 sm:pb-0">
                  {[
                    {
                      id: "all",
                      label:
                        language === "id" ? "Semua Subtask" : "All Subtasks"
                    },
                    { id: "pricing_model", label: "Pricing Model" },
                    { id: "product_features", label: "Product Features" },
                    { id: "user_sentiment", label: "User Sentiment" },
                    { id: "go_to_market", label: "Go To Market" }
                  ].map((dim) => (
                    <button
                      key={dim.id}
                      type="button"
                      onClick={() => setSelectedDimension(dim.id)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                        selectedDimension === dim.id
                          ? "bg-zinc-100 text-zinc-950 font-semibold"
                          : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800/90"
                      }`}
                    >
                      {dim.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {report.verified_citations.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 space-y-2">
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <Globe className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-zinc-300">
                  {t.report.sections.sourcesEmptyTitle}
                </p>
                <p className="text-[11px] text-zinc-500 max-w-md mx-auto leading-relaxed">
                  {t.report.sections.sourcesEmptyDesc}
                </p>
              </div>
            ) : (
              <>
                {/* Screen-only empty filter state */}
                {filteredSources.length === 0 && (
                  <div className="py-8 px-4 text-center rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 space-y-2.5 print:hidden">
                    <p className="text-xs text-zinc-400">
                      {t.report.sections.sourcesNoMatchTitle}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceSearch("");
                        setSelectedEngine("all");
                        setSelectedDimension("all");
                        setSelectedSourceCompetitor("all");
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-mono text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
                    >
                      {t.report.sections.sourcesNoMatchReset}
                    </button>
                  </div>
                )}

                {/* Screen View: Paginated & Filtered 2-Column Grid */}
                {filteredSources.length > 0 && (
                  <div className="space-y-3.5 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {visibleSources.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/90 hover:border-zinc-700 transition-colors flex flex-col justify-between gap-2.5 text-xs"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[10px] text-zinc-500">
                                  #{String(idx + 1).padStart(2, "0")}
                                </span>
                                {c.competitor && (
                                  <span className="font-mono text-[10px] font-semibold text-zinc-100 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 shrink-0">
                                    {c.competitor}
                                  </span>
                                )}
                                <span className="font-mono text-[10px] text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 truncate max-w-[140px]">
                                  {extractHostname(c.url)}
                                </span>
                                {c.dimension && (
                                  <span
                                    className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${getDimensionBadgeStyle(
                                      c.dimension
                                    )}`}
                                  >
                                    {c.dimension.replace(/_/g, " ")}
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                                {c.source_engine.replace(/_/g, " ")}
                              </span>
                            </div>

                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-100 hover:text-emerald-300 hover:underline font-semibold inline-flex items-start gap-1.5 leading-snug break-words"
                            >
                              <span className="line-clamp-2">{c.title}</span>
                              <ExternalLink className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                            </a>

                            {c.snippet && (
                              <p
                                title={c.snippet}
                                className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2"
                              >
                                "{c.snippet}"
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2">
                            <p
                              title={c.url}
                              className="text-[10px] font-mono text-zinc-500 truncate"
                            >
                              {c.url}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredSources.length > 8 && (
                      <div className="flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAllSources(!showAllSources)}
                          className="px-4 py-1.5 rounded-lg text-xs font-mono text-zinc-300 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                        >
                          {showAllSources
                            ? language === "id"
                              ? "Tampilkan Lebih Sedikit (8 Sumber Utama)"
                              : "Show Less (Top 8 Sources)"
                            : language === "id"
                            ? `Tampilkan Semua (${filteredSources.length} Sumber Terverifikasi)`
                            : `Show All (${filteredSources.length} Verified Sources)`}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Print / PDF View: Complete Unfiltered Sources List */}
                <div className="hidden print:grid print:grid-cols-2 gap-3">
                  {report.verified_citations.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-zinc-300 flex flex-col justify-between gap-1.5 text-xs print-card"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-mono text-[10px] font-bold">
                              #{String(idx + 1).padStart(2, "0")}
                            </span>
                            {c.competitor && (
                              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border border-zinc-300">
                                {c.competitor}
                              </span>
                            )}
                            {c.dimension && (
                              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border border-zinc-300">
                                {c.dimension.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[9px] uppercase text-zinc-600">
                            {c.source_engine.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="font-semibold text-xs leading-snug">
                          {c.title}
                        </p>
                        {c.snippet && (
                          <p className="text-[10px] leading-relaxed">
                            "{c.snippet}"
                          </p>
                        )}
                      </div>
                      <p className="text-[9px] font-mono break-all pt-1 border-t border-zinc-200">
                        {c.url}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
