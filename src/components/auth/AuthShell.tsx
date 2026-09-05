"use client";

import React from "react";
import Link from "next/link";
import KorieLogo from "@/components/brand/KorieLogo";
import { useAuth } from "./AuthContext";
import { useTheme } from "@/components/ui/ThemeContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ShieldCheck, HelpCircle, Globe2, Lock } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showJurisdictionSelector?: boolean;
}

export const AuthShell: React.FC<AuthShellProps> = ({
  children,
  title,
  subtitle,
  showJurisdictionSelector = true,
}) => {
  const { language, setLanguage, jurisdiction, setJurisdiction } = useAuth();
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between p-4 sm:p-6 lg:p-10 antialiased relative kp-ambient selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden font-sans">
      {/* Premium Fintech Glow Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none transform-gpu" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[500px] bg-teal-600/10 rounded-full blur-[160px] pointer-events-none transform-gpu" />
        <div className="absolute top-1/3 left-[-10%] w-[500px] h-[400px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none transform-gpu" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))]" />
      </div>

      {/* Top Bar: Brand, Jurisdiction & Language Switcher */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto relative z-10 py-2">
        <Link href="/" className="flex items-center group transition-transform duration-200 hover:scale-[1.01]" aria-label="KoriePay Home">
          <KorieLogo variant="full" theme={theme === "light" ? "light" : "dark"} height={34} linkHref="" />
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Day / Night Theme Toggle */}
          <ThemeToggle className="hidden sm:flex items-center justify-center p-2 bg-white/[0.04] border border-white/10 text-slate-300" />

          {/* Country Jurisdiction Selector */}
          {showJurisdictionSelector && (
            <div className="flex items-center bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setJurisdiction("NG")}
                className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  jurisdiction === "NG"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Nigeria (NGN Naira Corridor)"
              >
                <span>🇳🇬</span>
                <span className="hidden sm:inline">NGN</span>
              </button>
              <button
                type="button"
                onClick={() => setJurisdiction("NE")}
                className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  jurisdiction === "NE"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Niger Republic (XOF CFA Corridor)"
              >
                <span>🇳🇪</span>
                <span className="hidden sm:inline">XOF</span>
              </button>
            </div>
          )}

          {/* 1-Tap Language Toggle */}
          <div className="flex items-center bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-1 text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-2 py-1 rounded-lg transition-colors ${
                language === "en" ? "bg-emerald-500 text-slate-950 font-extrabold" : "text-slate-400 hover:text-white"
              }`}
              title="English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("ha")}
              className={`px-2 py-1 rounded-lg transition-colors ${
                language === "ha" ? "bg-emerald-500 text-slate-950 font-extrabold" : "text-slate-400 hover:text-white"
              }`}
              title="Harshen Hausa"
            >
              HA
            </button>
            <button
              type="button"
              onClick={() => setLanguage("fr")}
              className={`px-2 py-1 rounded-lg transition-colors ${
                language === "fr" ? "bg-emerald-500 text-slate-950 font-extrabold" : "text-slate-400 hover:text-white"
              }`}
              title="Français"
            >
              FR
            </button>
          </div>

          {/* Support Link */}
          <Link
            href="/support"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Support</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-5xl mx-auto my-auto py-6 sm:py-8 relative z-10 flex flex-col items-center">
        {children}
      </main>

      {/* Footer: Trust Indicators & Regulatory Footprint */}
      <footer className="w-full max-w-5xl mx-auto pt-6 pb-2 relative z-10 text-center text-xs text-slate-400 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>End-to-end 256-bit encrypted banking session</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400 text-[11px]">
          <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Notice</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Banking</Link>
          <span>•</span>
          <Link href="/security" className="hover:text-emerald-400 transition-colors">Security Desk</Link>
        </div>
      </footer>
    </div>
  );
};

export default AuthShell;
