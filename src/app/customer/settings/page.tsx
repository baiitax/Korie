"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { SupportedLanguage } from "@/types/customer";
import {
  ArrowLeft,
  Globe,
  Bell,
  Moon,
  ShieldCheck,
  Check,
  Smartphone,
  Mail,
  Zap,
} from "lucide-react";

export default function CustomerSettingsPage() {
  const { language, setLanguage, t } = useCustomer();
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const languages: { code: SupportedLanguage; label: string; native: string; flag: string }[] = [
    { code: "en", label: "English", native: "English (UK/NG)", flag: "🇬🇧" },
    { code: "ha", label: "Hausa", native: "Harshen Hausa (Najeriya/Nijar)", flag: "🇳🇬" },
    { code: "fr", label: "Français", native: "Français (UEMOA/Afrique)", flag: "🇳🇪" },
  ];

  const handleLanguageSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("common.settings")}
          </h1>
          <p className="text-xs text-slate-400">
            Language preferences, transaction notifications and security controls.
          </p>
        </div>
      </div>

      {/* 1. Language Preference */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-white font-bold text-xs">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Preferred Language / Harshe / Langue</span>
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
                    ? "bg-emerald-500/15 border-emerald-500 text-white font-bold shadow-md shadow-emerald-500/10"
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

                {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        {savedSuccess && (
          <div className="text-[11px] font-mono text-emerald-400 font-bold">
            ✓ Language preference updated & saved.
          </div>
        )}
      </div>

      {/* 2. Notification Preferences */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-white font-bold text-xs">
          <Bell className="w-4 h-4 text-amber-400" />
          <span>Notification Channels & Alerts</span>
        </div>

        <div className="space-y-3 divide-y divide-white/5 text-xs">
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <div>
                <div className="font-semibold text-white">Instant SMS Debit/Credit Alerts</div>
                <div className="text-[10px] text-slate-400">Sent to verified phone number</div>
              </div>
            </div>
            <button
              onClick={() => setSmsAlerts(!smsAlerts)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                smsAlerts ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  smsAlerts ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400" />
              <div>
                <div className="font-semibold text-white">Digital Email Receipts</div>
                <div className="text-[10px] text-slate-400">PDF receipt attachment on transfers</div>
              </div>
            </div>
            <button
              onClick={() => setEmailReceipts(!emailReceipts)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                emailReceipts ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  emailReceipts ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-slate-400" />
              <div>
                <div className="font-semibold text-white">Sahel FX Rate Movements</div>
                <div className="text-[10px] text-slate-400">Alerts for NGN ⇄ XOF favorable spreads</div>
              </div>
            </div>
            <button
              onClick={() => setPushAlerts(!pushAlerts)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                pushAlerts ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pushAlerts ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
