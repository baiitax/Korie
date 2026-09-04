"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import IdentifierInput from "@/components/auth/IdentifierInput";
import SecurityNotice from "@/components/auth/SecurityNotice";
import AuthErrorAlert from "@/components/auth/AuthErrorAlert";
import AuthSuccessBanner from "@/components/auth/AuthSuccessBanner";
import { ArrowRight, ArrowLeft, Mail, ShieldAlert } from "lucide-react";
import { AuthService } from "@/lib/auth/authService";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authService = AuthService.getInstance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Please enter your registered phone number or email address.");
      return;
    }

    setIsLoading(true);
    // Simulate safe dispatch without leaking whether account exists
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 700);
  };

  const maskedId = identifier.includes("@")
    ? authService.maskEmail(identifier)
    : authService.maskPhone(identifier);

  return (
    <AuthShell>
      <div className="w-full max-w-md space-y-6">
        <AuthHeader
          titleEn="Reset your password"
          titleHa="Sake Kalmar Sirri"
          titleFr="Réinitialiser votre mot de passe"
          subtitleEn="Enter the email or phone number associated with your KoriePay account to receive recovery instructions."
          subtitleHa="Shigar da lambar waya ko imel din da ka bude asusunka da shi."
          subtitleFr="Entrez l'adresse email ou le numéro de téléphone associé à votre compte KoriePay."
          badge="Account Security Recovery"
        />

        <AuthCard>
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

          {isSubmitted ? (
            <div className="space-y-5">
              <AuthSuccessBanner
                title="Recovery Instructions Dispatched"
                message={`If an account matches ${maskedId}, a secure 6-digit recovery code has been dispatched. For security, these instructions expire in 15 minutes.`}
              />

              <div className="space-y-2">
                <Link
                  href="/reset-password"
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <span>Enter Recovery Code</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="w-full py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-bold text-xs transition-colors"
                >
                  Try Another Identifier
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                For security reasons, we do not disclose whether an account exists. If valid, a one-time reset code will be delivered instantly.
              </p>

              <IdentifierInput
                value={identifier}
                onChange={(val) => {
                  setIdentifier(val);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-60 flex items-center justify-center gap-2 group"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                )}
                <span>{isLoading ? "Dispatching Recovery..." : "Send Reset Code"}</span>
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
