"use client";

// =============================================================================
// Bank settlements — REAL engine records (float sweeps with journals). The old
// page rendered a hard-coded two-row array; now every row is a settlement that
// actually happened through the engine.
// =============================================================================

import React from "react";
import Link from "next/link";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  statusTone,
  AgentFreshnessBar,
  AgentEmptyState,
} from "@/components/agent/ui/AgentUi";
import { Landmark, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/money";

export default function AgentSettlementPage() {
  const { phase, errorMessage, summary, refresh, refreshedAt } = useAgentPortal();

  if (phase === "loading") return <AgentPageSkeleton rows={4} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your settlements" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const settlements = summary.settlements;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Bank Settlements"
        subtitle="Commercial settlement batches to your Providus Bank account — sourced from the engine's real sweep records."
        actions={
          <Link
            href="/agent/liquidity"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Sweep float
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void refresh({ silent: true })} />

      {settlements.length === 0 ? (
        <AgentEmptyState
          icon={<Landmark aria-hidden="true" className="h-6 w-6" />}
          title="No settlements yet"
          body="When you sweep your float from the Liquidity page, the engine posts a double-entry journal and this page records the settlement with its real reference."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  <th className="p-3.5">Settlement</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Gross</th>
                  <th className="p-3.5">Destination</th>
                  <th className="p-3.5">Reference</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {settlements.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-stone-50">
                    <td className="p-3.5 font-bold text-stone-900">
                      {s.kind === "FLOAT_SWEEP" ? "Float sweep" : "Commission payout"}
                    </td>
                    <td className="p-3.5 text-stone-600">{new Date(s.requestedAt).toLocaleDateString("en-GB")}</td>
                    <td className="p-3.5 font-bold text-emerald-700">{formatMoney(s.amount, "NGN")}</td>
                    <td className="p-3.5 text-stone-600">
                      {s.destinationBank}
                      <span className="block font-mono text-[10px] text-stone-400">{s.destinationAccountMasked}</span>
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-stone-500">{s.reference}</td>
                    <td className="p-3.5">
                      <AgentChip label={s.status} tone={statusTone(s.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        Settlement rows are derived from executed engine journals — a row can only exist if the sweep transaction was recorded on
        the ledger ({settlements.length} journal-backed settlement{settlements.length === 1 ? "" : "s"}).
      </p>
    </div>
  );
}
