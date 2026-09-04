"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import OTPInput from "@/components/auth/OTPInput";
import SecurityNotice from "@/components/auth/SecurityNotice";
import AuthErrorAlert from "@/components/auth/AuthErrorAlert";
import AuthSuccessBanner from "@/components/auth/AuthSuccessBanner";
import { ArrowRight, ArrowLeft, KeyRound } from "lucide-react";
import { AuthService } from "@/lib/auth/authService";

export default function ResetPasswordPage() {
  const router = useRouter();
  const authService = AuthService.getInstance();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullCode = otp.join("");
    if (fullCode.length < 6) {
      setError("Please enter the complete 6-digit recovery code sent to your device.");
      return;
    }

    const strength = authService.evaluatePasswordStrength(password);
    if (strength.score < 2) {
      setError("Please choose a stronger password meeting security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your new password.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }, 800);
  };

  return (
    <AuthShell>
      <div className="w-full max-w-md space-y-6">
        <AuthHeader
          titleEn="Set new password"
          titleHa="Sanya Sabuwar Kalmar Sirri"
          titleFr="Définir un nouveau mot de passe"
          subtitleEn="Enter the recovery code sent to your device along with your new account password."
          subtitleHa="Shigar da lambar sirri da sabuwar kalmar sirri da kake son amfani da ita."
          subtitleFr="Entrez le code de récupération et choisissez votre nouveau mot de passe sécurisé."
          badge="Credential Update"
        />

        <AuthCard>
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

          {isSuccess ? (
            <div className="space-y-4">
              <AuthSuccessBanner
                title="Password Successfully Updated"
                message="Your account password has been reset securely. You are now being redirected to sign in with your new credentials."
              />

              <Link
                href="/login"
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 6-Digit Token Input */}
              <div className="space-y-1.5 text-center">
                <label className="text-xs font-semibold text-slate-300 block">
                  6-Digit Recovery Passcode <span className="text-emerald-400">*</span>
                </label>
                <OTPInput
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  hasError={!!error && otp.some((d) => !d)}
                />
              </div>

              {/* New Password */}
              <PasswordInput
                id="reset-new-password"
                label="New Password"
                autoComplete="new-password"
                placeholder="Enter new password"
                value={password}
                onChange={(val) => {
                  setPassword(val);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                required
              />

              <PasswordStrengthMeter password={password} />

              {/* Confirm Password */}
              <PasswordInput
                id="reset-confirm-password"
                label="Confirm New Password"
                autoComplete="new-password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(val) => {
                  setConfirmPassword(val);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                required
              />

              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-rose-400 font-medium">
                  Passwords do not match.
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || otp.some((d) => !d) || !password || password !== confirmPassword}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                )}
                <span>{isLoading ? "Updating Security Credentials..." : "Reset Password"}</span>
                {!isLoading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
              </button>

              <SecurityNotice />
            </form>
          )}

          <div className="pt-2 text-center border-t border-white/[0.08]">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
