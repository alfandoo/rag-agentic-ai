"use client";

import React from "react";
import { Shield, Cpu, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
            <Cpu className="w-4 h-4 text-zinc-300" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-zinc-100 tracking-tight">
              {t.navbar.title}
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              {t.navbar.version}
            </span>
          </div>
        </div>

        {/* Right side items: System status & Language Selector */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-zinc-400 bg-zinc-900/60 px-2.5 py-1 rounded-md border border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{t.navbar.live}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
            <Shield className="w-3 h-3 text-zinc-400" />
            <span>{t.navbar.audited}</span>
          </div>

          {/* Sleek Language Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setLanguage("id")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
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
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
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
