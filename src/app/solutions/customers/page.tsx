"use client";

import React from "react";
import Link from "next/link";
import { useCountry } from "@/components/ui/CountryContext";
import {
  Users,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Send,
  QrCode,
  Zap,
  Lock,
  Globe2,
  HeartHandshake,
  Wallet,
} from "lucide-react";
import CTASection from "@/components/sections/CTASection";

export default function CustomersPage() {
  const { openModal } = useCountry();

  const customerSteps = [
    {
      step: "01",
      title: "Open in 60 Seconds",
      desc: "Download the KoriePay app or dial USSD. Complete instant biometric verification with your National ID or BVN / NIN.",
    },
    {
      step: "02",
      title: "Fund Seamlessly",
      desc: "Deposit cash at any KoriePay neighborhood agent, receive interbank transfers from any bank, or link your card.",
    },
    {
      step: "03",
      title: "Transact & Transfer",
      desc: "Send money instantly to anyone in Nigeria (NGN) or Niger Republic (XOF CFA) with zero hidden fees and instant receipts.",
    },
    {
      step: "04",
      title: "Scan & Pay Merchants",
      desc: "Point your camera at any KoriePay merchant QR standee in markets and stores for contactless checkout in seconds.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-mono">
                <Users className="w-3.5 h-3.5" />
                <span>KUDINKA, HANNUNKA • YOUR MONEY, IN YOUR HANDS</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Your Financial Life,{" "}
                <span className="text-gradient-green">Seamlessly Connected</span>
              </h1>

              <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Experience next-generation African personal banking. Send funds instantly, settle household utilities, pay market merchants with QR codes, and move money across Nigeria and Niger Republic without hassle.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => openModal("contact", "Customer Account")}
                  className="px-6 py-3 rounded-xl btn-korie-primary text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
                >
                  <span>Get Started with KoriePay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  href="/faq"
                  className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-white/10 transition-colors"
                >
                  Customer FAQ
                </Link>
              </div>
            </div>

            {/* Mobile App Glass Preview Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm p-6 rounded-3xl bg-[#0d162a] border border-white/15 shadow-2xl space-y-4 relative">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">KoriePay Personal</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">🇳🇬 ⇄ 🇳🇪 Live</span>
                </div>

                {/* Balance display */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Available Balance</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">₦ 184,500.00</div>
                  <div className="text-xs font-mono text-amber-400 mt-0.5">≈ 75,276 CFA</div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-semibold text-slate-300">
                  <div className="p-2 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center gap-1 hover:border-emerald-500/40 cursor-pointer">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Send</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center gap-1 hover:border-amber-500/40 cursor-pointer">
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span>Scan QR</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center gap-1 hover:border-teal-500/40 cursor-pointer">
                    <Zap className="w-4 h-4 text-teal-400" />
                    <span>Pay Bills</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center gap-1 hover:border-purple-500/40 cursor-pointer">
                    <Globe2 className="w-4 h-4 text-purple-400" />
                    <span>Cross-Border</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400">
                  ⚡ Recent Transfer to Maradi Grain Hub: <strong className="text-emerald-400 font-mono">Delivered (2s)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Journey Steps */}
      <section className="py-20 bg-[#060a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Financial Freedom in Four Intuitive Steps
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Designed for simplicity, speed, and absolute peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {customerSteps.map((s, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 hover:border-teal-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-2xl font-extrabold font-mono text-emerald-400 mb-3 block">
                    {s.step}
                  </span>
                  <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
