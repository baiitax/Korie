"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  FileCheck2,
  Database,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { useCountry } from "@/components/ui/CountryContext";
import CTASection from "@/components/sections/CTASection";

export default function SecurityPage() {
  const { openModal } = useCountry();

  const securityLayers = [
    {
      title: "Identity & Biometric Authentication",
      desc: "Multi-factor authentication (MFA) with mandatory hardware-backed biometric verification on agent terminals and mobile apps, preventing unauthorized credential takeover.",
      icon: <UserCheck className="w-5 h-5 text-emerald-400" />,
    },
    {
      title: "End-to-End Cryptography",
      desc: "All network traffic is encrypted via TLS 1.3 with strict HSTS enforcement. Data at rest is encrypted using AES-256 with automated key rotation.",
      icon: <Lock className="w-5 h-5 text-amber-400" />,
    },
    {
      title: "Zero-Trust Infrastructure Perimeter",
      desc: "Strict least-privilege network segmentation, role-based access control (RBAC), and mutual TLS (mTLS) for all internal microservice-to-microservice communication.",
      icon: <KeyRound className="w-5 h-5 text-teal-400" />,
    },
    {
      title: "Continuous Telemetry & Anomaly Detection",
      desc: "Automated heuristics analyze transaction velocities, IP reputation, and border traversal anomalies in real time, pausing suspicious transfers before settlement.",
      icon: <Eye className="w-5 h-5 text-blue-400" />,
    },
    {
      title: "Immutable Double-Entry Ledger",
      desc: "Double-entry cryptographic ledger architecture ensures tamper-evident audit trails. Every transaction is digitally signed and independently reconcilable.",
      icon: <Database className="w-5 h-5 text-purple-400" />,
    },
    {
      title: "NDPR & Regional Data Governance",
      desc: "Architected to comply with the Nigeria Data Protection Regulation (NDPR) and West African data privacy standards, ensuring customer data residency integrity.",
      icon: <FileCheck2 className="w-5 h-5 text-emerald-400" />,
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>INSTITUTIONAL TRUST & RISK GOVERNANCE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Security Is Built Into{" "}
            <span className="text-gradient-korie">Every Transaction</span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
            Designed with security-first principles. We safeguard critical financial transactions, protect customer privacy, and ensure regulatory alignment across Nigeria and Niger Republic.
          </p>
        </div>
      </section>

      {/* Security Architecture Grid */}
      <section className="py-16 kp-band-brand-tint relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityLayers.map((layer, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl glass-02 border border-[var(--border-strong)] hover:border-emerald-500/40 transition-all"
              >
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 w-fit mb-4">
                  {layer.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{layer.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{layer.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Compliance Box */}
      <section className="py-8 kp-band-cool relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 rounded-3xl bg-[#0d162a] border border-white/15 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-white">Need an Institutional Security Audit Report?</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Our Chief Information Security Officer (CISO) and compliance desks provide technical whitepapers for partner commercial banks and aggregators.
              </p>
            </div>
            <button
              onClick={() => openModal("contact", "Security Whitepaper Request")}
              className="px-6 py-3 rounded-xl btn-korie-primary text-slate-950 font-bold text-xs shrink-0 flex items-center gap-2 shadow-lg"
            >
              <span>Request CISO Audit Package</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
