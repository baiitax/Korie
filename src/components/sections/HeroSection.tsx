"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCountry } from "../ui/CountryContext";
import { useLanguage } from "../ui/LanguageContext";
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
  const { t } = useLanguage();
  const [activeSegment, setActiveSegment] = useState<"agents" | "bdc" | "customers" | "business">("agents");

  const segmentContent = {
    agents: {
      badge: t("public.hero.agentsBadge"),
      title: t("public.hero.agentsTitle"),
      desc: t("public.hero.agentsDesc"),
      cta: t("public.hero.agentsCta"),
      action: () => openModal("agent"),
      metric: t("public.hero.agentsMetric"),
    },
    bdc: {
      badge: t("public.hero.fxBadge"),
      title: t("public.hero.fxTitle"),
      desc: t("public.hero.fxDesc"),
      cta: t("public.hero.fxCta"),
      action: () => openModal("bdc"),
      metric: t("public.hero.fxMetric"),
    },
    customers: {
      badge: t("public.hero.customersBadge"),
      title: t("public.hero.customersTitle"),
      desc: t("public.hero.customersDesc"),
      cta: t("public.hero.customersCta"),
      action: () => openModal("contact", "Customer Wallet"),
      metric: t("public.hero.customersMetric"),
    },
    business: {
      badge: t("public.hero.businessBadge"),
      title: t("public.hero.businessTitle"),
      desc: t("public.hero.businessDesc"),
      cta: t("public.hero.businessCta"),
      action: () => openModal("business"),
      metric: t("public.hero.businessMetric"),
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
              {t("public.hero.corridorLabel")}
            </span>
          </div>
        </div>

        {/* Main Headline (LEFT) */}
        <div className="max-w-3xl mx-auto lg:mx-0 text-center lg:text-left mb-8">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--foreground)] leading-[1.1]">
            {t("public.hero.headingLead")}{" "}
            <span className="text-gradient-korie">{t("public.hero.headingHighlight")}</span>
          </h1>
          <p className="mt-5 text-sm sm:text-lg text-[var(--foreground-muted)] leading-relaxed max-w-2xl mx-auto lg:mx-0">
            <span dangerouslySetInnerHTML={{ __html: t("public.hero.subcopy") }} />
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
{t("public.hero.forAgents")}
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
{t("public.hero.forFx")}
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
{t("public.hero.forCustomers")}
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
{t("public.hero.forBusinesses")}
{t("public.hero.forBusinessesShort")}
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
                  <span>{t("public.hero.exploreCta")}</span>
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
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]" />
                  <span className="text-[11px] font-mono text-[var(--foreground)]">{t("public.hero.panelRail")}</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--brand-primary)]">{t("public.hero.panelTag")}</span>
              </div>
              <div className="pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">{t("public.hero.corridor")}</span>
                  <span className="text-[var(--brand-primary)] font-mono font-bold">{t("public.hero.corridorVal")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">{t("public.hero.settlement")}</span>
                  <span className="text-[var(--foreground)] font-mono">{t("public.hero.settlementVal")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">{t("public.hero.formats")}</span>
                  <span className="text-[var(--brand-secondary)] font-mono">{t("public.hero.formatsVal")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ecosystem At-a-Glance Strip — verifiable, non-fabricated */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-4 rounded-2xl glass-01 text-center">
            <div className="text-xl sm:text-2xl font-bold text-[var(--brand-primary)] font-mono">{t("public.hero.m1val")}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{t("public.hero.m1sub")}</div>
          </div>
          <div className="p-4 rounded-2xl glass-01 text-center">
            <div className="text-xl sm:text-2xl font-bold text-[var(--brand-secondary)] font-mono">{t("public.hero.m2val")}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{t("public.hero.m2sub")}</div>
          </div>
          <div className="p-4 rounded-2xl glass-01 text-center">
            <div className="text-xl sm:text-2xl font-bold text-[var(--brand-accent)] font-mono">{t("public.hero.m3val")}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{t("public.hero.m3sub")}</div>
          </div>
          <div className="p-4 rounded-2xl glass-01 text-center">
            <div className="text-xl sm:text-2xl font-bold text-[var(--foreground)] font-mono">{t("public.hero.m4val")}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{t("public.hero.m4sub")}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
