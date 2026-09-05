"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { SECURITY_SESSIONS } from "@/services/customerDataService";
import { ArrowLeft, ShieldCheck, Smartphone, Laptop, Fingerprint, Lock, KeyRound, CheckCircle2 } from "lucide-react";

export default function CustomerSecurityPage() {
  const { customer, t } = useCustomer();
  const [mfaEnabled, setMfaEnabled] = useState(customer.mfaEnabled);
  const [biometricsEnabled, setBiometricsEnabled] = useState(customer.biometricEnabled);
  const [sessions, setSessions] = useState(SECURITY_SESSIONS);
  const [revokedMessage, setRevokedMessage] = useState<string | null>(null);

  const handleRevokeOthers = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrentSession));
    setRevokedMessage(t("customer.securityPage.revokeMessage"));
    setTimeout(() => setRevokedMessage(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("security.title")}</h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("security.subtitle")}</p>
        </div>
      </div>

      {/* Security Switches */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden shadow-[var(--shadow-card)]">
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--foreground)]">{t("security.twoFactorTitle")}</div>
              <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{t("security.twoFactorDesc")}</p>
            </div>
          </div>
          <Toggle on={mfaEnabled} onToggle={() => setMfaEnabled(!mfaEnabled)} />
        </div>
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--foreground)]">{t("security.biometricTitle")}</div>
              <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{t("security.biometricDesc")}</p>
            </div>
          </div>
          <Toggle on={biometricsEnabled} onToggle={() => setBiometricsEnabled(!biometricsEnabled)} />
        </div>
      </div>

      {/* PIN & Password Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => alert(t("customer.securityPage.changePinDesc"))}
          className="p-4 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--border-strong)] text-left transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center shrink-0"><KeyRound className="w-5 h-5" /></div>
          <div>
            <div className="text-xs font-bold text-[var(--foreground)]">{t("security.changePin")}</div>
            <div className="text-[10px] text-[var(--foreground-muted)]">{t("customer.securityPage.changePinDesc")}</div>
          </div>
        </button>
        <button onClick={() => alert(t("customer.securityPage.changePasswordDesc"))}
          className="p-4 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--border-strong)] text-left transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--info-soft)] text-[var(--info)] flex items-center justify-center shrink-0"><Lock className="w-5 h-5" /></div>
          <div>
            <div className="text-xs font-bold text-[var(--foreground)]">{t("security.changePassword")}</div>
            <div className="text-[10px] text-[var(--foreground-muted)]">{t("customer.securityPage.changePasswordDesc")}</div>
          </div>
        </button>
      </div>

      {/* Active Device Sessions */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">{t("security.activeSessions")}</h2>
          {sessions.length > 1 && (
            <button onClick={handleRevokeOthers} className="text-xs text-[var(--danger)] hover:text-[var(--danger)] font-bold">{t("security.revokeOtherSessions")}</button>
          )}
        </div>

        {revokedMessage && (
          <div className="p-3 rounded-xl bg-[var(--success-soft)] border border-[var(--success-soft)] text-xs text-[var(--success)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{revokedMessage}</span>
          </div>
        )}

        <div className="divide-y divide-[var(--border)]">
          {sessions.map((sess) => (
            <div key={sess.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--foreground-muted)]">
                  {sess.browser.includes("Mobile") || sess.browser.includes("iOS") ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-bold text-[var(--foreground)] flex items-center gap-2">
                    <span>{sess.deviceName}</span>
                    {sess.isCurrentSession && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-border)] uppercase">{t("customer.securityPage.thisDevice")}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--foreground-muted)] font-mono">{sess.browser} · {sess.locationApprox}</div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[var(--foreground-muted)] shrink-0">{sess.lastActive}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={on} className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? "bg-[var(--brand-primary)]" : "bg-[var(--border-strong)]"}`}>
      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}
