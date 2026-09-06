"use client";

// =============================================================================
// File: src/app/support/settings/page.tsx
// Description: Officer settings — profile, role & capability readout,
// language, appearance. Capabilities are displayed, never editable:
// the server enforces RBAC (§53/§91).
// =============================================================================

import React from "react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { SectionCard, initials } from "@/components/support/SupportUI";

export default function SupportSettingsPage() {
  const { t, lang, setLang, theme, setTheme, activeOfficer, officers } = useSupportOps();

  if (!activeOfficer) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.settings.title")}</h1>
        <p className="text-xs text-[var(--muted)]">{t("supportOps.errors.server")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.settings.title")}</h1>

      {/* Profile */}
      <SectionCard title={t("supportOps.settings.profile")}>
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#0b7a63] to-[#158987] text-lg font-extrabold text-white">
            {initials(activeOfficer.fullName)}
          </span>
          <div>
            <p className="text-[15px] font-extrabold text-[var(--foreground)]">{activeOfficer.fullName}</p>
            <p className="text-xs text-[var(--muted)]">
              {t(`supportOps.roles.${activeOfficer.role}`)} · {activeOfficer.tier}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {activeOfficer.email} · {activeOfficer.phone}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Role & capabilities (read-only) */}
      <SectionCard
        title={t("supportOps.settings.role")}
        subtitle={t("supportOps.settings.permissionsHint")}
      >
        <div className="flex flex-wrap gap-1.5">
          {activeOfficer.capabilities.map((cap) => (
            <span key={cap} className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--brand-primary)]">
              {cap.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--muted)]">
          {officers.length} · {t("supportOps.settings.officer")}: {activeOfficer.id}
        </p>
      </SectionCard>

      {/* Language */}
      <SectionCard title={t("supportOps.settings.language")} subtitle={t("supportOps.settings.languageHint")}>
        <div className="flex items-center gap-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface-2)] p-1" role="group">
          {(["en", "fr", "ha"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-extrabold uppercase transition-colors ${
                lang === l ? "bg-[var(--surface)] text-[var(--brand-primary)] shadow-sm" : "text-[var(--muted)]"
              }`}
            >
              {l === "en" ? "English" : l === "fr" ? "Français" : "Hausa"}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard title={t("supportOps.settings.appearance")}>
        <div className="flex items-center gap-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface-2)] p-1" role="group">
          <button
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-extrabold transition-colors ${
              theme === "light" ? "bg-[var(--surface)] text-[var(--brand-primary)] shadow-sm" : "text-[var(--muted)]"
            }`}
          >
            {t("supportOps.header.light")}
          </button>
          <button
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-extrabold transition-colors ${
              theme === "dark" ? "bg-[var(--surface)] text-[var(--brand-primary)] shadow-sm" : "text-[var(--muted)]"
            }`}
          >
            {t("supportOps.header.dark")}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
