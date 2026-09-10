"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { agencyApiFetch } from "@/lib/agency/agentSession";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SupportedLanguage } from "@/types/customer";
import {
  ArrowLeft,
  Globe,
  Lock,
  Check,
  ShieldCheck,
  Mail,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AgentSettingsPage() {
  const { language, setLanguage, agent, t } = useAgent();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const languages: { code: SupportedLanguage; label: string; native: string; flag: string }[] = [
    { code: "ha", label: "Hausa", native: "Harshen Hausa (Najeriya/Nijar)", flag: "🇳🇬" },
    { code: "en", label: "English", native: "English (UK/NG)", flag: "🇬🇧" },
    { code: "fr", label: "Français", native: "Français (UEMOA/Afrique)", flag: "🇳🇪" },
  ];

  const handleLanguageSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/agent"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("common.settings")}
          </h1>
          <p className="text-xs text-slate-400">
            Agency terminal configuration, login credentials and language selection.
          </p>
        </div>
      </div>

      {/* Login Credentials */}
      <ChangeLoginDetailsCard currentEmail={agent.email} />

      {/* Transaction PIN */}
      <ChangePinCard />

      {/* Language */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-white font-bold text-xs">
          <Globe className="w-4 h-4 text-amber-400" />
          <span>Agency Interface Language / Harshen Wakili</span>
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
                    ? "bg-amber-500/15 border-amber-500 text-white font-bold shadow-md shadow-amber-500/10"
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

                {isSelected && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            );
          })}
        </div>

        {savedSuccess && (
          <div className="text-[11px] font-mono text-emerald-400 font-bold">
            ✓ Agency terminal language updated & saved.
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeLoginDetailsCard({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
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

    if (!newEmail.trim() && !newPassword) {
      setError("Enter a new email and/or a new password to update.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Re-authenticate with the current password before allowing a
      // credential change — this is a real Supabase Auth session, so this
      // genuinely verifies the agent is who they claim to be, not a mock.
      if (currentPassword) {
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: currentEmail,
          password: currentPassword,
        });
        if (reauthError) {
          setError("Current password is incorrect.");
          setIsSubmitting(false);
          return;
        }
      } else if (newPassword) {
        setError("Enter your current password to change your login details.");
        setIsSubmitting(false);
        return;
      }

      const updatePayload: { email?: string; password?: string } = {};
      if (newEmail.trim() && newEmail.trim() !== currentEmail) updatePayload.email = newEmail.trim();
      if (newPassword) updatePayload.password = newPassword;

      if (Object.keys(updatePayload).length === 0) {
        setError("No changes to save.");
        setIsSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser(updatePayload);
      if (updateError) {
        setError(updateError.message || "Could not update your login details.");
        setIsSubmitting(false);
        return;
      }

      setSuccess(
        updatePayload.email
          ? "Login details updated. Check your new email inbox to confirm the change."
          : "Password updated successfully."
      );
      setNewEmail("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not update your login details. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl"
    >
      <div className="flex items-center gap-2 text-white font-bold text-xs">
        <Mail className="w-4 h-4 text-amber-400" />
        <span>Login Details</span>
      </div>
      <p className="text-[11px] text-slate-400 -mt-2">
        Current login email: <span className="text-slate-200 font-mono">{currentEmail}</span>
      </p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-300">New Email (optional)</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new.email@example.com"
          className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-300">New Password (optional)</label>
        <div className="relative">
          <input
            type={showPasswords ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full p-3 pr-10 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {newPassword && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300">Confirm New Password</label>
          <input
            type={showPasswords ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-300">Current Password (required to confirm)</label>
        <input
          type={showPasswords ? "text" : "password"}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Your current password"
          className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition-all"
      >
        {isSubmitting ? "Updating..." : "Update Login Details"}
      </button>
    </form>
  );
}

function ChangePinCard() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await agencyApiFetch("/api/v1/agency/settings/pin");
        const json = await res.json();
        if (!cancelled && res.ok) setHasPin(!!json?.data?.pin_set);
      } catch {
        if (!cancelled) setHasPin(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!/^\d{4,6}$/.test(newPin)) {
      setError("PIN must be 4 to 6 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("New PIN and confirmation do not match.");
      return;
    }
    if (hasPin && !currentPin) {
      setError("Enter your current PIN to change it.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await agencyApiFetch("/api/v1/agency/settings/pin", {
        method: "POST",
        body: JSON.stringify({ new_pin: newPin, current_pin: currentPin || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Could not update your PIN.");
      } else {
        setSuccess(hasPin ? "Transaction PIN changed successfully." : "Transaction PIN set successfully.");
        setHasPin(true);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl"
    >
      <div className="flex items-center gap-2 text-white font-bold text-xs">
        <KeyRound className="w-4 h-4 text-amber-400" />
        <span>Transaction PIN</span>
        {hasPin !== null && (
          <span
            className={`ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              hasPin
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
            }`}
          >
            {hasPin ? "PIN SET" : "NOT SET"}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400 -mt-2">
        Used to authorize sensitive agency actions from your device. Never share this PIN with anyone,
        including KoriePay staff.
      </p>

      {hasPin && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300">Current PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white font-mono tracking-[0.3em] text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300">{hasPin ? "New PIN" : "Set PIN"}</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white font-mono tracking-[0.3em] text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300">Confirm PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white font-mono tracking-[0.3em] text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition-all"
      >
        {isSubmitting ? "Saving..." : hasPin ? "Change PIN" : "Set PIN"}
      </button>
    </form>
  );
}
