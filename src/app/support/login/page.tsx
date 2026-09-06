"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { KpayInlineLoader } from "@/components/loading";
import { useLanguage } from "@/components/ui/LanguageContext";
import { useTheme } from "@/components/ui/ThemeContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { signInSupportOfficer, getSupportOfficerAccessToken } from "@/lib/support/officerSession";

/**
 * Support officer sign-in.
 *
 * Modeled on the customer /login page's visual language, but this is a
 * fully separate auth surface: it signs in against the SAME Supabase Auth
 * project via supabase.auth.signInWithPassword (never a mock), and the
 * resulting session is only ever treated as a support officer if the
 * signed-in auth user has a matching row in public.support_officers — the
 * server enforces that on every /api/support/* call, not this page.
 */
export default function SupportLoginPage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    en: {
      badge: "Support Operations",
      title: "Support sign-in",
      subtitle: "Sign in with your KoriePay support officer credentials.",
      email: "Work email",
      password: "Password",
      submit: "Sign in",
      submitting: "Signing you in…",
      notFound: "No support officer profile is associated with this account.",
      generic: "We couldn't sign you in with those details. Please check your email and password and try again.",
      network: "A network or authentication service error occurred. Please try again.",
      backToPortal: "Back to KoriePay",
    },
    fr: {
      badge: "Opérations Support",
      title: "Connexion Support",
      subtitle: "Connectez-vous avec vos identifiants d'agent support KoriePay.",
      email: "E-mail professionnel",
      password: "Mot de passe",
      submit: "Se connecter",
      submitting: "Connexion en cours…",
      notFound: "Aucun profil d'agent support n'est associé à ce compte.",
      generic: "Impossible de vous connecter avec ces informations. Vérifiez votre e-mail et votre mot de passe.",
      network: "Une erreur réseau ou d'authentification s'est produite. Veuillez réessayer.",
      backToPortal: "Retour à KoriePay",
    },
    ha: {
      badge: "Ayyukan Tallafi",
      title: "Shiga na Tallafi",
      subtitle: "Shiga da bayanan asusun jami'in tallafi na KoriePay.",
      email: "Imel na aiki",
      password: "Kalmar sirri",
      submit: "Shiga",
      submitting: "Ana shigar da kai...",
      notFound: "Babu bayanin jami'in tallafi da aka danganta da wannan asusun.",
      generic: "Ba za mu iya shigar da kai da waɗannan bayanan ba. Duba imel da kalmar sirri sannan a sake gwadawa.",
      network: "An sami kuskuren hanyar sadarwa ko tantancewa. Da fatan za a sake gwadawa.",
      backToPortal: "Koma zuwa KoriePay",
    },
  } as const;

  const c = copy[language as "en" | "fr" | "ha"] ?? copy.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInSupportOfficer(email.trim(), password);
      if (!result.ok) {
        setError(result.message || c.generic);
        setIsLoading(false);
        return;
      }

      // Confirm the signed-in account actually has a support_officers row
      // before routing into the shell — otherwise a real customer/agent
      // account could sign in here and get an empty, broken portal.
      const token = await getSupportOfficerAccessToken();
      const res = await fetch("/api/support/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || body.status === "error") {
        setError(body?.error?.message || c.notFound);
        setIsLoading(false);
        return;
      }

      router.push("/support");
    } catch {
      setError(c.network);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between p-4 sm:p-6 lg:p-10 antialiased relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none transform-gpu" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[500px] bg-teal-600/10 rounded-full blur-[160px] pointer-events-none transform-gpu" />
      </div>

      <header className="flex items-center justify-between w-full max-w-5xl mx-auto relative z-10 py-2">
        <Link href="/" className="flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.01]" aria-label="KoriePay Home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#0b7a63] to-[#158987] text-white shadow-sm">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <span className="text-sm font-extrabold tracking-tight text-[var(--foreground)]">KoriePay Support</span>
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-4">
          <ThemeToggle className="hidden sm:flex items-center justify-center p-2 bg-white/[0.04] border border-white/10 text-slate-300" />
          <div className="flex items-center bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-1 text-xs font-mono font-bold">
            {(["en", "ha", "fr"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  language === l ? "bg-emerald-500 text-slate-950 font-extrabold" : "text-slate-400 hover:text-white"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto my-auto py-6 sm:py-8 relative z-10 flex flex-col items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold tracking-wide uppercase mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{c.badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight leading-tight">{c.title}</h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed max-w-md">{c.subtitle}</p>
          </div>

          <div className="w-full max-w-md rounded-3xl glass-modal p-6 sm:p-8 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

            {error && (
              <div role="alert" className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="support-email" className="mb-1.5 block text-xs font-bold text-[var(--muted)]">
                  {c.email}
                </label>
                <input
                  id="support-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  placeholder="zainab.support@koriepay.internal"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-slate-500 focus:border-emerald-500/40"
                />
              </div>

              <div>
                <label htmlFor="support-password" className="mb-1.5 block text-xs font-bold text-[var(--muted)]">
                  {c.password}
                </label>
                <div className="relative">
                  <input
                    id="support-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={isLoading}
                    placeholder="••••••••••••"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-16 text-sm text-[var(--foreground)] outline-none placeholder:text-slate-500 focus:border-emerald-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-60 flex items-center justify-center gap-2 group transform active:scale-[0.99]"
              >
                {isLoading && <KpayInlineLoader size="sm" className="border-slate-950 border-t-slate-950" />}
                <span>{isLoading ? c.submitting : c.submit}</span>
                {!isLoading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
              </button>
            </form>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3.5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Internal officers only</span>
              <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>TLS 1.3 Active</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold transition-colors">
              {c.backToPortal}
            </Link>
          </p>
        </div>
      </main>

      <footer className="w-full max-w-5xl mx-auto pt-6 pb-2 relative z-10 text-center text-xs text-slate-400 border-t border-white/[0.06]">
        End-to-end 256-bit encrypted banking session
      </footer>
    </div>
  );
}
