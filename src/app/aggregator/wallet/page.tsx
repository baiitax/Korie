"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function AggregatorWalletPage() {
  const {
    aggregator,
    formatCurrency,
    formatDate,
    openLiquidityModal,
    isBalanceHidden,
    runSettlement,
    t,
  } = useAggregator();

  const [payoutSuccess, setPayoutSuccess] = useState<{ batchReference?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const mask = (val: string) => (isBalanceHidden ? "••••••••" : val);

  // Real settlement run — the same run_daily_settlement() RPC agency ops
  // uses. It sums every EARNED agent commission not yet in a batch for
  // today, posts a real settlement batch + ledger entries, and returns the
  // batch reference. There is no client-supplied "amount": the server
  // determines the payable total from actual earned commissions, never a
  // client-entered figure.
  const handleRunSettlement = async () => {
    setIsProcessing(true);
    setPayoutError(null);
    setPayoutSuccess(null);
    const result = await runSettlement(aggregator.currency);
    setIsProcessing(false);
    if (result.success) {
      setPayoutSuccess({ batchReference: result.batchReference });
    } else {
      setPayoutError(result.error || "Could not run settlement.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Aggregator Settlement & Operational Wallet</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Supervise liquidity reserves, escrow balances, and trigger on-demand commission payouts to Providus Bank Nigeria
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Balances and Allocations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase text-amber-600 dark:text-amber-400 font-bold">
                  Aggregator Total Main Float
                </div>
                <div className="text-3xl sm:text-4xl font-black text-[var(--foreground)] font-mono mt-1">
                  {mask(formatCurrency(aggregator.walletBalance))}
                </div>
              </div>

              <div className="p-3 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] space-y-0.5 text-xs">
                <div className="text-[var(--foreground-muted)] font-mono">Linked Corporate Settlement:</div>
                <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{aggregator.settlementBank} • {aggregator.settlementAccountMasked}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--border)] text-xs">
              <div className="p-3 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
                <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Available for Injection</div>
                <div className="text-base font-bold font-mono text-teal-600 dark:text-teal-300 mt-1">
                  {mask(formatCurrency(aggregator.availableLiquidity))}
                </div>
              </div>
              <div className="p-3 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
                <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Network Escrow Hold</div>
                <div className="text-base font-bold font-mono text-[var(--foreground)] mt-1">
                  {mask(formatCurrency(aggregator.escrowBalance))}
                </div>
              </div>
              <div className="p-3 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
                <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Settled This Month</div>
                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {mask(formatCurrency(aggregator.settledCommissionsThisMonth))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-[var(--foreground)] text-base">Agency Float Distribution Desk</h3>
              <p className="text-xs text-[var(--foreground-muted)]">Inject liquidity directly into any underfunded agency cash point.</p>
            </div>
            <button
              onClick={() => openLiquidityModal()}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 whitespace-nowrap"
            >
              Dispatch Agent Float
            </button>
          </div>
        </div>

        {/* Right Col: Run Commission Settlement */}
        <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
          <div>
            <h3 className="font-bold text-[var(--foreground)] text-base">Run Commission Settlement</h3>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Settles every agent commission your network has earned but not yet batched today. The server computes
              the payable total from real earned commissions — you never enter an amount.
            </p>
          </div>

          {payoutSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <div className="font-bold text-[var(--foreground)] text-sm">Settlement Batch Posted</div>
              {payoutSuccess.batchReference && (
                <div className="text-xs text-[var(--foreground)] font-mono">Reference: {payoutSuccess.batchReference}</div>
              )}
              <div className="text-xs text-[var(--foreground-muted)]">
                View it under{" "}
                <a href="/aggregator/settlements" className="underline text-teal-600 dark:text-teal-400">
                  Settlements
                </a>
                .
              </div>
              <button
                onClick={() => setPayoutSuccess(null)}
                className="text-[11px] underline text-teal-600 dark:text-teal-400"
              >
                Run another
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-1 text-xs">
                <div className="flex justify-between text-[var(--foreground-muted)]">
                  <span>Currency:</span>
                  <span className="text-[var(--foreground)] font-mono">{aggregator.currency}</span>
                </div>
                <div className="flex justify-between text-[var(--foreground-muted)]">
                  <span>Destination:</span>
                  <span className="text-[var(--foreground)] font-mono">
                    {aggregator.settlementBank} • {aggregator.settlementAccountMasked}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--foreground-muted)]">
                  <span>Pending settlement (this month):</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {mask(formatCurrency(aggregator.pendingCommissions))}
                  </span>
                </div>
              </div>

              {payoutError && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{payoutError}</span>
                </div>
              )}

              <button
                onClick={handleRunSettlement}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>{isProcessing ? "Running settlement…" : "Run Today's Settlement"}</span>
              </button>
            </div>
          )}

          <div className="p-3 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] text-[11px] text-[var(--foreground-muted)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Idempotent per org/currency/day — running twice on the same day reuses the existing batch.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
