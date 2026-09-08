"use client";

// =============================================================================
// Float & liquidity — engine truth: AGENT_FLOAT subledger + till position.
// "Sweep float" posts a real double-entry journal (no canned messages).
// =============================================================================

import React, { useState } from "react";
import Link from "next/link";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentStatCard,
  AgentChip,
  AgentFreshnessBar,
} from "@/components/agent/ui/AgentUi";
import { Copy, Check, RefreshCw, AlertTriangle, CheckCircle2, Landmark, Wallet, Banknote } from "lucide-react";
import { formatMoney } from "@/lib/money";

export default function AgentLiquidityPage() {
  const { phase, errorMessage, summary, refresh, refreshedAt, sweepFloat, isBalanceHidden } = useAgentPortal();
  const [sweeping, setSweeping] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (phase === "loading") return <AgentPageSkeleton rows={4} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your liquidity" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const { float, till } = summary;
  const hide = isBalanceHidden;

  const handleSweep = async () => {
    setSweeping(true);
    setNotice(null);
    const res = await sweepFloat();
    setSweeping(false);
    setNotice(
      res.success
        ? { ok: true, message: `Float of ${formatMoney(float.availableFloat, "NGN")} swept to Providus Bank — journal recorded.` }
        : { ok: false, message: res.message || "Sweep failed." },
    );
  };

  const copyNuban = async () => {
    try {
      await navigator.clipboard.writeText("0123984123");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const lowCash = till.availablePhysicalCash < till.targetSafetyBuffer;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Float & Liquidity"
        subtitle="Digital e-float, physical till cash and their engine-level movements — every change is journaled."
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void refresh({ silent: true })} />

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ring-1 ${
            notice.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"
          }`}
        >
          {notice.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          {notice.message}
        </div>
      ) : null}

      {/* Posture */}
      <section aria-label="Liquidity position" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AgentStatCard
          label="Digital wallet float"
          value={hide ? "••••••" : formatMoney(float.availableFloat, "NGN")}
          sub="Agent float subledger · Providus clearing rail"
          accent="emerald"
          icon={<Wallet className="h-4 w-4 text-emerald-500" />}
        />
        <AgentStatCard
          label="Physical cash in till"
          value={hide ? "••••••" : formatMoney(till.availablePhysicalCash, "NGN")}
          sub={`Expected ${formatMoney(till.expectedPhysicalCash, "NGN")} · ${till.locationName}`}
          accent={lowCash ? "amber" : "neutral"}
          icon={<Banknote className="h-4 w-4 text-amber-500" />}
        />
        <AgentStatCard
          label="Safety buffer"
          value={hide ? "••••••" : formatMoney(till.targetSafetyBuffer, "NGN")}
          sub={<AgentChip label={till.liquidityStatus} tone={lowCash ? "amber" : "green"} />}
          accent={lowCash ? "rose" : "neutral"}
        />
      </section>

      {/* Sweep + top-up */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="sweep-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-stone-400" aria-hidden="true" />
            <h2 id="sweep-title" className="text-sm font-bold text-stone-900">
              Sweep float to settlement
            </h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Moves the full digital float to your Providus settlement account as a real double-entry journal
            (float liability debit → clearing pool credit). Nothing here is simulated.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSweep()}
              disabled={sweeping || float.availableFloat <= 0}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${sweeping ? "animate-spin" : ""}`} aria-hidden="true" />
              {sweeping ? "Sweeping…" : `Sweep ${hide ? "" : formatMoney(float.availableFloat, "NGN")}`}
            </button>
            {summary.settlements.length > 0 ? (
              <span className="text-[11px] text-stone-400">
                Last sweep {new Date(summary.settlements[0].requestedAt).toLocaleDateString("en-GB")} ·{" "}
                {formatMoney(summary.settlements[0].amount, "NGN")}
              </span>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="topup-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <h2 id="topup-title" className="text-sm font-bold text-stone-900">
              Dedicated float top-up account
            </h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Transfer from any Nigerian bank to instantly top up your agency wallet float.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-stone-50 p-4 ring-1 ring-stone-100">
            <div>
              <p className="text-[11px] text-stone-400">Providus Bank (Agent Float)</p>
              <p className="font-mono text-lg font-bold text-stone-900">0123984123</p>
              <p className="text-[11px] text-stone-500">KoriePay / {summary.agent.tradingName}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <AgentChip label="Real-time credit" tone="green" />
              <button
                type="button"
                onClick={() => void copyNuban()}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 shadow-sm hover:bg-stone-100"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Settlement history */}
      <section aria-labelledby="settlement-history-title">
        <h2 id="settlement-history-title" className="text-sm font-bold text-stone-900">
          Settlement history
        </h2>
        {summary.settlements.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-xs text-stone-500">
            No sweeps yet — the sweep button above posts the first one with a real journal.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {summary.settlements.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                <span className="font-mono text-sm font-bold text-stone-900">{formatMoney(s.amount, "NGN")}</span>
                <AgentChip label={s.status} tone="green" />
                <span className="text-xs text-stone-500">
                  {s.destinationBank} ({s.destinationAccountMasked})
                </span>
                <span className="ml-auto font-mono text-[10px] text-stone-400">{s.reference}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4">
          <Link href="/agent/settlement" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
            View full settlement page →
          </Link>
        </p>
      </section>
    </div>
  );
}
