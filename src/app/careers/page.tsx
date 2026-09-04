import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  Briefcase,
  Globe2,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Sparkles,
} from "lucide-react";
import CTASection from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "Careers & Culture | KoriePay",
  description:
    "Join our mission to build Tier-1 cross-border fintech infrastructure connecting Nigeria, Niger Republic, and West Africa.",
};

export default function CareersPage() {
  const openRoles = [
    {
      title: "Senior Distributed Systems Engineer (Go / Rust)",
      dept: "Core Infrastructure",
      location: "Abuja / Lagos / Remote",
      type: "Full-Time",
      desc: "Architect and optimize high-throughput double-entry transaction ledgers and interbank clearing pipelines.",
    },
    {
      title: "Regional Agency Banking Growth Lead (Sahel)",
      dept: "Market Operations",
      location: "Kano / Maradi / Niamey",
      type: "Full-Time",
      desc: "Drive POS terminal deployment, float management, and field relationship growth across Northern Nigeria and Niger.",
    },
    {
      title: "Regulatory Compliance & AML Officer (WAEMU / CBN)",
      dept: "Legal & Risk",
      location: "Abuja / Niamey",
      type: "Full-Time",
      desc: "Ensure seamless compliance with Central Bank of Nigeria (CBN) and Central Bank of West African States (BCEAO) directives.",
    },
    {
      title: "Senior Mobile Engineer (Flutter / React Native)",
      dept: "Consumer & Merchant Apps",
      location: "Lagos / Remote",
      type: "Full-Time",
      desc: "Build ultra-fast, multi-lingual (English, Hausa, French) mobile apps and terminal OS experiences.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-4">
            <Users className="w-3.5 h-3.5" />
            <span>JOIN KORIEPAY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Build the Future of{" "}
            <span className="text-gradient-korie">African Financial Infrastructure</span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
            We are looking for engineers, operators, and cross-border trade specialists passionate about connecting communities, agents, and businesses across West Africa.
          </p>
        </div>
      </section>

      {/* Open Roles */}
      <section className="py-16 bg-[#060a14] relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Current Open Positions</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Competitive compensation, equity participation, health coverage, and flexible regional hub locations.
            </p>
          </div>

          <div className="space-y-4">
            {openRoles.map((role, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {role.dept}
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" /> {role.location}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">{role.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">{role.desc}</p>
                </div>

                <Link
                  href="/contact"
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shrink-0 border border-white/10 transition-colors flex items-center gap-1.5"
                >
                  <span>Apply Now</span>
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
