"use client";

// =============================================================================
// Services hub — one door to every product the agent serves. Availability,
// limits and today's volumes are projected by /api/agent/services from the
// product engines + the shared kiosk operation stream (never client state).
// =============================================================================

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getPortalBearer } from "@/lib/customerPortalClient";
import { AgentServicesOverview } from "@/types/agentProducts";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentStatCard,
  AgentFreshnessBar,
  AgentChip,
} from "@/components/agent/ui/AgentUi";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CreditCard,
  Landmark,
  Receipt,
  LayoutGrid,
  ShieldCheck,
  Zap,
} from "lucide-react";

function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

async function apiGet<T>(path: string): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(path, { headers: { Authorization: getPortalBearer(), Accept: "application/json" } });
    const payload = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, message: (payload as any)?.error?.message || `Request failed (${res.status})` };
    return { ok: true, data: (payload as any)?.data as T };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Network error" };
  }
}

const PILLAR_DEFS = [
  { product: "CASH_IN" as const, label: "Deposit", href: "/agent/cash-in", icon: ArrowDownLeft, desc: "Customer pays cash — credit their bank account or opened KoriePay account.", tone: "emerald" as const },
  { product: "CASH_OUT" as const, label: "Withdrawal", href: "/agent/cash-out", icon: ArrowUpRight, desc: "Till pays cash against e-float or the customer's opened account.", tone: "sky" as const },
  { product: "ACCOUNT_OPENING" as const, label: "Customer account opening", href: "/agent/accounts", icon: Wallet, desc: "Open a real KoriePay NGN account for an onboarded customer (number + wallet subledger).", tone: "emerald" as const },
  { product: "CARD_APPLICATION" as const, label: "ATM & cards", href: "/agent/cards", icon: CreditCard, desc: "Debit/ATM applications with issue fee and event-driven lifecycle.", tone: "neutral" as const },
  { product: "FX_CONVERSION" as const, label: "FX / BDC desk", href: "/agent/fx", icon: Landmark, desc: "NGN ↔ XOF corridor conversions at treasury engine rates.", tone: "amber" as const },
  { product: "BILL_PAYMENT" as const, label: "Bills & top-ups", href: "/agent/bills", icon: Receipt, desc: "Airtime, data, electricity, cable, internet and water at the till.", tone: "sky" as const },
];

export default function AgentServicesHubPage() {
  const { summary } = useAgentPortal();
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<AgentServicesOverview | null>(null);
  const [error, setError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const load = async (silent = false) => {
    if (!silent) setPhase("loading");
    const res = await apiGet<AgentServicesOverview>("/api/agent/services");
    if (!res.ok || !res.data) {
      setError(res.message || "Could not load the services overview.");
      setPhase("error");
      return;
    }
    setData(res.data);
    setRefreshedAt(new Date().toISOString());
    setPhase("ready");
  };

  useEffect(() => {
    void load();
  }, []);

  if (phase === "loading" && !data) return <AgentPageSkeleton rows={3} />;
  if (phase === "error" && !data) {
    return <AgentErrorState title="We could not load the services hub" message={error} onRetry={() => void load()} />;
  }
  if (!data) return null;

  const todayMap = new Map(data.today.map((k) => [k.product, k]));
  const float = summary?.float.availableFloat ?? 0;
  const till = summary?.till.availablePhysicalCash ?? 0;
  const floatLow = float < data.limits.singleTransactionNgn;
  const tillLow = till < 50_000;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Products & Services"
        subtitle="Everything an agent serves — deposits, withdrawals, account opening, ATM & cards, FX conversion and bills. Every figure below comes from the engines behind these services."
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void load(true)} />

      {/* Today's product volumes */}
      <section aria-label="Today across products" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {PILLAR_DEFS.map((p) => {
          const kpi = todayMap.get(p.product);
          return (
            <div key={p.product} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-500">
                  <p.icon className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
                  {p.label}
                </p>
                <AgentChip label={kpi ? `${kpi.todayCount} today` : "No activity today"} tone={kpi ? "green" : "neutral"} />
              </div>
              <p className="mt-1 text-xl font-bold text-stone-900">{kpi ? naira(kpi.todayVolume) : "—"}</p>
              <Link
                href={p.href}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
              >
                Open service →
              </Link>
            </div>
          );
        })}
      </section>

      {/* Engine guardrails */}
      <section aria-label="Live guardrails" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AgentStatCard
          label="Float available"
          value={naira(float)}
          sub={floatLow ? "Below the single-op limit — top up before heavy cash-out demand." : "Healthy for single-op limits"}
          accent={floatLow ? "amber" : "emerald"}
          icon={<Zap className="h-4 w-4" aria-hidden="true" />}
        />
        <AgentStatCard
          label="Physical till"
          value={naira(till)}
          sub={tillLow ? "Low till cash — reconcile and replenish." : "Till covers till-paid services"}
          accent={tillLow ? "rose" : "emerald"}
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        />
        <AgentStatCard
          label="Engine limits"
          value={naira(data.limits.singleTransactionNgn)}
          sub="single op · bills & FX cap at the same ceiling"
          icon={<LayoutGrid className="h-4 w-4" aria-hidden="true" />}
        />
      </section>

      {/* Product cards with live eligibility */}
      <section aria-label="Product catalogue" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PILLAR_DEFS.map((p) => {
          const kpi = todayMap.get(p.product);
          return (
            <Link
              key={p.product}
              href={p.href}
              className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                  <p.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {kpi ? <AgentChip label={`${kpi.todayCount} served`} tone="green" /> : null}
              </div>
              <h3 className="mt-3 text-sm font-bold text-stone-900 group-hover:text-emerald-800">{p.label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">{p.desc}</p>
            </Link>
          );
        })}
      </section>

      {/* Catalog + corridor truth strip */}
      <section aria-label="Catalog truth" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-stone-900">Catalog truth (engine config)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
            <p className="font-semibold uppercase tracking-wide text-stone-400">Billers live</p>
            <p className="mt-1 text-lg font-bold text-stone-800">{data.catalogs.activeBillers}</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
            <p className="font-semibold uppercase tracking-wide text-stone-400">Biller categories</p>
            <p className="mt-1 text-lg font-bold text-stone-800">{data.catalogs.billerCategories.length}</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
            <p className="font-semibold uppercase tracking-wide text-stone-400">Card products</p>
            <p className="mt-1 text-lg font-bold text-stone-800">{data.catalogs.activeCardProducts}</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
            <p className="font-semibold uppercase tracking-wide text-stone-400">Openable accounts</p>
            <p className="mt-1 text-lg font-bold text-stone-800">{data.catalogs.openableAccounts}</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
            <p className="font-semibold uppercase tracking-wide text-stone-400">NGN/XOF corridor</p>
            <p className="mt-1 text-lg font-bold text-stone-800">
              {data.catalogs.fxCorridor ? `${data.catalogs.fxCorridor.referenceRate.toFixed(4)} XOF/₦` : "—"}
            </p>
            <p className="text-[10px] text-stone-400">treasury engine reference</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
            <p className="font-semibold uppercase tracking-wide text-stone-400">USD/NGN market</p>
            <p className="mt-1 text-lg font-bold text-stone-800">
              {data.catalogs.usdCorridor ? `₦${data.catalogs.usdCorridor.referenceRate.toLocaleString()}` : "—"}
            </p>
            <p className="text-[10px] text-stone-400">reference · not till-tradeable</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-stone-400">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Money movements on every product post double-entry journals to the ledger; amounts on these pages trace to engine stores and journal rows — never to page constants.
        </p>
      </section>
    </div>
  );
}
