"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KorieLogo from "@/components/brand/KorieLogo";
import {
  ArrowRight,
  ShieldCheck,
  Building2,
  Phone,
  User,
  Lock,
  Mail,
  CheckCircle2,
} from "lucide-react";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [country, setCountry] = useState<"NG" | "NE">("NG");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/otp");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 antialiased relative">
      <header className="flex items-center justify-between w-full max-w-md mx-auto relative z-10">
        <Link href="/" className="flex items-center">
          <KorieLogo variant="full" theme="dark" height={32} />
        </Link>
      </header>

      <main className="w-full max-w-md mx-auto my-auto py-8 relative z-10 space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Open Digital Bank Account
          </h1>
          <p className="text-xs text-slate-400">
            Instant multi-currency wallet with dedicated Providus & Koris Bank account numbers.
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="rounded-3xl bg-[#0b1324]/80 border border-white/10 p-6 sm:p-7 space-y-4 backdrop-blur-xl shadow-2xl text-xs"
        >
          {/* Country Jurisdiction */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Country of Residence</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCountry("NG")}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                  country === "NG"
                    ? "bg-emerald-500/15 border-emerald-500 text-white font-bold"
                    : "bg-white/[0.02] border-white/5 text-slate-400"
                }`}
              >
                <span className="text-lg">🇳🇬</span>
                <div>
                  <div>Nigeria</div>
                  <div className="text-[10px] text-slate-500 font-mono">NGN Naira</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCountry("NE")}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                  country === "NE"
                    ? "bg-emerald-500/15 border-emerald-500 text-white font-bold"
                    : "bg-white/[0.02] border-white/5 text-slate-400"
                }`}
              >
                <span className="text-lg">🇳🇪</span>
                <div>
                  <div>Niger Republic</div>
                  <div className="text-[10px] text-slate-500 font-mono">XOF CFA</div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Full Legal Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Ibrahim Dan-Batta"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Phone Number</label>
            <input
              type="tel"
              required
              placeholder={country === "NG" ? "+234 803 123 4567" : "+227 90 12 34 56"}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Create Password</label>
            <input
              type="password"
              required
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-400">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded bg-slate-900 border-white/10 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="terms">
              I agree to KoriePay&apos;s Terms of Banking, Privacy Policy, and Anti-Money Laundering regulations.
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !agreeTerms}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <span>{isLoading ? "Creating Account..." : "Continue to Verification"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline font-bold">
            Sign In
          </Link>
        </p>
      </main>

      <footer className="text-center py-4 text-[11px] text-slate-500">
        Supervised and compliant under CBN & BCEAO regulatory frameworks.
      </footer>
    </div>
  );
}
