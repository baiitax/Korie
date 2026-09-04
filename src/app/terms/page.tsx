import React from "react";
import { Metadata } from "next";
import { FileText, ShieldCheck, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | KoriePay",
  description:
    "Institutional terms of service, platform usage rules, and regulatory operating disclosures for KoriePay.",
};

export default function TermsPage() {
  return (
    <main className="pt-28 sm:pt-32 pb-20">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>LEGAL DISCLOSURES</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms of Service & Infrastructure Agreement
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 font-mono">
            Effective Date: September 3, 2026 • Nigeria & Niger Republic
          </p>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">1. Operating Mandate & Role</h2>
            <p>
              KoriePay Technologies Limited provides financial technology routing software, terminal operating systems, digital wallets, and API gateway infrastructure. KoriePay operates in direct technical partnership with licensed commercial banks, mobile money operators, and authorized Bureau De Change entities in the Federal Republic of Nigeria and the Republic of Niger.
            </p>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">2. Agency Banking Terms</h2>
            <p>
              Agents authorized on the KoriePay platform agree to operate in accordance with Central Bank agency banking guidelines, maintain adequate float liquidity, display official transaction charge disclosures, and refrain from collecting unapproved surcharges from consumers.
            </p>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">3. BDC & FX Operational Compliance</h2>
            <p>
              Bureau De Change and FX operators utilizing KoriePay treasury tools represent and warrant that they possess active, valid operational authority under applicable sovereign laws and shall comply with all statutory anti-money laundering (AML) and counter-terrorist financing (CFT) transaction threshold monitoring rules.
            </p>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">4. Platform Availability & SLAs</h2>
            <p>
              KoriePay commits to providing 99.98% core transaction engine availability, backed by redundant cloud infrastructure. Scheduled maintenance windows are communicated in advance via our institutional status updates.
            </p>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-2">5. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms shall be interpreted and enforced under the laws of the Federal Republic of Nigeria for Nigerian operations, and the laws of the Republic of Niger / WAEMU commercial code for Nigerien operations, without regard to conflict of law principles.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
