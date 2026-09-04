"use client";

import React from "react";
import {
  Layers,
  Cpu,
  Zap,
  RefreshCw,
  Database,
  Cloud,
  ShieldCheck,
} from "lucide-react";
import DevCodePreview from "@/components/sections/DevCodePreview";
import CTASection from "@/components/sections/CTASection";

export default function TechnologyPage() {
  const techPillars = [
    {
      icon: <Zap className="w-5 h-5 text-emerald-400" />,
      title: "Sub-Second Transaction Engine",
      desc: "Event-driven asynchronous microservices engineered to process thousands of transactions per second with sub-650ms end-to-end clearing latency.",
    },
    {
      icon: <Database className="w-5 h-5 text-teal-400" />,
      title: "Immutable Double-Entry Ledger",
      desc: "Cryptographically verified double-entry accounting engine ensuring complete consistency across agency float, BDC balances, and bank settlements.",
    },
    {
      icon: <Cloud className="w-5 h-5 text-amber-400" />,
      title: "Multi-Region Cloud Architecture",
      desc: "Distributed server deployments with automated failover routing, active-active data replication, and strict 99.98% core availability SLAs.",
    },
    {
      icon: <RefreshCw className="w-5 h-5 text-blue-400" />,
      title: "Real-Time Webhook Engine",
      desc: "Guaranteed at-least-once delivery with exponential backoff retries and cryptographic payload signing for all merchant and partner integration events.",
    },
    {
      icon: <Cpu className="w-5 h-5 text-purple-400" />,
      title: "Modular POS & Terminal OS",
      desc: "Lightweight, secure embedded terminal software compatible with Android, Linux, and traditional POS devices with offline SMS fallback capability.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      title: "Heuristic Fraud & Telemetry",
      desc: "Real-time behavioural analytics detecting abnormal transaction velocity, geographic anomalies across the border, and duplicate authorizations.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-mono mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>INFRASTRUCTURE ARCHITECTURE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Financial Infrastructure{" "}
            <span className="text-gradient-green">Engineered for Scale</span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
            Built from the ground up for high-throughput, cross-border reliability. KoriePay combines modern distributed systems design with robust financial engineering.
          </p>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="py-16 kp-band-brand-tint relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techPillars.map((p, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl glass-02 border border-[var(--border-strong)] hover:border-teal-500/40 transition-all"
              >
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 w-fit mb-4">
                  {p.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Code explorer */}
      <DevCodePreview />

      <CTASection />
    </main>
  );
}
