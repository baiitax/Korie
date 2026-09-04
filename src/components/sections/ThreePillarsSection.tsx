"use client";

import React from "react";
import Link from "next/link";
import { useCountry } from "../ui/CountryContext";
import {
  Building2,
  Repeat2,
  Users,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Shield,
  Smartphone,
  Wallet,
  Zap,
} from "lucide-react";

export const ThreePillarsSection: React.FC = () => {
  const { openModal } = useCountry();

  const pillars = [
    {
      num: "01",
      badge: "Last-Mile Distribution",
      title: "Agency Banking",
      subtitle: "Empowering the Last Mile of Financial Services",
      desc: "KoriePay provides the robust technology and terminal hardware enabling local agents to deliver vital financial services directly to neighbourhood communities.",
      icon: <Building2 className="w-6 h-6 text-emerald-400" />,
      colorClass: "hover:border-emerald-500/50 hover:shadow-emerald-500/10",
      accentBadge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      gradientBar: "from-emerald-500 to-teal-400",
      capabilities: [
        "Cash In & Instant Cash Out",
        "Interbank Transfers (NIP & WAEMU)",
        "Utility & Airtime Bill Payments",
        "Agent Float & Liquidity Tracking",
        "Transparent Commission Payouts",
        "Android & Linux Smart POS Support",
      ],
      ctaText: "Become a KoriePay Agent",
      action: () => openModal("agent"),
      learnHref: "/solutions/agency-banking",
    },
    {
      num: "02",
      badge: "Institutional FX Rails",
      title: "BDC & FX Digital",
      subtitle: "Digital Infrastructure for Modern FX Businesses",
      desc: "Comprehensive technology engineered to help Bureau De Change operators manage liquidity, rate transparency, multi-currency customer records, and cross-border settlements.",
      icon: <Repeat2 className="w-6 h-6 text-amber-400" />,
      colorClass: "hover:border-amber-500/50 hover:shadow-amber-500/10",
      accentBadge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      gradientBar: "from-amber-500 to-orange-400",
      capabilities: [
        "Real-Time FX Rates Engine",
        "Treasury Liquidity Visibility",
        "Customer Transaction Ledgers",
        "Bilateral Cross-Border Settlement",
        "Regulatory AML Compliance Tools",
        "Multi-Currency Virtual Accounts",
      ],
      ctaText: "Explore BDC Solutions",
      action: () => openModal("bdc"),
      learnHref: "/solutions/bdc-fx",
    },
    {
      num: "03",
      badge: "Everyday Finance",
      title: "Customer Wallets",
      subtitle: "Financial Services Built Around You",
      desc: "An accessible, intelligent consumer wallet built for everyday African life. Transfer funds in seconds, pay merchants with QR codes, and maintain full visibility over your personal wealth.",
      icon: <Users className="w-6 h-6 text-teal-400" />,
      colorClass: "hover:border-teal-500/50 hover:shadow-teal-500/10",
      accentBadge: "bg-teal-500/10 text-teal-400 border-teal-500/20",
      gradientBar: "from-teal-500 to-emerald-400",
      capabilities: [
        "Zero-Delay Bank Transfers",
        "Dynamic Merchant QR Checkout",
        "Scheduled Recurring Bill Pay",
        "Biometric Security & Fast PIN",
        "Hausa & French Language Support",
        "Real-Time Spending Analytics",
      ],
      ctaText: "Get Started as Customer",
      action: () => openModal("contact", "Customer Onboarding"),
      learnHref: "/solutions/customers",
    },
  ];

  return (
    <section className="py-20 lg:py-28 relative bg-[#070c18] overflow-hidden">
      {/* Background glow lines */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-white/10 text-xs font-mono text-emerald-400 mb-3">
            <span>THE 3 FOUNDATIONAL PILLARS</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Built Around the People & Businesses <br className="hidden sm:inline" />
            <span className="text-gradient-korie">That Power African Financial Access</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            Our three core pillars work in unison to form a seamless financial continuum — bridging the last mile, foreign exchange markets, and individual consumers.
          </p>
        </div>

        {/* 3 Pillar Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pillars.map((p) => (
            <div
              key={p.num}
              className={`p-6 sm:p-8 rounded-3xl bg-[#0b1325] border border-white/10 shadow-xl flex flex-col justify-between transition-all duration-300 relative group ${p.colorClass}`}
            >
              {/* Top Accent Gradient Bar */}
              <div
                className={`absolute top-0 left-8 right-8 h-1 bg-gradient-to-r ${p.gradientBar} rounded-b-full opacity-60 group-hover:opacity-100 transition-opacity`}
              />

              <div>
                {/* Header Icon and Pillar Number */}
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-white/10 group-hover:scale-105 transition-transform">
                    {p.icon}
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-700 group-hover:text-slate-500 transition-colors">
                    {p.num}
                  </span>
                </div>

                {/* Badge */}
                <div className="mb-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${p.accentBadge}`}
                  >
                    {p.badge}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{p.title}</h3>
                <h4 className="text-xs font-semibold text-slate-300 mb-3">{p.subtitle}</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">{p.desc}</p>

                {/* Capabilities List */}
                <div className="space-y-2 mb-8 pt-4 border-t border-white/5">
                  <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">
                    Verified Capabilities:
                  </div>
                  {p.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={p.action}
                  className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl btn-korie-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] transition-transform"
                >
                  <span>{p.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <Link
                  href={p.learnHref}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold text-center border border-white/5 transition-colors"
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ThreePillarsSection;
