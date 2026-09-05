"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import CustomerProfileGate from "@/components/customer/ui/CustomerProfileGate";
import {
  ArrowLeft,
  ShieldCheck,
  Fingerprint,
  Lock,
  KeyRound,
  Smartphone,
  LifeBuoy,
} from "lucide-react";

/**
 * Security settings.
 *
 * What this page used to do was worse than looking unfinished:
 *   • "Log Out All Other Devices" filtered a hard-coded fixture list
 *     (`SECURITY_SESSIONS`: "iPhone 15 Pro Max", "Abuja, Nigeria", …) in local
 *     React state and printed "All other active device sessions have been
 *     terminated." Nothing was revoked and the devices were never real.
 *   • The 2FA and biometric switches flipped local state only, so a customer
 *     could turn "Require an SMS OTP on every financial transaction" ON and
 *     believe the account was protected.
 *   • "Change PIN" and "Change Password" called `window.alert()`.
 *
 * There is no session store, no PIN/password change endpoint and no factor
 * enrolment endpoint in this codebase. So the page now reports the security
 * state the session actually returns, and routes every change through the
 * resolution desk, which opens a real case. A control that cannot change
 * anything is removed rather than simulated — a fake security toggle is a
 * false claim about the safety of someone's money.
 */
export default function CustomerSecurityPage() {
  const { customer, t } = useCustomer();

  const mfaEnabled = !!customer?.mfaEnabled;
  const biometricEnabled = !!customer?.biometricEnabled;

  return (
    <CustomerProfileGate>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
          <Link href="/customer/settings" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("security.title")}</h1>
            <p className="text-xs text-[var(--foreground-muted)]">{t("customer.securityPage.subtitle")}</p>
          </div>
        </div>

        {/* Factors, read from the session — reported, not switched */}
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden shadow-[var(--shadow-card)]">
          <div className="p-5 space-y-3">
            <h2 className="text-[10px] font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">{t("customer.securityPage.factorsTitle")}</h2>
            <FactorRow
              icon={<ShieldCheck className="w-5 h-5" />}
              title={t("security.twoFactorTitle")}
              desc={t("security.twoFactorDesc")}
              on={mfaEnabled}
            />
            <FactorRow
              icon={<Fingerprint className="w-5 h-5" />}
              title={t("security.biometricTitle")}
              desc={t("security.biometricDesc")}
              on={biometricEnabled}
            />
            <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)] pt-1">
              {t("customer.securityPage.factorsNote")}
            </p>
          </div>

          <Link href="/customer/support" className="p-5 flex items-center justify-between gap-4 hover:bg-[var(--surface-elevated)] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--info-soft)] text-[var(--info)] flex items-center justify-center shrink-0">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--foreground)]">{t("customer.securityPage.requestChange")}</div>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5 max-w-sm">{t("customer.securityPage.requestChangeDesc")}</p>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 rotate-180 text-[var(--foreground-muted)] shrink-0" />
          </Link>
        </div>

        {/* Credentials — real destinations, no alert() */}
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
          <h2 className="text-[10px] font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">{t("customer.securityPage.credentialsTitle")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CredentialRow
              href="/customer/support"
              icon={<KeyRound className="w-5 h-5" />}
              title={t("security.changePin")}
              desc={t("customer.securityPage.changePinDesc")}
            />
            <CredentialRow
              href="/customer/support"
              icon={<Lock className="w-5 h-5" />}
              title={t("security.changePassword")}
              desc={t("customer.securityPage.changePasswordDesc")}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            {t("customer.securityPage.credentialsNote")}
          </p>
        </div>

        {/* Sessions: no store exists, so say so instead of listing fixtures */}
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[10px] font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">{t("security.activeSessions")}</h2>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]">
              {t("common.comingSoon")}
            </span>
          </div>
          <div className="flex items-start gap-2 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] p-4 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            <Smartphone className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t("customer.securityPage.sessionsUnavailable")}</span>
          </div>
        </div>
      </div>
    </CustomerProfileGate>
  );
}

function FactorRow({ icon, title, desc, on }: { icon: React.ReactNode; title: string; desc: string; on: boolean }) {
  const { t } = useCustomer();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <div className="text-xs font-bold text-[var(--foreground)]">{title}</div>
          <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5 max-w-sm">{desc}</p>
        </div>
      </div>
      <span
        className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
          on
            ? "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-soft)]"
            : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border)]"
        }`}
      >
        {on ? t("customer.securityPage.statusOn") : t("customer.securityPage.statusOff")}
      </span>
    </div>
  );
}

function CredentialRow({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="p-4 rounded-2xl bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] border border-[var(--border)] text-left transition-all flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-[var(--foreground)]">{title}</div>
        <div className="text-[10px] text-[var(--foreground-muted)]">{desc}</div>
      </div>
    </Link>
  );
}
