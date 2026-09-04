"use client";

import React from "react";
import Link from "next/link";
import { useCountry } from "@/components/ui/CountryContext";
import {
  Briefcase,
  Layers,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Code2,
  Clock,
  DollarSign,
} from "lucide-react";
import CTASection from "@/components/sections/CTASection";

export default function BusinessPage() {
  const { openModal } = useCountry();

  const businessPillars = [
    {
      icon: <FileSpreadsheet className="w-5 h-5 text-blue-400" />,
      title: "Automated Bulk Payroll & Vendor Dispatches",
      desc: "Disburse salaries and supplier payments across multiple banks in Nigeria and Niger Republic with one-click CSV uploads and dual-signatory approvals.",
    },
    {
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
      title: "Multi-Entity & Multi-Branch Accounts",
      desc: "Manage multiple retail branches, cashier sub-accounts, and regional departments from a single consolidated corporate master dashboard.",
    },
    {
      icon: <Code2 className="w-5 h-5 text-teal-400" />,
      title: "Institutional REST APIs & Webhooks",
      desc: "Connect your existing ERP, accounting software, or custom mobile application directly to KoriePay's high-throughput payment rails.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
      title: "Granular Role-Based Access Control",
      desc: "Assign custom roles for Initiators, Approvers, Auditors, and Accountants with strict multi-factor authentication and tamper-evident audit logs.",
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
      title: "Automated Reconciliation & Statement Exports",
      desc: "Eliminate manual bookkeeping with real-time transaction tagging, automated fee split breakdowns, and direct QuickBooks / Xero exports.",
    },
    {
      icon: <Clock className="w-5 h-5 text-orange-400" />,
      title: "Dedicated Corporate Account Desk",
      desc: "Priority 24/7 account management, custom liquidity arrangements, and dedicated technical integration support.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
                <Briefcase className="w-3.5 h-3.5" />
                <span>CORPORATE & ENTERPRISE TREASURY</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Scalable Financial Architecture for{" "}
                <span className="text-gradient-korie">Modern African Business</span>
              </h1>

              <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Power your enterprise with multi-currency accounts, automated bulk payroll, corporate payment acceptance, and high-availability developer APIs engineered for 99.98% reliability.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => openModal("business")}
                  className="px-6 py-3 rounded-xl btn-korie-primary text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
                >
                  <span>Build With KoriePay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  href="/developers"
                  className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-white/10 transition-colors"
                >
                  Developer Documentation
                </Link>
              </div>
            </div>

            {/* Visual Corporate Snapshot Card */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-[#0d162a] border border-white/15 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-mono uppercase text-blue-400 font-bold">
                    Enterprise Treasury Console
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Multi-User Ready</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Entity:</span>
                    <span className="text-white font-mono font-bold">Sahel Logistics Corp</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Monthly Bulk Transfers:</span>
                    <span className="text-emerald-400 font-mono font-bold">₦ 450,000,000.00</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Disbursement Status:</span>
                    <span className="text-amber-400 font-mono font-bold">100% Completed</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Multi-Bank NIP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>WAEMU CFA Rails</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>ERP Webhooks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>NDPR Compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 bg-[#060a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Enterprise Control, Precision & Speed
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Built to withstand the high-velocity demands of scaled African businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businessPillars.map((p, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 hover:border-blue-500/40 transition-all"
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

      <CTASection />
    </main>
  );
}
