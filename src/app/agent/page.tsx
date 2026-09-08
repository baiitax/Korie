"use client";

// =============================================================================
// Agent dashboard — engine truth (portal summary), light customer design.
// All figures come from /api/agent/portal; nothing is client-side fiction.
// =============================================================================

import React, { useState } from "react";
import Link from "next/link";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageSkeleton,
  AgentErrorState,
  AgentStatCard,
  AgentChip,
  statusTone,
} from "@/components/agent/ui/AgentUi";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Users,
  Wallet,
  Banknote,
  Copy,
  Check,
  ChevronRight,
  Activity,
  Landmark,
  AlertTriangle,
  BadgePercent,
} from "lucide-react";
import { formatMoney } from "@/lib/money";

export default function AgentDashboardPage() {
  const { phase, errorMessage, summary, refresh, openReceipt, isBalanceHidden, sweepFloat } = useAgentPortal();
  const [copied, setCopied] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"ok" | "err">("ok");

  if (phase === "loading") return <AgentPageSkeleton rows={4} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your agency portal" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const { agent, float, till, kpis, terminal, recentOperations, alerts, customers } = summary;

  const showNotice = (msg: string, tone: "ok" | "err" = "ok") => {
    setNotice(msg);
    setNoticeTone(tone);
    window.setTimeout(() => setNotice(null), 6000);
  };

  const copyNuban = async () => {
    try {
      await navigator.clipboard.writeText("0123984123");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showNotice("Could not copy automatically — NUBAN: 0123984123", "err");
    }
  };

  const handleSweep = async () => {
    setSweeping(true);
    const res = await sweepFloat();
    setSweeping(false);
    if (res.success) showNotice(`Float swept to settlement bank (${formatMoney(summary.float.availableFloat, "NGN")} released).`);
    else showNotice(res.message || "Sweep failed.", "err");
  };

  const hide = isBalanceHidden;

  const quickActions = [
    { label: "Cash In", href: "/agent/cash-in", icon: ArrowDownLeft, tone: "text-emerald-600 bg-emerald-50 ring-emerald-200" },
    { label: "Cash Out", href: "/agent/cash-out", icon: ArrowUpRight, tone: "text-amber-600 bg-amber-50 ring-amber-200" },
    { label: "Send Transfer", href: "/agent/transfer", icon: ArrowRightLeft, tone: "text-sky-600 bg-sky-50 ring-sky-200" },
    { label: "Customers", href: "/agent/customers", icon: Users, tone: "text-violet-600 bg-violet-50 ring-violet-200" },
  ];

  return (
    <main className="space-y-6">
      {/* 1. Greeting */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">
            Agency Banking Operating System
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Welcome back, {agent.tradingName.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            {agent.tradingName} · {agent.lgaOrDistrict}, {agent.stateOrProvince}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AgentChip label={`${agent.agentCode} · ${agent.tier}`} tone="sky" />
          <AgentChip label={`Terminal ${terminal.terminalId}`} tone={terminal.status === "ACTIVE" ? "green" : "amber"} />
        </div>
      </div>

      {/* notice */}
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ring-1 ${
            noticeTone === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-rose-200"
          }`}
        >
          {noticeTone === "ok" ? <Check className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
          {notice}
        </div>
      ) : null}

      {/* 2. Liquidity hero */}
      <section
        aria-label="Liquidity overview"
        className="grid grid-cols-1 gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <h2 className="text-sm font-bold text-stone-900">Float & liquidity</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Digital float</p>
              <p className="mt-0.5 text-xl font-bold text-stone-900 sm:text-2xl">
                {hide ? "••••••" : formatMoney(float.availableFloat, "NGN")}
              </p>
              <p className="text-[11px] text-stone-400">Providus clearing rail</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Cash in till</p>
              <p className="mt-0.5 text-xl font-bold text-stone-900 sm:text-2xl">
                {hide ? "••••••" : formatMoney(till.availablePhysicalCash, "NGN")}
              </p>
              <p className="text-[11px] text-stone-400">
                Buffer {formatMoney(till.targetSafetyBuffer, "NGN")} ·{" "}
                <span className={till.liquidityStatus === "HEALTHY" ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                  {till.liquidityStatus}
                </span>
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">E-float account</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-stone-900">0123 984 123</p>
              <p className="text-[11px] text-stone-400">Providus Bank · top up instantly</p>
              <button
                type="button"
                onClick={() => void copyNuban()}
                className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-600 shadow-sm transition hover:bg-stone-50"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy NUBAN"}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-100">
          <div className="flex items-start gap-2">
            <Landmark className="mt-0.5 h-4 w-4 text-stone-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-stone-800">Sweep float to settlement</p>
              <p className="mt-0.5 text-[11px] text-stone-500">
                Moves the full e-float to your Providus settlement account with a real ledger journal.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={sweeping || float.availableFloat <= 0}
            onClick={() => void handleSweep()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {sweeping ? "Sweeping…" : `Sweep ${hide ? "" : formatMoney(float.availableFloat, "NGN")}`}
          </button>
          <Link
            href="/agent/liquidity"
            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Float & liquidity center <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 3. KPIs */}
      <section aria-label="Today's performance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AgentStatCard
          label="Today's transactions"
          value={kpis.todayTransactionCount}
          sub={`${kpis.successRatePercent}% success rate`}
          accent={kpis.todayTransactionCount > 0 ? "emerald" : "neutral"}
        />
        <AgentStatCard
          label="Today's volume"
          value={hide ? "••••••" : formatMoney(kpis.todayVolume, "NGN")}
          sub="Cash in + out + transfers"
          accent="neutral"
        />
        <AgentStatCard
          label="Today's commission"
          value={hide ? "••••••" : formatMoney(kpis.todayCommissionEarned, "NGN")}
          sub={`${kpis.todayFeeRevenue.toLocaleString()} in customer fees collected`}
          accent="amber"
          icon={<BadgePercent className="h-4 w-4 text-amber-500" />}
        />
        <AgentStatCard
          label="Daily limit remaining"
          value={hide ? "••••••" : formatMoney(Math.max(0, agent.dailyTransactionLimit - kpis.todayVolume), "NGN")}
          sub={`Limit ${formatMoney(agent.dailyTransactionLimit, "NGN")}`}
          accent={kpis.todayVolume > agent.dailyTransactionLimit * 0.8 ? "rose" : "neutral"}
        />
      </section>

      {/* 4. Quick actions */}
      <section aria-label="Quick operations" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${a.tone}`}>
              <a.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-stone-800">{a.label}</span>
            <ChevronRight className="ml-auto h-4 w-4 text-stone-300" aria-hidden="true" />
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 5. Recent operations */}
        <section aria-labelledby="recent-heading" className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 id="recent-heading" className="flex items-center gap-2 text-sm font-bold text-stone-900">
              <Activity className="h-4 w-4 text-stone-400" aria-hidden="true" />
              Recent operations
            </h2>
            <Link href="/agent/transactions" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentOperations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-xs text-stone-500">
                No operations yet today. Run your first cash-in, cash-out or transfer to see live ledger-backed records here.
              </p>
            ) : (
              recentOperations.slice(0, 6).map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => openReceipt(op)}
                  className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${
                      op.type === "CASH_IN"
                        ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
                        : op.type === "CASH_OUT"
                          ? "bg-amber-50 text-amber-600 ring-amber-200"
                          : "bg-sky-50 text-sky-600 ring-sky-200"
                    }`}
                  >
                    {op.type === "CASH_IN" ? (
                      <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                    ) : op.type === "CASH_OUT" ? (
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-stone-800">
                      {op.customerName || "Walk-in customer"}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-stone-400">{op.reference}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-bold text-stone-900">
                      {isBalanceHidden ? "••••" : formatMoney(op.amount, op.currency)}
                    </span>
                    <span className="block text-[10px] font-semibold text-emerald-600">
                      +{formatMoney(op.agentCommission || 0, op.currency)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* 6. Alerts */}
        <section aria-labelledby="alerts-heading">
          <div className="flex items-center justify-between">
            <h2 id="alerts-heading" className="text-sm font-bold text-stone-900">
              Needs attention
            </h2>
            <AgentChip label={`${alerts.length} open`} tone={alerts.length > 0 ? "amber" : "green"} />
          </div>
          <div className="mt-3 space-y-2">
            {alerts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-xs text-stone-500">
                All clear — no watch items right now.
              </p>
            ) : (
              alerts.slice(0, 5).map((a) => (
                <div key={a.id} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${a.severity === "HIGH" ? "text-rose-500" : "text-amber-500"}`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-bold text-stone-800">{a.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">{a.description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-stone-800">Frequent customers</p>
              <p className="mt-0.5 text-[11px] text-stone-500">
                {customers.length > 0
                  ? `${customers.length} saved ${customers.length === 1 ? "customer" : "customers"} — open Customers to serve them in one tap.`
                  : "Serve your first customer to build a frequent-customer list."}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* 7. Till health strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <Banknote className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        <p className="text-xs text-stone-600">
          <span className="font-bold text-stone-900">{till.locationName}</span> — expected{" "}
          {hide ? "••••" : formatMoney(till.expectedPhysicalCash, "NGN")} · counted{" "}
          {hide ? "••••" : formatMoney(till.availablePhysicalCash, "NGN")} · last counted{" "}
          {new Date(till.lastCountedAt).toLocaleDateString("en-GB")}
        </p>
        <Link href="/agent/reconciliation" className="ml-auto text-xs font-semibold text-emerald-700 hover:text-emerald-800">
          Reconcile cash
        </Link>
      </div>
    </main>
  );
}
