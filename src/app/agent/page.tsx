"use client";

import React from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import AgentLiquidityCard from "@/components/agent/ui/AgentLiquidityCard";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Activity,
  Users,
} from "lucide-react";

export default function AgentDashboardPage() {
  const { agent, liquidity, transactions, customers, openReceipt, t } = useAgent();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Greeting & Terminal Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
            {t("common.portalName")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            {t("common.welcome")}, {agent.agentName} 🏪
          </h1>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
            {agent.businessName} • {agent.cityOrLGA}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Providus Bank Rail 🇳🇬</span>
          </span>
        </div>
      </div>

      {/* 2. Primary Float & Liquidity Hero */}
      <AgentLiquidityCard />

      {/* 3. Performance Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1 shadow-[var(--shadow-sm)]">
          <div className="text-[10px] uppercase text-[var(--foreground-muted)]">Today&apos;s Transactions</div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">{transactions.length}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">● 100% Success</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1 shadow-[var(--shadow-sm)]">
          <div className="text-[10px] uppercase text-[var(--foreground-muted)]">Today&apos;s Volume</div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">
            ₦{(liquidity.todayCashInVolume + liquidity.todayCashOutVolume).toLocaleString()}
          </div>
          <div className="text-[10px] text-[var(--foreground-muted)]">Cash In + Out</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1 shadow-[var(--shadow-sm)]">
          <div className="text-[10px] uppercase text-[var(--foreground-muted)]">{t("common.commissionEarned")}</div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            ₦{agent.commissionBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Available to Settle</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1 shadow-[var(--shadow-sm)]">
          <div className="text-[10px] uppercase text-[var(--foreground-muted)]">Daily Cash Limit</div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">
            ₦{(agent.dailyCashLimit - agent.dailyCashSpent).toLocaleString()}
          </div>
          <div className="text-[10px] text-[var(--foreground-muted)]">Remaining Today</div>
        </div>
      </div>

      {/* 4. Fast Customer Lookup & Verification */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-[var(--foreground)] uppercase font-mono tracking-wider">
              Frequent Customers
            </h2>
          </div>
          <Link href="/agent/customers" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
            View All Customers
          </Link>
        </div>

        {/* Customer Mini Cards */}
        {customers.length === 0 ? (
          <p className="text-xs text-[var(--foreground-muted)] text-center py-4">
            No customers yet — your directory fills in automatically after your first cash-in or cash-out.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customers.slice(0, 4).map((cust) => (
              <div
                key={cust.id}
                className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-2 hover:border-amber-500/40 transition-all"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[var(--foreground)] truncate flex items-center gap-1.5">
                    <span>{cust.fullName}</span>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ● {cust.kycTier}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--foreground-muted)] font-mono mt-0.5 truncate">
                    {cust.bankName} • {cust.accountNumberMasked}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/agent/cash-in?account=${cust.accountNumberMasked}&name=${encodeURIComponent(cust.fullName)}`}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] hover:bg-emerald-500/25 transition-colors"
                  >
                    Cash In
                  </Link>
                  <Link
                    href={`/agent/cash-out?account=${cust.accountNumberMasked}&name=${encodeURIComponent(cust.fullName)}`}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px] hover:bg-amber-500/25 transition-colors"
                  >
                    Cash Out
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Recent Agency Transactions Stream */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-[var(--foreground)]">{t("common.recentActivity")}</h2>
          </div>
          <Link
            href="/agent/transactions"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:opacity-80 flex items-center gap-1"
          >
            <span>View Full History</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-[var(--foreground-muted)] text-center py-6">
            No transactions yet today — your activity stream fills in automatically after your first cash-in or cash-out.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {transactions.map((tx) => {
              const isCashIn = tx.type === "CASH_IN";
              return (
                <div
                  key={tx.id}
                  onClick={() => openReceipt(tx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openReceipt(tx);
                  }}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-2)] -mx-2 px-2 rounded-2xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isCashIn
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {isCashIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[var(--foreground)] truncate flex items-center gap-1.5">
                        <span className="truncate">{tx.title}</span>
                        {tx.status === "PENDING_PROVIDER_INTEGRATION" && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            Pending
                          </span>
                        )}
                        {(tx.status === "FAILED" || tx.status === "REVERSED") && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                            {tx.status}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--foreground-muted)] truncate flex items-center gap-2 mt-0.5">
                        <span>{tx.customerName}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">{tx.reference}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-extrabold font-mono text-[var(--foreground)]">
                      ₦{tx.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      +₦{tx.agentCommission} Commission
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
