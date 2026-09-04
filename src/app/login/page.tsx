"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import IdentifierInput from "@/components/auth/IdentifierInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SecurityNotice from "@/components/auth/SecurityNotice";
import AuthErrorAlert from "@/components/auth/AuthErrorAlert";
import RoleSwitcherDevBar from "@/components/auth/RoleSwitcherDevBar";
import { useAuth } from "@/components/auth/AuthContext";
import { KpayInlineLoader } from "@/components/loading";
import { ArrowRight, Fingerprint, Shield, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, biometricLogin, language, jurisdiction, activeRole } = useAuth();

  const [identifier, setIdentifier] = useState(
    jurisdiction === "NG" ? "+234 803 456 7890" : "+227 90 12 34 56"
  );
  const [password, setPassword] = useState("KoriePay@2026!");
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
        selectedRoleOverride: activeRole,
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

  const handleBiometric = async () => {
    setError(null);
    try {
      await biometricLogin(activeRole);
    } catch (err: any) {
      setError("Biometric challenge was not completed. Please use your account password.");
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
            {/* Intelligent Identifier Input */}
            <IdentifierInput
              value={identifier}
              onChange={(val) => {
                setIdentifier(val);
                if (error) setError(null);
              }}
              disabled={isLoading}
              required
            />

            {/* Password Field with Caps Lock Alert & Forgot Password Link */}
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

            {/* Remember Device Checkbox */}
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
                {jurisdiction === "NG" ? "Providus NG" : "Koris NE"}
              </span>
            </div>

            {/* Primary Sign In Button */}
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

            {/* Biometric / WebAuthn Option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleBiometric}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>Biometric / FaceID Login</span>
              </button>
            </div>
          </form>

          {/* Security Notice Pill */}
          <SecurityNotice />

          {/* Persona & Role Switcher for Developer Review & Audits */}
          <RoleSwitcherDevBar />
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
