"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import OTPInput from "@/components/auth/OTPInput";
import SecurityNotice from "@/components/auth/SecurityNotice";
import AuthErrorAlert from "@/components/auth/AuthErrorAlert";
import { useAuth } from "@/components/auth/AuthContext";
import { ArrowRight, ArrowLeft, RotateCw, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function OtpVerificationPage() {
  const router = useRouter();
  const { verifyOtp, user, pendingDestination, jurisdiction } = useAuth();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(45);
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Timer countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleVerify = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otp.join("");
    if (fullCode.length < 6) {
      setError("Please enter the complete 6-digit verification passcode.");
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const res = await verifyOtp(fullCode);
      if (!res.success) {
        setError(res.error || "The one-time passcode you entered is incorrect or has expired.");
      }
    } catch {
      setError("An unexpected error occurred during verification. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0 || resendCount >= 3) return;

    setIsResending(true);
    setError(null);
    setResendNotice(null);

    setTimeout(() => {
      setIsResending(false);
      setResendCount((prev) => prev + 1);
      setCountdown(45);
      setResendNotice("A new 6-digit one-time passcode has been dispatched.");
      setOtp(["", "", "", "", "", ""]);
    }, 600);
  };

  const maskedTarget =
    pendingDestination ||
    (user?.phone ? `+234 ••• ••• ${user.phone.slice(-4)}` : "+234 ••• ••• 7766");

  return (
    <AuthShell>
      <div className="w-full max-w-md space-y-6">
        <AuthHeader
          titleEn="Verify your account"
          titleHa="Tabbatar da Asusu"
          titleFr="Vérifier votre compte"
          subtitleEn={`We sent a secure 6-digit verification code to ${maskedTarget}.`}
          subtitleHa={`Mun tura lambar tantancewa mai lamba 6 zuwa ${maskedTarget}.`}
          subtitleFr={`Nous avons envoyé un code de vérification à 6 chiffres au ${maskedTarget}.`}
          badge="Two-Factor Authentication"
        />

        <AuthCard>
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

          {resendNotice && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resendNotice}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="space-y-5"
          >
            <div className="space-y-2 text-center">
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
              <p className="text-[11px] text-slate-400">
                Code expires automatically in 10 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying || otp.some((d) => !d)}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {isVerifying && (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isVerifying ? "Verifying Token..." : "Verify & Launch Portal"}</span>
              {!isVerifying && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
            </button>

            {/* Resend Code Action */}
            <div className="text-center pt-1">
              {countdown > 0 ? (
                <span className="text-xs text-slate-400 font-mono">
                  Resend code in 00:{countdown < 10 ? `0${countdown}` : countdown}
                </span>
              ) : resendCount >= 3 ? (
                <span className="text-xs text-amber-400">
                  Maximum resends reached. Please contact Support if you need assistance.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
                  <span>Resend Code</span>
                </button>
              )}
            </div>

            <SecurityNotice />
          </form>

          <div className="pt-2 text-center border-t border-white/[0.08]">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
