"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { SupportedLanguage } from "@/types/customer";
import {
  ArrowLeft,
  Globe,
  Bell,
  Lock,
  Check,
  Smartphone,
  ShieldCheck,
} from "lucide-react";

export default function AgentSettingsPage() {
  const { language, setLanguage, t } = useAgent();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const languages: { code: SupportedLanguage; label: string; native: string; flag: string }[] = [
    { code: "ha", label: "Hausa", native: "Harshen Hausa (Najeriya/Nijar)", flag: "🇳🇬" },
    { code: "en", label: "English", native: "English (UK/NG)", flag: "🇬🇧" },
    { code: "fr", label: "Français", native: "Français (UEMOA/Afrique)", flag: "🇳🇪" },
  ];

  const handleLanguageSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/agent"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("common.settings")}
          </h1>
          <p className="text-xs text-slate-400">
            Agency terminal configuration and language selection.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-white font-bold text-xs">
          <Globe className="w-4 h-4 text-amber-400" />
          <span>Agency Interface Language / Harshen Wakili</span>
        </div>

        <div className="space-y-2">
          {languages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? "bg-amber-500/15 border-amber-500 text-white font-bold shadow-md shadow-amber-500/10"
                    : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <div>
                    <div className="text-xs font-semibold">{lang.label}</div>
                    <div className="text-[10px] text-slate-400">{lang.native}</div>
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            );
          })}
        </div>

        {savedSuccess && (
          <div className="text-[11px] font-mono text-emerald-400 font-bold">
            ✓ Agency terminal language updated & saved.
          </div>
        )}
      </div>
    </div>
  );
}
