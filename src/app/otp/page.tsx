"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KorieLogo from "@/components/brand/KorieLogo";
import { ArrowLeft, ShieldCheck, CheckCircle2, RotateCw } from "lucide-react";

export default function OtpVerificationPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleOtpChange = (idx: number, val: string) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);

    // Auto-focus next
    if (val && idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      router.push("/customer");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between w-full max-w-md mx-auto">
        <Link href="/" className="flex items-center">
          <KorieLogo variant="full" theme="dark" height={32} />
        </Link>
      </header>

      <main className="w-full max-w-md mx-auto my-auto py-8 space-y-6 text-center">
        <div className="space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Verify Phone & Identity
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            We sent a 6-digit one-time passcode (OTP) to your phone.
          </p>
        </div>

        <form
          onSubmit={handleVerify}
          className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl"
        >
          {/* 6 Digit Inputs */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                className="w-11 h-14 rounded-2xl bg-slate-900 border border-white/10 text-center font-mono text-xl font-extrabold text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isVerifying || otp.some((d) => !d)}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
          >
            {isVerifying ? "Verifying Token..." : "Verify & Launch Portal"}
          </button>

          <button
            type="button"
            onClick={() => alert("New OTP code dispatched via SMS.")}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center justify-center gap-1.5 mx-auto"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Resend OTP Code</span>
          </button>
        </form>
      </main>

      <footer className="text-center py-4 text-[11px] text-slate-500">
        KoriePay Multi-Factor Authentication
      </footer>
    </div>
  );
}
