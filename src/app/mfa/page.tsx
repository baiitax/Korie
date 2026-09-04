"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import OTPInput from "@/components/auth/OTPInput";
import SecurityNotice from "@/components/auth/SecurityNotice";
import AuthErrorAlert from "@/components/auth/AuthErrorAlert";
import { useAuth } from "@/components/auth/AuthContext";
import { ArrowRight, ArrowLeft, ShieldAlert, Smartphone, Key, HelpCircle } from "lucide-react";

export default function MfaChallengePage() {
  const router = useRouter();
  const { verifyMfa, user } = useAuth();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (codeToVerify?: string) => {
    setError(null);
    setIsVerifying(true);

    try {
      if (useBackupCode) {
        if (!backupCode.trim() || backupCode.trim().length < 8) {
          setError("Please enter a valid 8-character emergency backup recovery key.");
          setIsVerifying(false);
          return;
        }
        // Simulated backup key acceptance
        setTimeout(() => {
          setIsVerifying(false);
          router.push("/admin");
        }, 600);
        return;
      }

      const fullCode = codeToVerify || otp.join("");
      if (fullCode.length < 6) {
        setError("Please enter the complete 6-digit token from your authenticator app.");
        setIsVerifying(false);
        return;
      }

      const res = await verifyMfa(fullCode);
      if (!res.success) {
        setError(res.error || "The security token is invalid. Please check your authenticator clock synchronization.");
      }
    } catch {
      setError("An unexpected error occurred during step-up authentication. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-md space-y-6">
        <AuthHeader
          titleEn="Verify it's you"
          titleHa="Tabbatar da Kai Ne"
          titleFr="Vérification en deux étapes"
          subtitleEn="Enter the verification code from your authenticator app (Google Authenticator, Microsoft Authenticator, or YubiKey)."
          subtitleHa="Shigar da lambar sirri daga manhajar tantancewa ta wayarka."
          subtitleFr="Entrez le code de vérification généré par votre application d'authentification."
          badge="High-Assurance Challenge (AAL2)"
        />

        <AuthCard>
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="space-y-4"
          >
            {useBackupCode ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Emergency Backup Code</span>
                  </label>
                  <span className="text-[11px] text-amber-400 font-mono">One-Time Use</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. KP-SEC-9982-A4F1"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-[#070d18] border border-white/[0.12] text-white font-mono text-xs sm:text-sm placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                />
              </div>
            ) : (
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 mb-1">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Time-Based Passcode (TOTP)</span>
                </div>
                <OTPInput
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (error) setError(null);
                  }}
                  disabled={isVerifying}
                  hasError={!!error}
                  onComplete={(code) => handleVerify(code)}
                />
              </div>
            )}

            {/* Trust Device */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  disabled={isVerifying}
                  className="w-4 h-4 rounded bg-[#070d18] border-white/20 text-emerald-500 focus:ring-emerald-500/30"
                />
                <span>Trust this device for 30 days</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setError(null);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] transition-colors"
              >
                {useBackupCode ? "Use Authenticator App" : "Use Backup Key"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isVerifying || (!useBackupCode && otp.some((d) => !d)) || (useBackupCode && !backupCode)}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {isVerifying && (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isVerifying ? "Verifying Security Token..." : "Confirm & Elevate Session"}</span>
              {!isVerifying && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
            </button>

            <SecurityNotice />
          </form>

          <div className="pt-2 flex items-center justify-between text-xs border-t border-white/[0.08]">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>

            <Link
              href="/support"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Lost Device Help</span>
            </Link>
          </div>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
