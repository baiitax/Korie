"use client";

// =============================================================================
// Commissions — engine-derived. The old page hard-coded a commission
// breakdown (₦18,500/₦14,200… and a fake "₦184,200 weekly"). This page
// computes every number from the engine-recorded operations: per-service
// commission, fees, counts — nothing fabricated.
// =============================================================================

import React, { useMemo } from "react";
import Link from "next/link";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentStatCard,
  AgentFreshnessBar,
  AgentEmptyState,
  AgentChip,
} from "@/components/agent/ui/AgentUi";
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, BadgePercent, Info } from "lucide-react";
import { formatMoney } from "@/lib/money";

const SERVICE_META: Record<string, { label: string; tone: string; icon: React.ReactNode }> = {
  CASH_IN: {
    label: "Cash-In (deposits)",
    tone: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    icon: <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />,
  },
  CASH_OUT: {
    label: "Cash-Out (withdrawals)",
    tone: "bg-amber-50 text-amber-600 ring-amber-200",
    icon: <ArrowUpRight className="h-4 w-4" aria-hidden="true" />,
  },
  TRANSFER_NIP: {
    label: "Bank transfers (NIP)",
    tone: "bg-sky-50 text-sky-600 ring-sky-200",
    icon: <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />,
  },
};

export default function AgentCommissionsPage() {
  const { phase, errorMessage, summary, refresh, refreshedAt, isBalanceHidden } = useAgentPortal();

  const breakdown = useMemo(() => {
    const map = new Map<string, { commission: number; fees: number; count: number }>();
    for (const op of summary?.recentOperations || []) {
      const row = map.get(op.type) || { commission: 0, fees: 0, count: 0 };
      row.commission += op.agentCommission || 0;
      row.fees += op.customerFee || 0;
      row.count += 1;
      map.set(op.type, row);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].commission - a[1].commission);
  }, [summary]);

  if (phase === "loading") return <AgentPageSkeleton rows={4} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your commissions" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const hide = isBalanceHidden;
  const kpis = summary.kpis;
  const totalAvailable = summary.availableCommission;
  const registry24h = summary.agent.commissionEarned24h;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Commissions"
        subtitle="Every naira below is computed from engine-recorded operations — fee split per RULE_AGENCY_COMMISSION_60_40_SPLIT."
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void refresh({ silent: true })} />

      <section aria-label="Commission summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AgentStatCard
          label="Accrued commission (today)"
          value={hide ? "••••••" : formatMoney(kpis.todayCommissionEarned, "NGN")}
          sub={`${kpis.todayTransactionCount} operations today`}
          accent="emerald"
          icon={<BadgePercent className="h-4 w-4 text-emerald-500" />}
        />
        <AgentStatCard
          label="Customer fees collected"
          value={hide ? "••••••" : formatMoney(kpis.todayFeeRevenue, "NGN")}
          sub="60% agent share accrues to you"
          accent="neutral"
        />
        <AgentStatCard
          label="24h registry earnings"
          value={hide ? "••••••" : formatMoney(registry24h, "NGN")}
          sub="Agent registry quality metric"
          accent="amber"
        />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-stone-900">Service breakdown (engine truth)</h2>
          <AgentChip label={`${totalAvailable > 0 ? "Settles with daily sweep" : "No accruals yet"}`} tone={totalAvailable > 0 ? "amber" : "neutral"} />
        </div>
        {breakdown.length === 0 ? (
          <AgentEmptyState
            icon={<BadgePercent aria-hidden="true" className="h-6 w-6" />}
            title="No commissions recorded yet"
            body="Run cash-in, cash-out or transfer operations — their fee splits are recorded on the ledger and this breakdown fills in from those records."
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {breakdown.map(([type, row]) => {
              const meta = SERVICE_META[type];
              if (!meta) return null;
              return (
                <li key={type} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${meta.tone}`}>{meta.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-stone-800">{meta.label}</p>
                    <p className="text-[11px] text-stone-400">
                      {row.count} op{row.count === 1 ? "" : "s"} · ₦{row.fees.toLocaleString()} customer fees
                    </p>
                  </div>
                  <p className="font-mono text-base font-bold text-emerald-700">
                    {hide ? "••••" : formatMoney(row.commission, "NGN")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {totalAvailable > 0 ? (
          <p className="mt-4 text-[11px] leading-relaxed text-stone-500">
            Accrued commission is remitted with your float sweep to the Providus settlement account. Keep operations flowing —
            commissions land here the moment an operation is journaled.
          </p>
        ) : null}
      </section>

      <div className="flex items-start gap-2 rounded-xl bg-sky-50 p-4 text-xs leading-relaxed text-sky-800 ring-1 ring-sky-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Numbers that appear on other agent screens (e.g. “weekly ₦184,200” on the old page) were hard-coded and have been
          removed. This page shows only amounts that can be traced to an engine journal.{" "}
          <Link href="/agent/transactions" className="font-bold underline">
            View the operations behind them →
          </Link>
        </p>
      </div>
    </div>
  );
}
