"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Info, Activity } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
  </svg>
);

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();

  const isObservability = pathname === "/observability";
  const isAbout = pathname === "/about";

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50 print:hidden">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-2.5 min-w-0 group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 group-hover:border-emerald-500/60 flex items-center justify-center text-zinc-200 shadow-xs shrink-0 transition-colors">
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0">
            <span className="font-semibold text-sm text-zinc-100 tracking-tight truncate group-hover:text-emerald-300 transition-colors">
              {t.navbar.title}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline shrink-0">
              {t.navbar.version}
            </span>
          </div>
        </Link>

        {/* Right side items: GitHub, Observability, About, & Language Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <a
            href="https://github.com/alfandoo/rag-agentic-ai"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="flex items-center justify-center gap-1.5 font-mono text-[11px] p-2 sm:px-2.5 sm:py-1 rounded-lg border transition-all cursor-pointer shadow-xs min-h-[32px] min-w-[32px] text-zinc-300 hover:text-emerald-300 bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-800 hover:border-emerald-500/40"
            title={
              language === "id"
                ? "Buka repository GitHub"
                : "Open GitHub repository"
            }
          >
            <GitHubIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <Link
            href="/observability"
            aria-label={t.navbar.observability}
            className={`flex items-center justify-center gap-1.5 font-mono text-[11px] p-2 sm:px-2.5 sm:py-1 rounded-lg border transition-all cursor-pointer shadow-xs min-h-[32px] min-w-[32px] ${
              isObservability
                ? "bg-sky-950/60 text-sky-300 border-sky-500/60 shadow-[0_0_12px_rgba(14,165,233,0.15)] font-semibold"
                : "text-zinc-300 hover:text-sky-300 bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-800 hover:border-sky-500/40"
            }`}
            title={
              language === "id"
                ? "Buka halaman telemetri & observabilitas LLMOps"
                : "Open LLMOps & real-time telemetry page"
            }
          >
            <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="hidden sm:inline">{t.navbar.observability}</span>
          </Link>

          <Link
            href="/about"
            aria-label={t.navbar.about}
            className={`flex items-center justify-center gap-1.5 font-mono text-[11px] p-2 sm:px-2.5 sm:py-1 rounded-lg border transition-all cursor-pointer shadow-xs min-h-[32px] min-w-[32px] ${
              isAbout
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-semibold"
                : "text-zinc-300 hover:text-emerald-300 bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-800 hover:border-emerald-500/40"
            }`}
            title={
              language === "id"
                ? "Buka halaman penjelasan lengkap portofolio ini"
                : "Open complete portfolio architecture page"
            }
          >
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">{t.navbar.about}</span>
          </Link>

          {/* Sleek Language Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setLanguage("id")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                language === "id"
                  ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                language === "en"
                  ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
