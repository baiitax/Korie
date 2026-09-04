"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KorieLogo from "@/components/brand/KorieLogo";
import { ArrowLeft, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between w-full max-w-md mx-auto">
        <Link href="/" className="flex items-center">
          <KorieLogo variant="full" theme="dark" height={32} />
        </Link>
      </header>

      <main className="w-full max-w-md mx-auto my-auto py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            Reset Account Password
          </h1>
        </div>

        {isSubmitted ? (
          <div className="rounded-3xl bg-[#0b1324] border border-emerald-500/30 p-8 text-center space-y-4 shadow-2xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Reset Link Dispatched</h2>
            <p className="text-xs text-slate-300">
              We have sent a verification code to <strong>{emailOrPhone}</strong>.
            </p>
            <Link
              href="/otp"
              className="block w-full py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              Enter Verification Code
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 space-y-4 text-xs shadow-2xl"
          >
            <p className="text-slate-400">
              Enter your registered phone number or email address to receive an account recovery code.
            </p>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Registered Identifier</label>
              <input
                type="text"
                required
                placeholder="+234 phone or email"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              Send Reset Code
            </button>
          </form>
        )}
      </main>

      <footer className="text-center py-4 text-[11px] text-slate-500">
        KoriePay Banking Security Desk
      </footer>
    </div>
  );
}
