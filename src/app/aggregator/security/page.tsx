"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { aggregatorApiFetch } from "@/lib/aggregator/aggregatorSession";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Trash2,
  Plus,
  Globe,
} from "lucide-react";

export default function AggregatorSecurityPage() {
  const { aggregator, hasPermission } = useAggregator();
  const canManageOrgSecurity = hasPermission("aggregator.security.manage");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Security & Access Control</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Manage your login credentials, multi-factor authentication, and your organization&apos;s IP allowlist.
        </p>
      </div>

      <ChangePasswordCard currentEmail={aggregator.contactEmail} />
      <MfaCard canManageOrgSecurity={canManageOrgSecurity} />
      <IpAllowlistCard canManageOrgSecurity={canManageOrgSecurity} />
    </div>
  );
}

interface SecurityPosture {
  mfa: { hasVerifiedFactor: boolean; organizationRequiresMfa: boolean };
  ipAllowlist: { id: string; cidr: string; label: string | null; createdAt: string }[];
  canManageOrgSecurity: boolean;
}

function useSecurityPosture() {
  const [posture, setPosture] = useState<SecurityPosture | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/security");
      const json = await res.json();
      if (res.ok && json?.data) {
        setPosture(json.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { posture, isLoading, refresh };
}

function MfaCard({ canManageOrgSecurity }: { canManageOrgSecurity: boolean }) {
  const { posture, isLoading, refresh } = useSecurityPosture();
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

  const toggleOrgEnforcement = async (required: boolean) => {
    setError(null);
    setSuccess(null);
    setIsBusy(true);
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/security", {
        method: "PATCH",
        body: JSON.stringify({ mfaRequired: required }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Could not update the organization MFA requirement.");
        return;
      }
      setSuccess(required ? "MFA is now required for all staff." : "MFA is no longer required organization-wide.");
      refresh();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
      <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-sm">
        <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <span>Multi-Factor Authentication (TOTP)</span>
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

          {posture?.mfa.organizationRequiresMfa && (
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Your organization requires MFA for every staff member to perform privileged actions (float dispatch,
              settlements, key management, etc.).
            </p>
          )}

          {!enrolling && !posture?.mfa.hasVerifiedFactor && (
            <button
              type="button"
              onClick={startEnrollment}
              disabled={isBusy}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {isBusy ? "Starting…" : "Enable Authenticator App"}
            </button>
          )}

          {enrolling && qrCode && (
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Scan this QR code with Google Authenticator, Microsoft Authenticator, or any TOTP app, then enter the
                6-digit code it generates.
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
                className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-sm tracking-widest text-center font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmEnrollment}
                  disabled={isBusy}
                  className="flex-1 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold disabled:opacity-50"
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

          {canManageOrgSecurity && (
            <div className="pt-3 border-t border-[var(--border)] space-y-2">
              <p className="text-[11px] font-semibold text-[var(--foreground-muted)]">Organization-wide enforcement</p>
              <label className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={Boolean(posture?.mfa.organizationRequiresMfa)}
                  disabled={isBusy}
                  onChange={(e) => toggleOrgEnforcement(e.target.checked)}
                  className="rounded"
                />
                Require MFA for every staff member before they can perform privileged actions
              </label>
              {!posture?.mfa.hasVerifiedFactor && (
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Enroll your own authenticator above before you can turn this on.
                </p>
              )}
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
  );
}

function IpAllowlistCard({ canManageOrgSecurity }: { canManageOrgSecurity: boolean }) {
  const { posture, isLoading, refresh } = useSecurityPosture();
  const [cidr, setCidr] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const addEntry = async () => {
    setError(null);
    setSuccess(null);
    if (!cidr.trim()) {
      setError("Enter an IP address or CIDR block.");
      return;
    }
    setIsBusy(true);
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/security/ip-allowlist", {
        method: "POST",
        body: JSON.stringify({ cidr: cidr.trim(), label: label.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Could not add this entry.");
        return;
      }
      setSuccess(`Added ${json.data.cidr} to the allowlist.`);
      setCidr("");
      setLabel("");
      refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const removeEntry = async (id: string) => {
    setError(null);
    setSuccess(null);
    setIsBusy(true);
    try {
      const res = await aggregatorApiFetch(`/api/v1/aggregator/security/ip-allowlist?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Could not remove this entry.");
        return;
      }
      refresh();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
      <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-sm">
        <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <span>IP Allowlist</span>
      </div>
      <p className="text-[11px] text-[var(--foreground-muted)]">
        Optional. When at least one entry is configured, staff API access is restricted to these IP addresses/ranges
        only. With no entries, access is unrestricted (the default).
      </p>

      {isLoading ? (
        <p className="text-xs text-[var(--foreground-muted)]">Loading…</p>
      ) : (
        <>
          <div className="space-y-2">
            {(posture?.ipAllowlist || []).length === 0 ? (
              <p className="text-[11px] text-[var(--foreground-muted)] italic">No restriction configured — access is open from any IP.</p>
            ) : (
              posture!.ipAllowlist.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <div>
                    <p className="text-xs font-mono text-[var(--foreground)]">{entry.cidr}</p>
                    {entry.label && <p className="text-[11px] text-[var(--foreground-muted)]">{entry.label}</p>}
                  </div>
                  {canManageOrgSecurity && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 disabled:opacity-50"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {canManageOrgSecurity ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                placeholder="e.g. 41.58.12.0/24"
                className="flex-1 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs font-mono placeholder:text-[var(--foreground-muted)] focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (optional)"
                className="flex-1 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs placeholder:text-[var(--foreground-muted)] focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addEntry}
                disabled={isBusy}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--foreground-muted)] italic">
              Only your organization&apos;s Owner/Admin can manage the IP allowlist.
            </p>
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
  );
}

function ChangePasswordCard({ currentEmail }: { currentEmail: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword) {
      setError("Enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (!currentPassword) {
      setError("Enter your current password to confirm this change.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Re-authenticate with the current password before allowing a
      // credential change — this genuinely verifies identity against a
      // real Supabase Auth session, not a mock.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });
      if (reauthError) {
        setError("Current password is incorrect.");
        setIsSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message || "Could not update your password.");
        setIsSubmitting(false);
        return;
      }

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not update your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
      <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-sm">
        <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <span>Change Password</span>
      </div>
      <p className="text-[11px] text-[var(--foreground-muted)] -mt-2">
        Login email: <span className="text-[var(--foreground)] font-mono">{currentEmail}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-[11px] font-semibold text-[var(--foreground-muted)]">Current Password</label>
          <input
            type={showPasswords ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Your current password"
            className="w-full p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs placeholder:text-[var(--foreground-muted)] focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[var(--foreground-muted)]">New Password</label>
          <input
            type={showPasswords ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs placeholder:text-[var(--foreground-muted)] focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[var(--foreground-muted)]">Confirm New Password</label>
          <input
            type={showPasswords ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            className="w-full p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs placeholder:text-[var(--foreground-muted)] focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowPasswords(!showPasswords)}
        className="text-[11px] text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center gap-1.5"
      >
        {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        <span>{showPasswords ? "Hide" : "Show"} passwords</span>
      </button>

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

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
        >
          {isSubmitting ? "Updating…" : "Update Password"}
        </button>
      </div>
    </form>
  );
}
