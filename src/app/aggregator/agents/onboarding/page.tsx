"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Users,
  ArrowLeft,
  CheckCircle2,
  Building2,
  FileCheck,
  ShieldCheck,
  MapPin,
  Sparkles,
} from "lucide-react";

export default function AgentOnboardingPage() {
  const router = useRouter();
  const { territories, onboardAgent, t } = useAggregator();

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [territoryId, setTerritoryId] = useState(territories[0]?.id || "ter-kn-01");
  const [state, setState] = useState("Kano State");
  const [lga, setLga] = useState("Dawanau / Fagge");
  const [ninNumber, setNinNumber] = useState("");
  const [bvnNumber, setBvnNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAgentCode, setCreatedAgentCode] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const terr = territories.find((t) => t.id === territoryId);
      const newAgt = onboardAgent({
        fullName,
        businessName: businessName || `${fullName} POS Center`,
        phone,
        email: email || undefined,
        territoryId,
        territoryName: terr ? terr.name : "Kano North & Urban",
        state,
        lga,
        country: terr ? terr.country : "NG",
        kycTier: "TIER_2",
      });
      setCreatedAgentCode(newAgt.agentCode);
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/aggregator/agents"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Agent Directory</span>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Controlled Agent Onboarding</h1>
        <p className="text-xs text-slate-400">
          Enroll authorized agency cash points, register NIN/BVN identities, assign territories, and provision POS terminals
        </p>
      </div>

      {createdAgentCode ? (
        <div className="p-8 rounded-3xl bg-[#091122] border border-white/10 space-y-6 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Agent Enrolled Successfully!</h3>
            <p className="text-xs text-teal-300 font-mono font-bold mt-1">
              Assigned Node Code: {createdAgentCode}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Agent profile has been provisioned in the Sahel Syndicate directory. Float top-up can now be dispatched.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/aggregator/agents"
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20"
            >
              View in Agent Network
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-[#091122] border border-white/10 space-y-6 shadow-xl">
          {/* Section 1: Personal & Business */}
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-teal-400 font-bold tracking-wider">
              1. Agency Operator & Business Profile
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Agent Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Garba Mohammed Bello"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Business / Trading Title</label>
                <input
                  type="text"
                  placeholder="e.g. Dan-Gambo Agro Agency"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="+234 803 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="agent@sahelagency.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Territory Assignment */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="text-xs font-mono uppercase text-teal-400 font-bold tracking-wider">
              2. Territory & Geographical Node
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Territory</label>
                <select
                  value={territoryId}
                  onChange={(e) => setTerritoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {territories.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">State / Region</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">LGA / Commune</label>
                <input
                  type="text"
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Identity & Compliance */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="text-xs font-mono uppercase text-teal-400 font-bold tracking-wider">
              3. Regulatory Identity & KYC
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">National Identity Number (NIN)</label>
                <input
                  type="text"
                  placeholder="11-digit NIN"
                  value={ninNumber}
                  onChange={(e) => setNinNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Bank Verification Number (BVN)</label>
                <input
                  type="text"
                  placeholder="11-digit BVN"
                  value={bvnNumber}
                  onChange={(e) => setBvnNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Link
              href="/aggregator/agents"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Enrolling..." : "Complete Agent Onboarding"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
