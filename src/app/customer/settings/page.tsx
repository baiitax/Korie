"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { SupportedLanguage } from "@/types/customer";
import { ArrowLeft, Globe, Bell, Check, Smartphone, Mail, Zap } from "lucide-react";

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
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            {t("common.settings")}
          </h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("customer.settings.subtitle")}</p>
        </div>
      </div>

      {/* 1. Language Preference */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-xs">
          <Globe className="w-4 h-4 text-[var(--brand-primary)]" />
          <span>{t("customer.settings.preferredLanguage")}</span>
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
                    ? "bg-[var(--brand-soft)] border-[var(--border-strong)] text-[var(--foreground)] font-bold shadow-[var(--shadow-sm)]"
                    : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <div>
                    <div className="text-xs font-semibold">{lang.label}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)]">{lang.native}</div>
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-[var(--brand-primary)]" />}
              </button>
            );
          })}
        </div>

        {savedSuccess && (
          <div className="text-[11px] font-mono text-[var(--brand-primary)] font-bold">
            ✓ {t("customer.settings.languageUpdated")}
          </div>
        )}
      </div>

      {/* 2. Notification Preferences */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-xs">
          <Bell className="w-4 h-4 text-[var(--warning)]" />
          <span>{t("customer.settings.notifications")}</span>
        </div>

        <div className="space-y-3 divide-y divide-[var(--border)] text-xs">
          <SettingToggle icon={<Smartphone className="w-4 h-4 text-[var(--foreground-muted)]" />} title={t("customer.settings.smsAlerts")} desc={t("customer.settings.smsAlertsDesc")} on={smsAlerts} onToggle={() => setSmsAlerts(!smsAlerts)} />
          <SettingToggle icon={<Mail className="w-4 h-4 text-[var(--foreground-muted)]" />} title={t("customer.settings.emailReceipts")} desc={t("customer.settings.emailReceiptsDesc")} on={emailReceipts} onToggle={() => setEmailReceipts(!emailReceipts)} />
          <SettingToggle icon={<Zap className="w-4 h-4 text-[var(--foreground-muted)]" />} title={t("customer.settings.fxAlerts")} desc={t("customer.settings.fxAlertsDesc")} on={pushAlerts} onToggle={() => setPushAlerts(!pushAlerts)} />
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ icon, title, desc, on, onToggle }: { icon: React.ReactNode; title: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="font-semibold text-[var(--foreground)]">{title}</div>
          <div className="text-[10px] text-[var(--foreground-muted)]">{desc}</div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? "bg-[var(--brand-primary)]" : "bg-[var(--border-strong)]"}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
