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
import { getComplianceQuickAccess } from "@/lib/complianceQuickAccess";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login, language, jurisdiction } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seeded demonstration officer for the compliance portal. One click signs
  // in and routes to /compliance; the portal re-verifies the session and the
  // COMPLIANCE_OFFICER role server-side on every request.
  const quick = getComplianceQuickAccess();

  const runLogin = async (email: string, pass: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await login({
        identifier: email,
        password: pass,
        rememberDevice,
        country: jurisdiction,
      });

      if (!result.success) {
        setError(
          result.errorMessage ||
            "We couldn't sign you in with those details. Please check your information and try again.",
        );
      }
    } catch (err: any) {
      setError("A network or authentication service error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runLogin(identifier, password);
  };

  // Automated compliance sign-in: fill the visible form with the seeded
  // officer's credentials and submit, so the operator sees exactly which
  // account the automation used before the redirect happens.
  const quickSignIn = async () => {
    if (!quick || isLoading) return;
    setIdentifier(quick.email);
    setPassword(quick.password);
    await runLogin(quick.email, quick.password);
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
          subtitleEn="One sign-in for your Wallet, Agency Banking, Business, or staff dashboard — we'll route you to the right one."
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

          {/* Automated compliance officer sign-in — the one-click path the
              portal owner asked for. Fills the form above with the seeded
              officer's credentials and submits; the routing layer sends the
              session to /compliance. */}
          {quick && (
            <div className="mt-4 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={quickSignIn}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 font-bold text-xs tracking-wide transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <KpayInlineLoader size="sm" className="border-emerald-400 border-t-emerald-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>
                  {isLoading
                    ? "Signing in as the compliance officer…"
                    : `Automatic sign-in — Compliance officer (${quick.label})`}
                </span>
              </button>
              <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">
                {quick.note} Signs in with <span className="font-mono">{quick.email}</span> and routes to the compliance
                portal.
              </p>
            </div>
          )}

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
            <div className="text-[11px] font-semibold text-slate-300 pt-2">Demo agent account</div>
            <div className="text-[11px] text-slate-400 font-mono leading-relaxed">
              garba.kano@korieagent.com<br />
              Password: KorieAgent@2026!
            </div>
            <div className="text-[11px] font-semibold text-slate-300 pt-2">Demo business account</div>
            <div className="text-[11px] text-slate-400 font-mono leading-relaxed">
              amaka.owner@koriemerchant.com<br />
              Password: KorieMerchant@2026!
            </div>
            <div className="text-[11px] font-semibold text-slate-300 pt-2">Compliance officer (staff)</div>
            <div className="text-[11px] text-slate-400 font-mono leading-relaxed">
              {quick ? (
                <>
                  {quick.email}
                  <br />
                  Password: {quick.password}
                </>
              ) : (
                <>Configured via NEXT_PUBLIC_COMPLIANCE_QUICK_EMAIL / _PASSWORD</>
              )}
            </div>
            <div className="text-[11px] font-semibold text-slate-300 pt-2">Support officer (staff)</div>
            <div className="text-[11px] text-slate-400 font-mono leading-relaxed">
              zainab.support@koriepay.internal<br />
              Password: KorieSupport@2026!
            </div>
            <div className="text-[11px] font-semibold text-slate-300 pt-2">Command center admin (staff)</div>
            <div className="text-[11px] text-slate-400 font-mono leading-relaxed">
              admin@koriepay.internal<br />
              Password: KorieAdmin@2026!
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
