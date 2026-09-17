"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { adminApiFetch } from "@/lib/admin/adminSession";
import { CheckCircle2, AlertCircle, Smartphone, ShieldCheck } from "lucide-react";

/**
 * Admin MFA enrollment card (ADMIN_PORTAL_REVIEW.md finding #2).
 *
 * Same Supabase Auth native TOTP primitive as the Aggregator portal's
 * Security & Access Control page (auth.mfa.enroll/challenge/verify), but
 * with no organization-wide toggle: enforcement on admin mutations is
 * unconditional for any account created on/after the enforcement cutoff,
 * so this card is only ever about the caller's OWN factor.
 */

interface AdminSecurityPosture {
  mfa: {
    hasVerifiedFactor: boolean;
    isGrandfathered: boolean;
    enforcementCutoff: string;
    canMutateWithoutEnrolling: boolean;
  };
}

function usePosture() {
  const [posture, setPosture] = useState<AdminSecurityPosture | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApiFetch("/api/admin/security");
      const json = await res.json();
      if (res.ok && json?.data) setPosture(json.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { posture, isLoading, refresh };
}

export default function AdminMfaCard() {
  const { posture, isLoading, refresh } = usePosture();
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const startEnrollment = async () => {
    setError(null);
    setSuccess(null);
    setIsBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (enrollError || !data) {
        setError(enrollError?.message || "Could not start MFA enrollment.");
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setEnrolling(true);
    } finally {
      setIsBusy(false);
    }
  };

  const confirmEnrollment = async () => {
    if (!factorId || verifyCode.trim().length < 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challenge) {
        setError(challengeError?.message || "Could not start the verification challenge.");
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      });
      if (verifyError) {
        setError(verifyError.message || "That code did not verify. Check your authenticator app's clock and try again.");
        return;
      }
      setSuccess("Authenticator enrolled and verified. MFA is now active on your account.");
      setEnrolling(false);
      setQrCode(null);
      setFactorId(null);
      setVerifyCode("");
      refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const cancelEnrollment = async () => {
    if (factorId) {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrolling(false);
    setQrCode(null);
    setFactorId(null);
    setVerifyCode("");
    setError(null);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
        Multi-factor authentication
      </h2>
      <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-sm">
          <Smartphone className="w-4 h-4 text-[var(--brand-primary)]" />
          <span>Authenticator App (TOTP)</span>
        </div>

        {isLoading ? (
          <p className="text-xs text-[var(--foreground-muted)]">Loading your security status…</p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs">
              {posture?.mfa.hasVerifiedFactor ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Enabled on your account
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> Not enabled on your account
                </span>
              )}
            </div>

            <p className="text-[11px] text-[var(--foreground-muted)] flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--brand-primary)]" />
              {posture?.mfa.isGrandfathered && !posture?.mfa.hasVerifiedFactor ? (
                <span>
                  This account predates admin MFA enforcement, so it can still perform actions today — but enrolling
                  now is strongly recommended. Every account created since {formatCutoff(posture?.mfa.enforcementCutoff)} is
                  already required to enroll before performing any admin action that changes data.
                </span>
              ) : (
                <span>
                  Every admin action that changes data (approvals, ledger closes, FX rate changes, record edits)
                  requires a verified authenticator on this account.
                </span>
              )}
            </p>

            {!enrolling && !posture?.mfa.hasVerifiedFactor && (
              <button
                type="button"
                onClick={startEnrollment}
                disabled={isBusy}
                className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {isBusy ? "Starting…" : "Enable Authenticator App"}
              </button>
            )}

            {enrolling && qrCode && (
              <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Scan this QR code with Google Authenticator, Microsoft Authenticator, or any TOTP app, then enter
                  the 6-digit code it generates.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="TOTP enrollment QR code" className="w-40 h-40 rounded-xl bg-white p-2" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-sm tracking-widest text-center font-mono focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmEnrollment}
                    disabled={isBusy}
                    className="flex-1 px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold disabled:opacity-50"
                  >
                    {isBusy ? "Verifying…" : "Verify & Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEnrollment}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function formatCutoff(iso?: string): string {
  if (!iso) return "the enforcement cutoff";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}
