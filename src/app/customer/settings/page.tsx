"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { SupportedLanguage } from "@/types/customer";
import ThemeSelector from "@/components/customer/ui/ThemeSelector";
import {
  ArrowLeft,
  Globe,
  Bell,
  Check,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  Fingerprint,
  Palette,
  FileText,
  Lock,
} from "lucide-react";

/**
 * Settings — information architecture per §50.
 *
 * Order is deliberate and security-first: Security → Verification →
 * Appearance → Language → Notifications → Profile → Support.
 *
 * Two fixes in this pass:
 *  • Appearance did not exist anywhere on mobile, which is why the theme was
 *    "inaccessible". ThemeSelector is now a first-class section.
 *  • The language list previously used country flags (🇬🇧/🇳🇬/🇳🇪). Hausa is
 *    spoken in both countries and French is not Niger-only, so flags made the
 *    choice look geographic. Language is now EN / FR / HA as §49 requires.
 *
 * Notification channel toggles are shown DISABLED with an honest note: they
 * previously flipped local React state that was persisted nowhere and affected
 * nothing, which is a false control in a banking app.
 */
export default function CustomerSettingsPage() {
  const { language, setLanguage, t, notificationsCount, notificationsPhase } = useCustomer();

  const languages: { code: SupportedLanguage; short: string; label: string; native: string }[] = [
    { code: "en", short: "EN", label: "English", native: "English (UK/NG)" },
    { code: "fr", short: "FR", label: "Français", native: "Français (UEMOA)" },
    { code: "ha", short: "HA", label: "Hausa", native: "Harshen Hausa" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            {t("common.settings")}
          </h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("customer.settings.subtitle")}</p>
        </div>
      </div>

      {/* 1 · Security (priority position, §50) */}
      <Card icon={<ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />} title={t("customer.settings.securityGroup")}>
        <ul className="space-y-1">
          <LinkRow href="/customer/security" icon={<KeyRound className="w-4 h-4" />} label={t("nav.changePin")} note={t("customer.settings.pinNote")} primary />
          <LinkRow href="/customer/security" icon={<Lock className="w-4 h-4" />} label={t("nav.changePassword")} note={t("customer.settings.passwordNote")} />
          <LinkRow href="/customer/security" icon={<Fingerprint className="w-4 h-4" />} label={t("customer.settings.sessions")} note={t("customer.settings.sessionsNote")} />
        </ul>
      </Card>

      {/* 2 · Verification */}
      <Card icon={<ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />} title={t("nav.verification")}>
        <LinkRow href="/customer/kyc" icon={<FileText className="w-4 h-4" />} label={t("verification.title")} note={t("customer.settings.verificationNote")} asRow />
      </Card>

      {/* 3 · Appearance — the accessibility fix */}
      <Card icon={<Palette className="w-4 h-4 text-[var(--brand-primary)]" />} title={t("customer.settings.appearance")}>
        <ThemeSelector t={t} variant="segmented" />
      </Card>

      {/* 4 · Language */}
      <Card icon={<Globe className="w-4 h-4 text-[var(--brand-primary)]" />} title={t("customer.settings.preferredLanguage")}>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("customer.settings.preferredLanguage")}>
          {languages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setLanguage(lang.code)}
                className={`rounded-2xl border px-2 py-3 text-center transition-colors min-h-[64px] ${
                  isSelected
                    ? "bg-[var(--brand-soft)] border-[var(--brand-border)] shadow-[var(--shadow-sm)]"
                    : "bg-[var(--surface-elevated)] border-[var(--border)] hover:bg-[var(--surface)]"
                }`}
              >
                <span className={`block font-mono text-sm font-extrabold ${isSelected ? "text-[var(--brand-primary)]" : "text-[var(--foreground)]"}`}>
                  {lang.short}
                </span>
                <span className="block text-[10px] font-semibold text-[var(--foreground)] mt-1">{lang.label}</span>
                <span className="block text-[9px] text-[var(--foreground-muted)] truncate">{lang.native}</span>
                {isSelected && <Check className="w-3 h-3 text-[var(--brand-primary)] mx-auto mt-1" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">{t("customer.settings.languageNote")}</p>
      </Card>

      {/* 5 · Notifications */}
      <Card
        icon={<Bell className="w-4 h-4 text-[var(--brand-primary)]" />}
        title={t("customer.settings.notifications")}
        aside={
          notificationsPhase === "error" ? (
            <span className="text-[10px] font-bold text-[var(--danger)]">{t("customer.settings.alertsUnavailable")}</span>
          ) : (
            <span className="text-[10px] font-mono font-bold text-[var(--foreground-muted)]">
              {notificationsCount}
            </span>
          )
        }
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] px-3 py-2.5">
          <span className="text-[11px] text-[var(--foreground-muted)]">{t("customer.settings.channelTogglesNote")}</span>
          <span className="shrink-0 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md border border-[var(--border)] text-[var(--foreground-muted)]">
            {t("common.comingSoon")}
          </span>
        </div>
      </Card>

      {/* 6 · Profile / 7 · Support */}
      <Card icon={<FileText className="w-4 h-4 text-[var(--brand-primary)]" />} title={t("customer.settings.accountGroup")}>
        <ul className="space-y-1">
          <LinkRow href="/customer/profile" icon={<Globe className="w-4 h-4" />} label={t("nav.profile")} note={t("customer.settings.profileNote")} asRow />
          <LinkRow href="/customer/support" icon={<ShieldCheck className="w-4 h-4" />} label={t("nav.support")} note={t("customer.settings.supportNote")} asRow />
        </ul>
      </Card>

      <p className="text-[10px] text-[var(--foreground-muted)] text-center leading-relaxed pb-2">
        {t("customer.settings.storageNote")}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

const Card: React.FC<{
  icon: React.ReactNode;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, aside, children }) => (
  <section className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3.5 shadow-[var(--shadow-card)]">
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[var(--foreground)] font-bold text-xs">
        {icon}
        <span>{title}</span>
      </h2>
      {aside}
    </div>
    <div className="space-y-2">{children}</div>
  </section>
);

const LinkRow: React.FC<{
  href: string;
  icon: React.ReactNode;
  label: string;
  note: string;
  primary?: boolean;
  asRow?: boolean;
}> = ({ href, icon, label, note, primary, asRow }) => {
  const inner = (
    <>
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl border shrink-0 ${
          primary
            ? "bg-[var(--brand-soft)] border-[var(--brand-border)] text-[var(--brand-primary)]"
            : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)]"
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-[var(--foreground)]">{label}</span>
        <span className="block text-[10px] text-[var(--foreground-muted)] truncate">{note}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)] shrink-0" aria-hidden="true" />
    </>
  );
  const cls =
    "w-full flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] hover:bg-[var(--surface)] px-3 py-2.5 text-left transition-colors min-h-[56px]";
  return asRow ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <li>
      <Link href={href} className={cls}>
        {inner}
      </Link>
    </li>
  );
};
