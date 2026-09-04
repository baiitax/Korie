"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KorieLogo from "@/components/brand/KorieLogo";
import {
  Eye,
  EyeOff,
  Lock,
  Phone,
  Mail,
  Fingerprint,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Globe,
} from "lucide-react";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("+234 803 456 7890");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<"en" | "ha" | "fr">("en");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Realistic authentication flow
    setTimeout(() => {
      setIsLoading(false);
      router.push("/customer");
    }, 600);
  };

  const handleBiometricLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/customer");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 antialiased relative selection:bg-emerald-500 selection:text-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Brand & Language Switcher */}
      <header className="flex items-center justify-between w-full max-w-md mx-auto relative z-10">
        <Link href="/" className="flex items-center">
          <KorieLogo variant="full" theme="dark" height={32} />
        </Link>

        {/* 1-Tap Language Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => setSelectedLang("en")}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              selectedLang === "en" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setSelectedLang("ha")}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              selectedLang === "ha" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
            }`}
          >
            HA
          </button>
          <button
            type="button"
            onClick={() => setSelectedLang("fr")}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              selectedLang === "fr" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
            }`}
          >
            FR
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto my-auto py-8 relative z-10 space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {selectedLang === "ha"
              ? "Barka da dawowa"
              : selectedLang === "fr"
              ? "Bienvenue de retour"
              : "Welcome back"}
          </h1>
          <p className="text-xs text-slate-400">
            {selectedLang === "ha"
              ? "Shigar da bayanan asusunka na KoriePay don ci gaba."
              : selectedLang === "fr"
              ? "Connectez-vous à votre compte bancaire sécurisé KoriePay."
              : "Sign in to access your multi-currency digital banking portal."}
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-3xl bg-[#0b1324]/80 border border-white/10 p-6 sm:p-7 space-y-4 backdrop-blur-xl shadow-2xl"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Identifier Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {selectedLang === "ha"
                ? "Lambar Waya ko Imel"
                : selectedLang === "fr"
                ? "Téléphone ou Email"
                : "Phone Number or Email"}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+234 / +227 phone or email"
                className="w-full pl-4 pr-4 py-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-medium text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300">
                {selectedLang === "ha"
                  ? "Kalmar Sirri"
                  : selectedLang === "fr"
                  ? "Mot de passe"
                  : "Password"}
              </label>
              <Link
                href="/forgot-password"
                className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px]"
              >
                {selectedLang === "ha"
                  ? "Ka manta kalmar sirri?"
                  : selectedLang === "fr"
                  ? "Mot de passe oublié ?"
                  : "Forgot password?"}
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-medium text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <span>{isLoading ? "Authenticating..." : selectedLang === "ha" ? "Shiga Asusu" : selectedLang === "fr" ? "Se Connecter" : "Sign In"}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>

          {/* Biometric Quick Login */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleBiometricLogin}
              className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Fingerprint className="w-5 h-5 text-emerald-400" />
              <span>Biometric / FaceID Login</span>
            </button>
          </div>
        </form>

        {/* Register Prompt */}
        <p className="text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-emerald-400 hover:underline font-bold">
            Create KoriePay Account
          </Link>
        </p>
      </main>

      {/* Footer Security Stamp */}
      <footer className="text-center py-4 relative z-10 text-[11px] text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>End-to-end 256-bit encrypted banking session</span>
      </footer>
    </div>
  );
}
