"use client";

import React, { useEffect, useState } from "react";
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
import {
  ArrowRight,
  Fingerprint,
  KeyRound,
  Copy,
  Check,
  Store,
} from "lucide-react";
import {
  DEMO_CREDENTIALS,
  DEMO_PASSWORD,
  DemoCredentialRow,
} from "@/lib/auth/authService";

export default function LoginPage() {
  const router = useRouter();
  const { login, biometricLogin, language, jurisdiction, activeRole } = useAuth();

  const [identifier, setIdentifier] = useState(
    jurisdiction === "NG" ? "+234 803 456 7890" : "+227 90 12 34 56"
  );
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCred, setCopiedCred] = useState(false);

  // Persona-aware identifier: switching the role chip prepares the matching
  // demo identifier so the form path uses the role's own credentials.
  useEffect(() => {
    if (activeRole === "CUSTOMER") return; // keep the jurisdiction default
    const row = DEMO_CREDENTIALS.find((r) => r.role === activeRole);
    if (row) setIdentifier(row.identifier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole]);

  const activeRow: DemoCredentialRow | undefined = DEMO_CREDENTIALS.find(
    (r) => r.role === activeRole
  );

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(`${activeRow?.identifier ?? ""}  ${DEMO_PASSWORD}`);
      setCopiedCred(true);
      window.setTimeout(() => setCopiedCred(false), 1800);
    } catch {
      setCopiedCred(false);
    }
  };

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

  const isAgent = activeRole === "AGENT";

  return (
    <AuthShell>
      <div className="w-full max-w-md space-y-6">
        <AuthHeader
          titleEn={isAgent ? "Agent terminal sign-in" : "Welcome back"}
          titleHa={isAgent ? "Shigar da tashar wakili" : "Barka da dawowa"}
          titleFr={isAgent ? "Connexion au terminal agent" : "Bienvenue de retour"}
          subtitleEn={
            isAgent
              ? "Sign in to operate your registered agency banking terminal — cash services, accounts, bills, cards and FX."
              : "Sign in securely to your KoriePay digital banking and settlement account."
          }
          subtitleHa={
            isAgent
              ? "Shiga don sarrafa tashar bankin wakili — ayyukan tsabar kudi, asusu, da sauransu."
              : "Shigar da bayanan asusunka na KoriePay don ci gaba da sarrafa kudade."
          }
          subtitleFr={
            isAgent
              ? "Connectez-vous pour opérer votre terminal d'agence bancaire."
              : "Connectez-vous à votre compte bancaire et passerelle de règlement KoriePay."
          }
          badge={isAgent ? "Agency Banking Terminal" : "Institutional Gateway"}
        />

        {isAgent ? (
          <div className="w-full rounded-2xl border border-teal-400/20 bg-teal-500/[0.06] p-3.5">
            <div className="flex items-start gap-2.5">
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
              <p className="text-[11px] leading-relaxed text-slate-300">
                <span className="font-bold text-teal-200">Garba Express Services &amp; POS</span>
                {" · "}AGT-NG-0092 · TID-NG-009182 (Abuja). This persona maps to the registered
                agency profile <span className="font-mono text-teal-300">agt-ng-001</span> that
                every agent operation executes under — the portal never operates as a customer.
              </p>
            </div>
          </div>
        ) : null}

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
                {jurisdiction === "NG" ? "Providus NG" : "Coris NE"}
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

          {/* Demo credentials for the active role — password is verified for real */}
          {activeRow ? (
            <div className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.04] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200">
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Demo credentials · {activeRow.role}
                </p>
                <button
                  type="button"
                  onClick={() => void copyCredentials()}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.08] transition-colors"
                >
                  {copiedCred ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedCred ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Identifier</span>
                  <span className="truncate font-semibold text-slate-200">{activeRow.identifier}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Password</span>
                  <span className="font-semibold text-slate-200">{DEMO_PASSWORD}</span>
                </p>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Signs in as <span className="font-semibold text-slate-300">{activeRow.fullName}</span> —{" "}
                {activeRow.note}. Passwords are verified; 5 wrong attempts lock the identifier for 15
                minutes. Sandbox credential — never a production secret.
              </p>
            </div>
          ) : null}

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
