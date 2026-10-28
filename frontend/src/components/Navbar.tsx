"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Info, Activity } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface NavbarProps {
  onOpenAbout?: () => void;
  onOpenObservability?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAbout, onOpenObservability }) => {
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

        {/* Right side items: Observability, About, & Language Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Observability Page Link Button */}
          {onOpenObservability ? (
            <button
              type="button"
              onClick={onOpenObservability}
              aria-label={t.navbar.observability}
              className={`flex items-center justify-center gap-1.5 font-mono text-[11px] p-2 sm:px-2.5 sm:py-1 rounded-lg border transition-all cursor-pointer shadow-xs min-h-[32px] min-w-[32px] ${
                isObservability
                  ? "bg-sky-950/60 text-sky-300 border-sky-500/60 shadow-[0_0_12px_rgba(14,165,233,0.15)]"
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
            </button>
          ) : (
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
          )}

          {/* About Portfolio Page Link Button */}
          {onOpenAbout ? (
            <button
              type="button"
              onClick={onOpenAbout}
              aria-label={t.navbar.about}
              className={`flex items-center justify-center gap-1.5 font-mono text-[11px] p-2 sm:px-2.5 sm:py-1 rounded-lg border transition-all cursor-pointer shadow-xs min-h-[32px] min-w-[32px] ${
                isAbout
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
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
            </button>
          ) : (
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
          )}

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
