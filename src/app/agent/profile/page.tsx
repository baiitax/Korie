"use client";

// =============================================================================
// Agency profile — read from the agent registry engine (agt-ng-001), not mock
// constants. Shows regulatory posture + limits enforced by the engine.
// =============================================================================

import React from "react";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  statusTone,
  AgentFreshnessBar,
} from "@/components/agent/ui/AgentUi";
import { Building2, ShieldCheck, MapPin, Phone, Mail, BadgeCheck, Scale, Target } from "lucide-react";
import { formatMoney } from "@/lib/money";

export default function AgentProfilePage() {
  const { phase, errorMessage, summary, refresh, refreshedAt, isBalanceHidden } = useAgentPortal();

  if (phase === "loading") return <AgentPageSkeleton rows={3} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your agency profile" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const agent = summary.agent;

  const identityRows = [
    { label: "Legal entity", value: agent.legalName, icon: Building2 },
    { label: "Trading name", value: agent.tradingName, icon: Building2 },
    { label: "Agent code", value: agent.agentCode, icon: BadgeCheck },
    { label: "Location", value: `${agent.lgaOrDistrict}, ${agent.stateOrProvince}`, icon: MapPin },
    { label: "Phone", value: agent.phone, icon: Phone },
    { label: "Email", value: agent.email, icon: Mail },
  ];

  const posture = [
    { label: "Quality score", value: `${agent.qualityScore}%`, note: "Registry quality metric" },
    { label: "Risk tier", value: agent.riskTier, note: "Current engine classification" },
    { label: "24h success rate", value: `${agent.successRate24h}%`, note: "Engine measured" },
    { label: "KYC status", value: agent.kycStatus, note: "Compliance posture" },
  ];

  const limits = [
    { label: "Daily transaction limit", value: formatMoney(agent.dailyTransactionLimit, "NGN") },
    { label: "Single transaction limit", value: formatMoney(agent.singleTransactionLimit, "NGN") },
    { label: "Max cash holding", value: formatMoney(agent.maxCashHolding, "NGN") },
    { label: "Registry float balance", value: isBalanceHidden ? "••••••" : formatMoney(agent.floatBalance, "NGN") },
  ];

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader title="Agency Profile" subtitle="Registered agency banking entity and engine-enforced limits." />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void refresh({ silent: true })} />

      {/* Hero */}
      <section aria-label="Agency identity" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-xl font-black text-white">
            {agent.tradingName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-stone-900">{agent.tradingName}</p>
            <p className="text-xs text-stone-500">{agent.legalName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <AgentChip label={`${agent.agentCode} · ${agent.tier}`} tone="sky" />
              <AgentChip label={agent.status} tone={statusTone(agent.status)} />
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {agent.kycStatus}
              </span>
            </div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-stone-100 pt-4 sm:grid-cols-2">
          {identityRows.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5 text-sm">
              <r.icon className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />
              <dt className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-stone-400">{r.label}</dt>
              <dd className="truncate font-medium text-stone-800">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Posture */}
      <section aria-label="Engine posture" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {posture.map((p) => (
          <div key={p.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{p.label}</p>
            <p className="mt-1 text-xl font-bold text-stone-900">{p.value}</p>
            <p className="text-[10px] text-stone-400">{p.note}</p>
          </div>
        ))}
      </section>

      {/* Limits */}
      <section aria-label="Engine limits" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Scale className="h-4 w-4 text-stone-400" aria-hidden="true" />
          Engine-enforced limits
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {limits.map((l) => (
            <div key={l.label} className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{l.label}</p>
              <p className="mt-1 font-mono text-sm font-bold text-stone-800">{l.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-400">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Operations above the single-transaction limit are rejected by the engine with an explicit message — the UI never
          overrides an engine limit.
        </p>
      </section>
    </div>
  );
}
