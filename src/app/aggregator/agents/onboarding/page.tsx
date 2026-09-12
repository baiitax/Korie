"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function AgentOnboardingPage() {
  const { territories, onboardAgent } = useAggregator();

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [territoryId, setTerritoryId] = useState(territories[0]?.id || "");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [kycTier, setKycTier] = useState<"TIER_1" | "TIER_2" | "TIER_3">("TIER_1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    setIsSubmitting(true);
    setError(null);

    const terr = territories.find((tr) => tr.id === territoryId);
    const result = await onboardAgent({
      fullName,
      businessName: businessName || undefined,
      phone,
      email: email || undefined,
      territoryId: territoryId || undefined,
      state: state || undefined,
      lga: lga || undefined,
      country: terr ? terr.country : "NG",
      kycTier,
    });

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || "Could not onboard agent. Please try again.");
      return;
    }
    setSuccess(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/aggregator/agents"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Agent Directory</span>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Agent Onboarding</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Enroll a new agency cash point into your network. New agents start PENDING until KYC is verified.
        </p>
      </div>

      {success ? (
        <div className="p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-6 text-center shadow-[var(--shadow-card)]">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--foreground)]">Agent Enrolled Successfully!</h3>
            <p className="text-xs text-[var(--foreground-muted)] mt-2">
              The agent has been created with PENDING status and zero-balance float accounts. Activation requires
              KYC verification before they can transact.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/aggregator/agents"
              className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] font-bold text-xs shadow-md"
            >
              View in Agent Network
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-6 shadow-[var(--shadow-card)]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Personal & Business */}
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-[var(--brand-accent)] font-bold tracking-wider">
              1. Agency Operator & Business Profile
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">
                  Agent Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Garba Mohammed Bello"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">Business / Trading Title</label>
                <input
                  type="text"
                  placeholder="e.g. Dan-Gambo Agro Agency"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="+234 803 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="agent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Territory Assignment */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="text-xs font-mono uppercase text-[var(--brand-accent)] font-bold tracking-wider">
              2. Territory & Geographical Node
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">Territory</label>
                <select
                  value={territoryId}
                  onChange={(e) => setTerritoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                >
                  <option value="">Unassigned</option>
                  {territories.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name} ({tr.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">State / Region</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">LGA / Commune</label>
                <input
                  type="text"
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: KYC Tier */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="text-xs font-mono uppercase text-[var(--brand-accent)] font-bold tracking-wider">
              3. Starting KYC Tier
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              {(["TIER_1", "TIER_2", "TIER_3"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setKycTier(tier)}
                  className={`px-3 py-2.5 rounded-xl border font-bold transition-colors ${
                    kycTier === tier
                      ? "bg-[var(--brand-soft)] border-[var(--brand-primary)] text-[var(--brand-primary)]"
                      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--foreground-muted)]"
                  }`}
                >
                  {tier.replace("_", " ")}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              The agent remains PENDING until your compliance team verifies identity documents, regardless of the
              selected tier.
            </p>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Link
              href="/aggregator/agents"
              className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground-muted)] text-xs font-bold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Enrolling..." : "Complete Agent Onboarding"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
