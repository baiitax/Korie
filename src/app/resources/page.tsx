"use client";

import React from "react";
import {
  BookOpen,
  Download,
} from "lucide-react";
import CTASection from "@/components/sections/CTASection";

export default function ResourcesPage() {
  const reports = [
    {
      title: "The Sahel Trade Corridor Report: Nigeria ↔ Niger Republic",
      type: "Whitepaper",
      size: "2.4 MB PDF",
      desc: "An in-depth economic analysis of bilateral informal and formal trade flows between Northern Nigeria and Niger Republic, examining the role of digital liquidity in trade acceleration.",
    },
    {
      title: "Agency Banking Economics: Last-Mile Profitability & Float Management",
      type: "Guide",
      size: "1.8 MB PDF",
      desc: "Best practices for retail agents, liquidity management, security precautions, and maximizing monthly return on investment with KoriePay POS terminals.",
    },
    {
      title: "Digital Treasury Transformation for Bureau De Change Operators",
      type: "Briefing",
      size: "1.2 MB PDF",
      desc: "How modern FX operators are replacing high-risk cash logistics with compliant digital settlement networks.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-mono mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>KNOWLEDGE BASE & ASSETS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Resources, Insights &{" "}
            <span className="text-gradient-green">Brand Assets</span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
            Access institutional research on cross-border commerce, developer guides, and official brand assets for media and integration partners.
          </p>
        </div>
      </section>

      {/* Reports Grid */}
      <section className="py-16 kp-band-brand-tint relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Institutional Reports & Whitepapers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reports.map((r, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl glass-02 border border-[var(--border-strong)] hover:border-teal-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {r.type}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{r.size}</span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">{r.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">{r.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    alert("Report download is scheduled for release with our upcoming quarterly briefing.");
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Briefing</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Assets Download Card */}
      <section className="py-16 kp-band-cool relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-[#0d162a] border border-white/15 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                Official Brand Kit
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Download Official KoriePay Logos & Guidelines
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg">
                Includes high-resolution vector SVGs, PNGs (dark/white variants), icon monograms, and brand color tokens.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/brand/koriepay-logo-full.png"
                download="koriepay-logo.png"
                className="px-5 py-3 rounded-xl btn-korie-primary text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download Assets</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
