"use client";

import React from "react";
import Link from "next/link";
import { useCountry } from "@/components/ui/CountryContext";
import {
  CreditCard,
  QrCode,
  Link2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  Zap,
  Store,
} from "lucide-react";
import CTASection from "@/components/sections/CTASection";

export default function MerchantPage() {
  const { openModal } = useCountry();

  const merchantTools = [
    {
      icon: <QrCode className="w-5 h-5 text-orange-400" />,
      title: "Dynamic & Static Counter QR Standees",
      desc: "Place branded KoriePay QR codes on your retail checkout counters. Customers scan with any banking app to pay instantly.",
    },
    {
      icon: <Link2 className="w-5 h-5 text-emerald-400" />,
      title: "Custom Shareable Payment Links",
      desc: "Create hosted payment links to share on WhatsApp, Instagram, or email. Collect payments with zero technical integration.",
    },
    {
      icon: <CreditCard className="w-5 h-5 text-amber-400" />,
      title: "Smart Android POS Terminals",
      desc: "Accept debit cards, contactless NFC, and transfer-to-account payments at your store with lightning-fast printed receipts.",
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-teal-400" />,
      title: "Next-Day & Same-Day Settlements",
      desc: "Enjoy automatic scheduled payouts into your bank account with complete transparency on MDR fees and interchange.",
    },
    {
      icon: <Store className="w-5 h-5 text-blue-400" />,
      title: "Multi-Store & Cashier Telemetry",
      desc: "Track sales across multiple retail branches and assign cashier accounts without exposing master business banking details.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
      title: "Automated Dispute Management",
      desc: "Instant chargeback notification and automated dispute resolution logs to safeguard merchant revenue.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono">
                <CreditCard className="w-3.5 h-3.5" />
                <span>MERCHANT PAYMENT ACCEPTANCE</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Accept Payments Anywhere,{" "}
                <span className="text-gradient-gold">Settle Everywhere</span>
              </h1>

              <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Whether you run a bustling supermarket in Kano, an e-commerce brand in Lagos, or a cross-border distribution warehouse in Maradi, KoriePay makes payment collection effortless.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => openModal("merchant")}
                  className="px-6 py-3 rounded-xl btn-korie-primary text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
                >
                  <span>Accept Payments Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  href="/solutions/payments"
                  className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-white/10 transition-colors"
                >
                  View Payment Corridors
                </Link>
              </div>
            </div>

            {/* Visual Flow diagram: Customer -> Payment -> KoriePay -> Merchant -> Settlement */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-[#0d162a] border border-white/15 shadow-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-mono uppercase text-orange-400 font-bold">
                    Merchant Settlement Flow
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">T+0 / T+1</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white">1. Customer</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-amber-400 font-mono">Card / QR / Transfer</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white">2. KoriePay Engine</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-emerald-400 font-mono">Instant Verification</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white">3. Merchant Portal</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-teal-400 font-mono">Real-Time Receipt</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white">4. Bank Settlement</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-emerald-400 font-mono">Automated Clearing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 bg-[#060a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Omnichannel Checkout Tools for Every Retailer
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Collect payments in person, online, or on social media with zero friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchantTools.map((tool, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 hover:border-orange-500/40 transition-all"
              >
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 w-fit mb-4">
                  {tool.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{tool.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
