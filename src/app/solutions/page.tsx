"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  Repeat2,
  Users,
  Briefcase,
  CreditCard,
  Globe2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import CTASection from "@/components/sections/CTASection";

export default function SolutionsPage() {
  const solutions = [
    {
      id: "agency-banking",
      title: "Agency Banking Infrastructure",
      subtitle: "Empowering the Last Mile of Financial Services",
      desc: "Comprehensive terminal hardware, mobile agent wallets, cash-in, cash-out, interbank transfers, bill payments, and real-time commission payouts for retail business owners.",
      href: "/solutions/agency-banking",
      badge: "Core Pillar 01",
      icon: <Building2 className="w-6 h-6 text-emerald-400" />,
      features: ["Hardware POS & Android App", "Instant Commission Ledger", "Cash-In / Cash-Out", "Float Overdraft Support"],
      color: "border-emerald-500/30 hover:border-emerald-500",
    },
    {
      id: "bdc-fx",
      title: "BDC & FX Digital Treasury",
      subtitle: "Digital Infrastructure for Modern FX Businesses",
      desc: "Purpose-built liquidity tools for licensed Bureau De Change operators. Manage real-time rate spreads, multi-currency customer accounts, and cross-border settlement corridors.",
      href: "/solutions/bdc-fx",
      badge: "Core Pillar 02",
      icon: <Repeat2 className="w-6 h-6 text-amber-400" />,
      features: ["Real-Time Rate Engine", "Bilateral Corridor Settlement", "Treasury Liquidity Dashboard", "AML Compliance Records"],
      color: "border-amber-500/30 hover:border-amber-500",
    },
    {
      id: "customers",
      title: "Customer Digital Wallet",
      subtitle: "Financial Services Built Around You",
      desc: "Everyday consumer banking reimagined. Instant domestic transfers, cross-border remittances, merchant QR checkout, and scheduled utility payments in English, Hausa, and French.",
      href: "/solutions/customers",
      badge: "Core Pillar 03",
      icon: <Users className="w-6 h-6 text-teal-400" />,
      features: ["Instant Bank Transfers", "Dynamic QR Scan-to-Pay", "Zero-Fee Utility Bills", "Biometric Authentication"],
      color: "border-teal-500/30 hover:border-teal-500",
    },
    {
      id: "business",
      title: "Business & Corporate Accounts",
      subtitle: "Scalable Financial Architecture for Enterprises",
      desc: "Multi-currency corporate treasury accounts, automated bulk payroll dispatches, multi-signatory approval workflows, and granular accounting sub-ledgers for growing businesses.",
      href: "/solutions/business",
      badge: "Enterprise Suite",
      icon: <Briefcase className="w-6 h-6 text-blue-400" />,
      features: ["Bulk Salary & Vendor Transfers", "Multi-Tier Signatory Approvals", "Multi-Branch Sub-Accounts", "Dedicated Relationship Desk"],
      color: "border-blue-500/30 hover:border-blue-500",
    },
    {
      id: "merchant",
      title: "Merchant Payment Acceptance",
      subtitle: "Omnichannel Checkout for Retailers & Online Commerce",
      desc: "Accept payments anywhere: dynamic on-counter QR displays, smart POS card terminals, one-click payment links for social commerce, and automated next-day bank settlements.",
      href: "/solutions/merchant",
      badge: "Merchant Hub",
      icon: <CreditCard className="w-6 h-6 text-orange-400" />,
      features: ["Dynamic Standee QR Codes", "Custom Hosted Payment Links", "Automated Daily Settlements", "Instant Payment Notification Webhooks"],
      color: "border-orange-500/30 hover:border-orange-500",
    },
    {
      id: "payments",
      title: "Cross-Border Settlement Rails",
      subtitle: "Bilateral Infrastructure for Nigeria ↔ Niger Republic",
      desc: "Eliminating the friction of cross-border commerce with sub-second clearing between Nigerian Naira (NGN) and West African CFA Franc (XOF CFA) across major trade routes.",
      href: "/solutions/payments",
      badge: "Corridor Rails",
      icon: <Globe2 className="w-6 h-6 text-emerald-400" />,
      features: ["Sub-3-Second Bilateral Clearing", "Direct NGN ⇄ XOF Liquidity", "Kano ↔ Maradi Trade Rail", "Bilateral Regulatory Compliance"],
      color: "border-emerald-500/30 hover:border-emerald-500",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Header */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-brand-mesh opacity-40 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
          <span className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block mb-3">
            Comprehensive Infrastructure Suite
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Financial Solutions Engineered for{" "}
            <span className="text-gradient-korie">Real-World African Scale</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            Discover how KoriePay coordinates physical agency networks, currency exchange desks, corporate treasuries, and everyday consumers on one unified platform.
          </p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-12 kp-band-brand-tint relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {solutions.map((sol) => (
              <div
                key={sol.id}
                className={`p-6 sm:p-8 rounded-3xl bg-[#0b1325] border shadow-xl flex flex-col justify-between transition-all duration-300 ${sol.color}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-slate-900 border border-white/5">
                      {sol.icon}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900 text-slate-300 border border-white/10">
                      {sol.badge}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white mb-1">{sol.title}</h2>
                  <h3 className="text-xs font-semibold text-emerald-400/90 mb-3">{sol.subtitle}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">{sol.desc}</p>

                  <div className="space-y-2 mb-8 pt-4 border-t border-white/5">
                    {sol.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={sol.href}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
                >
                  <span>Explore Solution Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
