"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Server,
  Eye,
  KeyRound,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  Database,
  Cpu,
} from "lucide-react";
import { useCountry } from "../ui/CountryContext";
import KpayImageCard from "@/components/ui/KpayImageCard";

export const TrustMetrics: React.FC = () => {
  const { openModal } = useCountry();

  const securityPillars = [
    {
      icon: <KeyRound className="w-5 h-5 text-emerald-400" />,
      title: "Zero-Trust Identity & MFA",
      desc: "Multi-layered biometric verification, dynamic OTP challenge-response, and granular role-based access control (RBAC) across all merchant and agent interfaces.",
    },
    {
      icon: <Lock className="w-5 h-5 text-amber-400" />,
      title: "End-to-End Cryptography",
      desc: "TLS 1.3 in-transit encryption and AES-256 at-rest cryptographic protection ensuring transaction payloads and sensitive consumer records remain confidential.",
    },
    {
      icon: <Eye className="w-5 h-5 text-teal-400" />,
      title: "Real-Time Anomaly Telemetry",
      desc: "Automated heuristics monitoring velocity limits, IP/device geolocation divergence across the Nigeria-Niger border, and fraud patterns 24 hours a day.",
    },
    {
      icon: <FileCheck2 className="w-5 h-5 text-blue-400" />,
      title: "NDPR & WAEMU Data Governance",
      desc: "Architected in strict alignment with the Nigeria Data Protection Regulation (NDPR) and West African Economic and Monetary Union data residency standards.",
    },
    {
      icon: <Database className="w-5 h-5 text-purple-400" />,
      title: "Immutable Transaction Ledger",
      desc: "Double-entry cryptographic ledger architecture ensuring every debit, credit, fee split, and cross-border currency swap is fully auditable and tamper-evident.",
    },
    {
      icon: <Cpu className="w-5 h-5 text-orange-400" />,
      title: "Redundant Cloud Resilience",
      desc: "Multi-region distributed infrastructure with automated failover routing, maintaining 99.98% core transaction engine availability.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 relative kp-band-brand-tint text-white overflow-hidden">
      {/* Visual background lights */}
      <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-whisper)] border border-[var(--brand-border)]/40 text-xs font-mono text-[var(--brand-primary)] mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SECURITY-FIRST ARCHITECTURE</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-[var(--foreground)]">
                Security &amp; Integrity Engineered Into Every Transaction
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[var(--foreground-muted)] leading-relaxed">
                Financial infrastructure demands uncompromised reliability. KoriePay is engineered from the ground up with defensive architecture, robust identity verification, and comprehensive auditability.
              </p>
            </div>
            <div className="lg:col-span-6">
              <KpayImageCard
                src="/images/visual/trust-security.webp"
                alt="Secure KoriePay digital banking — identity verification and fraud monitoring"
                aspect="4 / 3"
                objectPosition="center"
                className="shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* 6 Security Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {securityPillars.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-emerald-500/30 transition-all group"
            >
              <div className="p-3 rounded-xl bg-slate-800/80 border border-white/5 w-fit mb-4 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Institutional Assurance Strip */}
        <div className="p-6 sm:p-8 rounded-3xl glass-02 border border-[var(--border-strong)] flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-1 text-center lg:text-left">
            <h4 className="text-base sm:text-lg font-bold text-white">
              Institutional Compliance & Integration Inquiries
            </h4>
            <p className="text-xs text-slate-400 max-w-xl">
              Are you a licensed commercial bank, BDC consortium, or fintech seeking integration whitepapers or architectural audits?
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/security"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
            >
              View Security Whitepaper
            </Link>
            <button
              onClick={() => openModal("contact", "Security & Compliance")}
              className="px-5 py-2.5 rounded-xl btn-korie-primary text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <span>Contact Compliance Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustMetrics;
