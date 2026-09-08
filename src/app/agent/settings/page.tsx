"use client";

// =============================================================================
// Settings — language preference + balance display toggles. Local prefs are
// stored per device (language also feeds receipt output). Nothing here claims
// to persist server-side settings that have no engine.
// =============================================================================

import React, { useState } from "react";
import Link from "next/link";
import { useAgentPortal } from "@/components/agent/AgentContext";
import { AgentPageHeader, AgentChip, statusTone, AgentPageSkeleton, AgentErrorState } from "@/components/agent/ui/AgentUi";
import { Globe, Eye, EyeOff, Check, ChevronRight, Terminal, Info } from "lucide-react";

const LANGUAGES = [
  { code: "en" as const, label: "English", native: "English (UK/NG)", flag: "🇬🇧" },
  { code: "ha" as const, label: "Hausa", native: "Harshen Hausa (Najeriya)", flag: "🇳🇬" },
  { code: "fr" as const, label: "Français", native: "Français (UEMOA)", flag: "🇳🇪" },
];

export default function AgentSettingsPage() {
  const { language, setLanguage, isBalanceHidden, toggleHideBalance, phase, errorMessage, refresh, summary } = useAgentPortal();
  const [saved, setSaved] = useState(false);

  if (phase === "loading") return <AgentPageSkeleton rows={2} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="Settings unavailable" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const pickLanguage = (code: typeof language) => {
    setLanguage(code);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader title="Settings" subtitle="Terminal language and display preferences for this kiosk." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section aria-labelledby="lang-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 id="lang-title" className="flex items-center gap-2 text-sm font-bold text-stone-900">
            <Globe className="h-4 w-4 text-stone-400" aria-hidden="true" />
            Agency interface language
          </h2>
          <p className="mt-1 text-[11px] text-stone-500">Receipts and this kiosk use the selected language.</p>
          <div className="mt-4 space-y-2">
            {LANGUAGES.map((lang) => {
              const active = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => pickLanguage(lang.code)}
                  aria-pressed={active}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg" aria-hidden="true">
                      {lang.flag}
                    </span>
                    <span>
                      <span className="block text-xs font-bold text-stone-800">{lang.label}</span>
                      <span className="block text-[10px] text-stone-400">{lang.native}</span>
                    </span>
                  </span>
                  {active ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          {saved ? (
            <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">
              ✓ Language updated.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="display-title" className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 id="display-title" className="text-sm font-bold text-stone-900">
              Display
            </h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-700">Hide balances</p>
                <p className="text-[11px] text-stone-400">Useful when customers are watching the screen.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isBalanceHidden}
                onClick={toggleHideBalance}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  isBalanceHidden ? "bg-emerald-600" : "bg-stone-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    isBalanceHidden ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-stone-400">
              {isBalanceHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {isBalanceHidden ? "Balances are masked everywhere in the portal." : "Balances are visible."}
            </div>
          </div>

          <Link
            href="/agent/profile"
            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
              <Terminal className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-stone-900">{summary.agent.agentCode}</span>
              <span className="block text-[11px] text-stone-500">Terminal {summary.terminal.terminalId}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-stone-300" aria-hidden="true" />
          </Link>
        </section>

        <div className="flex items-start gap-2 rounded-xl bg-sky-50 p-4 text-xs leading-relaxed text-sky-800 ring-1 ring-sky-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            KYC, limits, tier and status are registry data shown on the profile page — they are controlled by the operator
            engine, not from this screen. Balance privacy is stored on this device only.
          </p>
        </div>
      </div>
    </div>
  );
}
