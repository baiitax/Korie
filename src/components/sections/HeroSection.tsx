"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCountry } from "../ui/CountryContext";
import {
  ArrowRight,
  ShieldCheck,
  Building2,
  Repeat2,
  Users,
  Briefcase,
  CheckCircle2,
  Globe2,
  TrendingUp,
  Zap,
} from "lucide-react";
import KpayImageCard from "@/components/ui/KpayImageCard";

export const HeroSection: React.FC = () => {
  const { openModal, country } = useCountry();
  const [activeSegment, setActiveSegment] = useState<"agents" | "bdc" | "customers" | "business">("agents");

  const segmentContent = {
    agents: {
      badge: "Last-Mile Financial Infrastructure",
      title: "Empowering Over 50,000+ Physical Service Points",
      desc: "Transform your store or kiosk into a fully enabled banking agency point. Provide cash-in, cash-out, interbank transfers, and utility payments with reliable terminal hardware and instant commissions.",
      cta: "Become a KoriePay Agent",
      action: () => openModal("agent"),
      metric: "Instant Commission Settlement",
    },
    bdc: {
      badge: "Digital FX & Treasury Rails",
      title: "Modern Liquidity for Licensed FX Operators",
      desc: "Connect your Bureau De Change directly to institutional cross-border liquidity. Manage customer transactions, rate transparency, multi-currency balances, and automated settlement between Nigeria and Niger.",
      cta: "Partner as BDC Operator",
      action: () => openModal("bdc"),
      metric: "Sub-Second FX Corridor Routing",
    },
    customers: {
      badge: "Consumer Financial Freedom",
      title: "Your Money, Connected Across Borders",
      desc: "Experience instant transfers, frictionless bill payments, dynamic merchant QR checkout, and cross-border remittances. As our Hausa slogan says: Kudinka, Hannunka — Your money, in your hands.",
      cta: "Open an Account",
      action: () => openModal("contact", "Customer Wallet"),
      metric: "Zero Latency Domestic & Regional Rails",
    },
    business: {
      badge: "Enterprise & SME Treasury",
      title: "High-Throughput Payments for Scaled Commerce",
      desc: "Empower your enterprise with multi-currency accounts, automated bulk payroll, merchant payment links, and institutional developer APIs engineered for 99.98% reliability.",
      cta: "Build With KoriePay",
      action: () => openModal("business"),
      metric: "Enterprise SLA & Dedicated Desk",
    },
  };

  const activeData = segmentContent[activeSegment];

  return (
    <section className="relative pt-32 pb-20 lg:pt-36 lg:pb-28 overflow-hidden kp-band-brand-whisper bg-grid-subtle">
      {/* Quiet brand atmosphere — never a colour block */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[520px] kp-gradient-brand-soft rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Corridor Pill Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-01 text-xs font-medium text-[var(--foreground)] shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[var(--brand-primary)] font-bold font-mono">🇳🇬 NIGERIA</span>
            <span className="text-[var(--muted)]">↔</span>
            <span className="text-[var(--brand-secondary)] font-bold font-mono">🇳🇪 NIGER REPUBLIC</span>
            <span className="text-[var(--border-strong)] hidden sm:inline">•</span>
            <span className="text-[var(--muted)] hidden sm:inline text-[11px]">
              One Unified Financial Infrastructure
            </span>
          </div>
        </div>

        {/* Main Headline (LEFT) */}
        <div className="max-w-3xl mx-auto lg:mx-0 text-center lg:text-left mb-8">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--foreground)] leading-[1.1]">
            Powering the Financial Ecosystem Across{" "}
            <span className="text-gradient-korie">Nigeria &amp; Niger Republic</span>
          </h1>
          <p className="mt-5 text-sm sm:text-lg text-[var(--foreground-muted)] leading-relaxed max-w-2xl mx-auto lg:mx-0">
            KoriePay connects{" "}
            <strong className="text-[var(--foreground)] font-semibold">customers</strong>,{" "}
            <strong className="text-[var(--brand-primary)] font-semibold">agency banking networks</strong>,{" "}
            <strong className="text-[var(--brand-secondary)] font-semibold">BDC/FX operators</strong>, and{" "}
            <strong className="text-[var(--foreground)] font-semibold">businesses</strong> through secure,
            scalable digital financial infrastructure built for the next generation of African commerce.
          </p>
        </div>

        {/* LEFT / RIGHT split (§16): headline + CTA on the left, premium visual + glass interface right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center mb-12">
          {/* LEFT: Segment switcher + interactive copy + CTA */}
          <div className="lg:col-span-7 space-y-6">
            {/* Audience Segment Switcher */}
            <div className="inline-flex p-1.5 rounded-2xl glass-01 shadow-sm">
              <button
                onClick={() => setActiveSegment("agents")}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeSegment === "agents"
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>For Agents</span>
              </button>
              <button
                onClick={() => setActiveSegment("bdc")}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeSegment === "bdc"
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Repeat2 className="w-3.5 h-3.5" />
                <span>For BDCs / FX</span>
              </button>
              <button
                onClick={() => setActiveSegment("customers")}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeSegment === "customers"
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>For Customers</span>
              </button>
              <button
                onClick={() => setActiveSegment("business")}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeSegment === "business"
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">For Businesses</span>
                <span className="sm:hidden">Business</span>
              </button>
            </div>

            {/* Interactive copy */}
            <div className="max-w-xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--brand-whisper)] text-[var(--brand-primary)] border border-[var(--brand-border)]/40">
                  {activeData.badge}
                </span>
                <span className="text-xs text-[var(--muted)] flex items-center gap-1 font-mono">
                  <Zap className="w-3 h-3 text-[var(--brand-secondary)]" /> {activeData.metric}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--foreground)] leading-snug">
                {activeData.title}
              </h2>

              <p className="text-xs sm:text-sm text-[var(--foreground-muted)] leading-relaxed">
                {activeData.desc}
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  onClick={activeData.action}
                  className="px-5 py-2.5 rounded-xl btn-korie-primary text-xs font-bold flex items-center gap-2"
                >
                  <span>{activeData.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  href={
                    activeSegment === "agents"
                      ? "/solutions/agency-banking"
                      : activeSegment === "bdc"
                      ? "/solutions/bdc-fx"
                      : activeSegment === "customers"
                      ? "/solutions/customers"
                      : "/solutions/business"
                  }
                  className="px-4 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--foreground)] text-xs font-semibold border border-[var(--border-strong)] transition-colors flex items-center gap-1.5"
                >
                  <span>Explore Architecture</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)]" />
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT: premium KoriePay visual + glass financial panel */}
          <div className="lg:col-span-5 relative">
            <KpayImageCard
              src="/images/visual/hero-ecosystem.webp"
              alt="Digital KoriePay payment ecosystem connecting Nigeria and Niger Republic across a light glass interface"
              aspect="4 / 3"
              objectPosition="center"
              priority
              frame
              className="shadow-2xl"
            />

            {/* Floating glass financial panel, physically integrated with the scene */}
            <div className="absolute -bottom-5 left-4 right-4 sm:left-6 sm:right-auto sm:w-72 p-4 rounded-2xl glass-03 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-mono text-[var(--foreground)]">LIVE NODE</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--brand-primary)]">99.98% SLA</span>
              </div>
              <div className="pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Corridor</span>
                  <span className="text-[var(--brand-primary)] font-mono font-bold">Kano ↔ Maradi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Settlement</span>
                  <span className="text-[var(--foreground)] font-mono">NGN ⇄ XOF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Latency</span>
                  <span className="text-[var(--brand-secondary)] font-mono">&lt; 420ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Ecosystem Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-4 rounded-2xl glass-01 text-center">
            <div className="text-xl sm:text-2xl font-bold text-[var(--brand-primary)] font-mono">2 Markets</div>
            <div className="text-xs text-[var(--muted)] mt-1">Nigeria 🇳🇬 &amp; Niger Republic 🇳🇪</div>
          </div>
          <div className="p-4 rounded-2xl glass-01 text-center">
            <div className="text-xl sm:text-2xl font-bold text-[var(--brand-secondary)] font-mono">3 Core Pillars</div>
            <div className="text-xs text-[var(--muted)] mt-1">Agency, BDC/FX &amp; Customers</div>
          </div>
          <div className="p-4 rounded-2xl glass-01 text-center">
            <div className="text-xl sm:text-2xl font-bold text-[var(--brand-accent)] font-mono">&lt; 650ms</div>
            <div className="text-xs text-[var(--muted)] mt-1">Sub-second Routing</div>
          </div>
          <div className="p-4 rounded-2xl glass-01 text-center">
            <div className="text-xl sm:text-2xl font-bold text-[var(--foreground)] font-mono">99.98%</div>
            <div className="text-xs text-[var(--muted)] mt-1">Uptime SLA</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
