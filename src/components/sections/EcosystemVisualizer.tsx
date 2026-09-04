"use client";

import React, { useState } from "react";
import { useCountry } from "../ui/CountryContext";
import { useLanguage } from "../ui/LanguageContext";
import {
  Building2,
  Repeat2,
  Users,
  Briefcase,
  Globe2,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Image from "next/image";

export const EcosystemVisualizer: React.FC = () => {
  const { openModal } = useCountry();
  const { t } = useLanguage();
  const [activeNode, setActiveNode] = useState<"agency" | "bdc" | "customers" | "business" | "corridor">("agency");

  const nodes = {
    agency: {
      title: t("public.home.ecosystem.agTitle"),
      tagline: t("public.home.ecosystem.agTagline"),
      desc: t("public.home.ecosystem.agDesc"),
      features: [
        t("public.home.ecosystem.agF1"),
        t("public.home.ecosystem.agF2"),
        t("public.home.ecosystem.agF3"),
        t("public.home.ecosystem.agF4"),
      ],
      route: "/solutions/agency-banking",
      cta: t("public.home.ecosystem.agCta"),
      action: () => openModal("agent"),
      color: "from-emerald-500 to-teal-500",
      accent: "text-emerald-400",
    },
    bdc: {
      title: t("public.home.ecosystem.fxTitle"),
      tagline: t("public.home.ecosystem.fxTagline"),
      desc: t("public.home.ecosystem.fxDesc"),
      features: [
        t("public.home.ecosystem.fxF1"),
        t("public.home.ecosystem.fxF2"),
        t("public.home.ecosystem.fxF3"),
        t("public.home.ecosystem.fxF4"),
      ],
      route: "/solutions/bdc-fx",
      cta: t("public.home.ecosystem.fxCta"),
      action: () => openModal("bdc"),
      color: "from-amber-500 to-orange-500",
      accent: "text-amber-400",
    },
    customers: {
      title: t("public.home.ecosystem.cuTitle"),
      tagline: t("public.home.ecosystem.cuTagline"),
      desc: t("public.home.ecosystem.cuDesc"),
      features: [
        t("public.home.ecosystem.cuF1"),
        t("public.home.ecosystem.cuF2"),
        t("public.home.ecosystem.cuF3"),
        t("public.home.ecosystem.cuF4"),
      ],
      route: "/solutions/customers",
      cta: t("public.home.ecosystem.cuCta"),
      action: () => openModal("contact", "Customer App"),
      color: "from-teal-500 to-emerald-500",
      accent: "text-teal-400",
    },
    business: {
      title: t("public.home.ecosystem.bzTitle"),
      tagline: t("public.home.ecosystem.bzTagline"),
      desc: t("public.home.ecosystem.bzDesc"),
      features: [
        t("public.home.ecosystem.bzF1"),
        t("public.home.ecosystem.bzF2"),
        t("public.home.ecosystem.bzF3"),
        t("public.home.ecosystem.bzF4"),
      ],
      route: "/solutions/business",
      cta: t("public.home.ecosystem.bzCta"),
      action: () => openModal("business"),
      color: "from-blue-500 to-indigo-500",
      accent: "text-blue-400",
    },
    corridor: {
      title: t("public.home.ecosystem.coTitle"),
      tagline: t("public.home.ecosystem.coTagline"),
      desc: t("public.home.ecosystem.coDesc"),
      features: [
        t("public.home.ecosystem.coF1"),
        t("public.home.ecosystem.coF2"),
        t("public.home.ecosystem.coF3"),
        t("public.home.ecosystem.coF4"),
      ],
      route: "/solutions/payments",
      cta: t("public.home.ecosystem.coCta"),
      action: () => openModal("contact", "Cross-Border Settlement"),
      color: "from-emerald-500 via-amber-500 to-orange-500",
      accent: "text-emerald-400",
    },
  };

  const current = nodes[activeNode];

  return (
    <section className="py-20 lg:py-28 relative kp-band-warm overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block mb-3">
            {t("public.home.ecosystem.badge")}
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {t("public.home.ecosystem.heading")}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            {t("public.home.ecosystem.intro")}
          </p>
        </div>

        {/* Visual Interactive Map / Diagram Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Node Interactive Diagram Visualizer */}
          <div className="lg:col-span-7">
            <div className="relative p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-2xl">
              {/* Central Infrastructure Core Hub */}
              <div className="flex flex-col items-center justify-center mb-8">
                <div className="relative flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-slate-900 to-amber-500/20 border border-white/20 shadow-2xl">
                  <div className="w-16 h-16 relative">
                    <Image
                      src="/brand/koriepay-icon-tight.png"
                      alt="KoriePay Core"
                      width={64}
                      height={64}
                      className="object-contain w-full h-full drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                  <div className="ml-3 text-left">
                    <div className="text-sm font-extrabold text-white tracking-wide">{t("public.home.ecosystem.engineLabel")}</div>
                    <div className="text-[10px] font-mono text-emerald-400">{t("public.home.ecosystem.engineSub")}</div>
                  </div>
                </div>

                {/* Animated connecting pulses */}
                <div className="h-6 w-0.5 bg-gradient-to-b from-emerald-400 to-transparent animate-pulse my-1" />
              </div>

              {/* Surrounding Connected Nodes Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Node 1: Agency Banking */}
                <button
                  onClick={() => setActiveNode("agency")}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    activeNode === "agency"
                      ? "bg-emerald-500/15 border-emerald-500/60 shadow-lg shadow-emerald-500/10"
                      : "bg-slate-950/60 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    {activeNode === "agency" && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                    {t("public.home.ecosystem.n1")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {t("public.home.ecosystem.n1sub")}
                  </div>
                </button>

                {/* Node 2: BDC / FX */}
                <button
                  onClick={() => setActiveNode("bdc")}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    activeNode === "bdc"
                      ? "bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10"
                      : "bg-slate-950/60 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <Repeat2 className="w-5 h-5" />
                    </div>
                    {activeNode === "bdc" && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">
                    {t("public.home.ecosystem.n2")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {t("public.home.ecosystem.n2sub")}
                  </div>
                </button>

                {/* Node 3: Customers */}
                <button
                  onClick={() => setActiveNode("customers")}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    activeNode === "customers"
                      ? "bg-teal-500/15 border-teal-500/60 shadow-lg shadow-teal-500/10"
                      : "bg-slate-950/60 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                      <Users className="w-5 h-5" />
                    </div>
                    {activeNode === "customers" && (
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-teal-300">
                    {t("public.home.ecosystem.n3")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {t("public.home.ecosystem.n3sub")}
                  </div>
                </button>

                {/* Node 4: Business / Enterprise */}
                <button
                  onClick={() => setActiveNode("business")}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    activeNode === "business"
                      ? "bg-blue-500/15 border-blue-500/60 shadow-lg shadow-blue-500/10"
                      : "bg-slate-950/60 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    {activeNode === "business" && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-300">
                    {t("public.home.ecosystem.n4")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {t("public.home.ecosystem.n4sub")}
                  </div>
                </button>
              </div>

              {/* Bottom Cross-Border Corridor Node */}
              <button
                onClick={() => setActiveNode("corridor")}
                className={`w-full mt-3 p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  activeNode === "corridor"
                    ? "bg-emerald-500/20 border-emerald-500/60 text-white"
                    : "bg-slate-950/80 border-white/10 text-slate-300 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                    <Globe2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{t("public.home.ecosystem.corridorNodeTitle")}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {t("public.home.ecosystem.corridorNodeDesc")}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* Right: Active Node Detail Card */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-8 rounded-3xl glass-02 border border-[var(--border-strong)] shadow-2xl relative overflow-hidden">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
                {t("public.home.ecosystem.detailLabel")}
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {current.title}
              </h3>

              <div className={`text-xs font-medium ${current.accent} mb-4`}>
                {current.tagline}
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                {current.desc}
              </p>

              {/* Key Features Bullet List */}
              <div className="space-y-2.5 mb-8">
                {current.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={current.action}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl btn-korie-primary text-xs font-bold flex items-center justify-center gap-2"
                >
                  <span>{current.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <a
                  href={current.route}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold text-center border border-white/10 transition-colors"
                >
                  {t("public.home.ecosystem.learnMore")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EcosystemVisualizer;
