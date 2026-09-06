"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import IdentifierInput from "@/components/auth/IdentifierInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SecurityNotice from "@/components/auth/SecurityNotice";
import AuthErrorAlert from "@/components/auth/AuthErrorAlert";
import { useAuth } from "@/components/auth/AuthContext";
import { KpayInlineLoader } from "@/components/loading";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login, language, jurisdiction } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login({
        identifier,
        password,
        rememberDevice,
        country: jurisdiction,
      });

      if (!result.success) {
        setError(
          result.errorMessage ||
            "We couldn't sign you in with those details. Please check your information and try again."
        );
      }
    } catch (err: any) {
      setError("A network or authentication service error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitText =
    isLoading
      ? language === "ha"
        ? "Ana tantancewa..."
        : language === "fr"
        ? "Authentification..."
        : "Signing you in…"
      : language === "ha"
      ? "Shiga Asusu"
      : language === "fr"
      ? "Se Connecter"
      : "Sign In";

  return (
    <AuthShell>
      <div className="w-full max-w-md space-y-6">
        <AuthHeader
          titleEn="Welcome back"
          titleHa="Barka da dawowa"
          titleFr="Bienvenue de retour"
          subtitleEn="Sign in securely to your KoriePay digital banking and settlement account."
          subtitleHa="Shigar da bayanan asusunka na KoriePay don ci gaba da sarrafa kudade."
          subtitleFr="Connectez-vous à votre compte bancaire et passerelle de règlement KoriePay."
          badge="Institutional Gateway"
        />

        <AuthCard>
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email — customer sign-in is by registered email address only. */}
            <IdentifierInput
              value={identifier}
              onChange={(val) => {
                setIdentifier(val);
                if (error) setError(null);
              }}
              disabled={isLoading}
              required
            />

            <PasswordInput
              value={password}
              onChange={(val) => {
                setPassword(val);
                if (error) setError(null);
              }}
              showForgotPassword
              disabled={isLoading}
              required
            />

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 rounded bg-[#070d18] border-white/20 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 transition-colors"
                />
                <span>Remember this device</span>
              </label>

              <span className="text-[11px] text-slate-400 font-mono">
                {jurisdiction === "NG" ? "Providus NG" : "Coris NE"}
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-60 flex items-center justify-center gap-2 group transform active:scale-[0.99]"
            >
              {isLoading && <KpayInlineLoader size="sm" className="border-slate-950 border-t-slate-950" />}
              <span>{submitText}</span>
              {!isLoading && (
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </form>

          {/* Security Notice Pill */}
          <SecurityNotice />

          {/* Real seeded demo accounts — every field below is a genuine
              Supabase Auth user with a real wallet balance, not a mock. */}
          <div className="w-full max-w-md mx-auto pt-4 border-t border-white/[0.08] space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300">Demo customer accounts</div>
            <div className="text-[11px] text-slate-400 font-mono leading-relaxed">
              amina.bello@test.ng · chukwudi.eze@test.ng<br />
              amadou.seydou@test.ne · fatima.oumarou@test.ne<br />
              Password: KorieCustomer@2026!
            </div>
          </div>
        </AuthCard>

        {/* Create Account Prompt */}
        <p className="text-center text-xs text-slate-400">
          Don&apos;t have a KoriePay account yet?{" "}
          <Link
            href="/register"
            className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold transition-colors ml-1"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
