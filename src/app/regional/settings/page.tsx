"use client";

import React from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { useTheme } from "@/components/ui/ThemeContext";
import { PageHeader, Pill } from "@/components/regional/ui";
import { Sun, Moon, Globe, MapPin, ShieldCheck } from "lucide-react";

export default function RegionalSettingsPage() {
  const { t, manager, language, setLanguage } = useRegional();
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      {manager && (
        <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <h2 className="text-sm font-bold mb-3">{t("settings.profile")}</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div><dt className="text-[var(--foreground-muted)]">{t("session.managerFor")}</dt><dd className="font-semibold">{manager.fullName}</dd></div>
            <div><dt className="text-[var(--foreground-muted)]">{t("support.col.ticket")}</dt><dd className="font-semibold">{manager.email}</dd></div>
            <div><dt className="text-[var(--foreground-muted)]">{t("settings.country")}</dt><dd className="font-semibold">{manager.country === "NG" ? "Nigeria" : "Niger"}</dd></div>
          </dl>
          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase text-[var(--foreground-muted)] flex items-center gap-1.5 mb-2"><MapPin className="w-3.5 h-3.5" />{t("settings.territory")}</div>
            <div className="flex flex-wrap gap-1.5">
              {manager.territories.map((ter: string) => (
                <span key={ter} className="px-2.5 py-1 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs">{ter}</span>
              ))}
            </div>
            <p className="text-[11px] text-[var(--foreground-muted)] mt-2">{t("settings.assignments")}</p>
          </div>
        </section>
      )}

      <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
        <h2 className="text-sm font-bold mb-3">{t("settings.language")}</h2>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[var(--foreground-muted)]" />
          {(["en", "fr", "ha"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${language === l ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary,#052e2b)]" : "border border-[var(--border)] text-[var(--foreground-muted)]"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
        <h2 className="text-sm font-bold mb-3">{t("settings.appearance")}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme("light")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border ${theme === "light" ? "border-[var(--brand-border)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border)] text-[var(--foreground-muted)]"}`}
          >
            <Sun className="w-4 h-4" />{t("settings.appearanceLight")}
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border ${theme === "dark" ? "border-[var(--brand-border)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border)] text-[var(--foreground-muted)]"}`}
          >
            <Moon className="w-4 h-4" />{t("settings.appearanceDark")}
          </button>
        </div>
      </section>

      {manager && (
        <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <h2 className="text-sm font-bold mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />{t("settings.permissions")}</h2>
          <p className="text-[11px] text-[var(--foreground-muted)] mb-3">{t("settings.permissionsNote")}</p>
          <div className="flex flex-wrap gap-1.5">
            {manager.permissions.map((p) => (
              <Pill key={p} kind="muted">{p}</Pill>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
