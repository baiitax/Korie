import React from "react";
import { Metadata } from "next";
import { ShieldCheck, Lock, FileText, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | KoriePay",
  description:
    "KoriePay's commitment to user data privacy, NDPR compliance, encryption, and secure cross-border transaction processing.",
};

export default function PrivacyPage() {
  return (
    <main className="pt-28 sm:pt-32 pb-20">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DATA PROTECTION & GOVERNANCE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            KoriePay Global Privacy Policy
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 font-mono">
            Last Updated: September 3, 2026 • NDPR & WAEMU Aligned
          </p>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">1. Introduction & Scope</h2>
            <p>
              KoriePay Technologies Limited (&ldquo;KoriePay&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting the privacy and personal data of our users, agents, BDC partners, merchants, and website visitors across Nigeria and Niger Republic. This Privacy Policy outlines our data practices in strict accordance with the Nigeria Data Protection Act / Regulation (NDPR) and applicable data governance frameworks across the West African Economic and Monetary Union (WAEMU).
            </p>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect information strictly necessary to provide reliable financial infrastructure:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong className="text-slate-200">Identity & KYC Data:</strong> Full legal name, government identification numbers (NIN, BVN, Passport, National ID), and business registration certificates.</li>
              <li><strong className="text-slate-200">Contact Details:</strong> Official email address, telephone numbers, and physical business location coordinates.</li>
              <li><strong className="text-slate-200">Transaction & Telemetry Data:</strong> Transaction references, timestamps, sender/receiver bank identifiers, amounts, currency pairs, and POS terminal device signatures.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">3. How We Use Your Data</h2>
            <p>
              Data collected is utilized exclusively to route transactions, prevent AML/financial crime, satisfy regulatory reporting mandates with partner commercial banks and central banking authorities, maintain immutable ledgers, and provide technical customer support.
            </p>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">4. Cryptographic Safeguards & Data Retention</h2>
            <p>
              All customer data is encrypted in transit using TLS 1.3 and at rest using AES-256 cryptographic standards. We maintain double-entry audit ledgers in highly secure, fault-tolerant cloud environments with zero unauthorized third-party monetization or marketing resale.
            </p>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">5. User Rights & Data Protection Inquiries</h2>
            <p>
              Under NDPR and regional regulations, you retain the right to request access to your records, rectify inaccurate data, or lodge a formal data inquiry with our Data Protection Officer at <strong className="text-emerald-400">privacy@koriepay.com</strong>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
