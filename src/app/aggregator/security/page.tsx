"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function AggregatorSecurityPage() {
  const { aggregator, t } = useAggregator();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Security & Access Control</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Manage your login credentials for this aggregator staff account.
        </p>
      </div>

      <ChangePasswordCard currentEmail={aggregator.contactEmail} />

      {/* Honest roadmap notice — no fake toggles */}
      <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="font-bold text-[var(--foreground)] text-base">Planned Controls</h3>
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">
          Multi-factor authentication (TOTP) and IP allowlisting for the aggregator command center are on the
          security roadmap and not available yet — this page will not display a control until it is actually
          enforced server-side.
        </p>
      </div>
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
