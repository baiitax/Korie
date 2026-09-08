"use client";

// =============================================================================
// Bills & top-ups — cash-at-the-till bill payment. Catalog truth (billers,
// service charges, ranges) comes from BillerServiceEngine seeds; payments are
// engine-journaled with fee split and idempotency keys. History rows are the
// same operation stream shown on Transactions/Commissions.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { getPortalBearer } from "@/lib/customerPortalClient";
import { AgentBiller, AgentBillerCategory } from "@/types/agentProducts";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  AgentFreshnessBar,
  AgentModal,
} from "@/components/agent/ui/AgentUi";
import { Receipt, Zap, Tv, Globe, Droplets, Wifi, Smartphone, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { AgentPortalOperationType } from "@/types/agentPortal";

function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

function shortRef(ref: string): string {
  return ref.length > 26 ? `${ref.slice(0, 24)}…` : ref;
}

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { Authorization: getPortalBearer(), "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, message: (payload as any)?.error?.message || `Request failed (${res.status})` };
    return { ok: true, data: (payload as any)?.data as T };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Network error" };
  }
}

interface Catalog {
  categories: AgentBillerCategory[];
  billers: AgentBiller[];
  payments: AgentPortalOperationType[];
}

const CATEGORY_META: Record<AgentBillerCategory, { label: string; icon: React.ReactNode }> = {
  AIRTIME: { label: "Airtime", icon: <Smartphone className="h-3.5 w-3.5" aria-hidden="true" /> },
  DATA: { label: "Data", icon: <Wifi className="h-3.5 w-3.5" aria-hidden="true" /> },
  ELECTRICITY: { label: "Electricity", icon: <Zap className="h-3.5 w-3.5" aria-hidden="true" /> },
  CABLE_TV: { label: "Cable TV", icon: <Tv className="h-3.5 w-3.5" aria-hidden="true" /> },
  INTERNET: { label: "Internet", icon: <Globe className="h-3.5 w-3.5" aria-hidden="true" /> },
  WATER: { label: "Water", icon: <Droplets className="h-3.5 w-3.5" aria-hidden="true" /> },
};

export default function AgentBillsPage() {
  const { openReceipt } = useAgentPortal();
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<AgentBillerCategory | "ALL">("ALL");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  // payment modal state
  const [payingFor, setPayingFor] = useState<AgentBiller | null>(null);
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setPhase("loading");
    const res = await api<Catalog>("/api/agent/billers");
    if (!res.ok || !res.data) {
      setError(res.message || "Could not load the biller catalog.");
      setPhase("error");
      return;
    }
    setCatalog(res.data);
    setRefreshedAt(new Date().toISOString());
    setPhase("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase === "loading" && !catalog) return <AgentPageSkeleton rows={3} />;
  if (phase === "error" && !catalog) {
    return <AgentErrorState title="We could not load the biller catalog" message={error} onRetry={() => void load()} />;
  }
  if (!catalog) return null;

  const billers = (category === "ALL" ? catalog.billers : catalog.billers.filter((b) => b.category === category)).slice(0, 12);

  const submitPayment = async () => {
    if (!payingFor) return;
    setNotice(null);
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setNotice({ ok: false, message: "Enter a valid amount in naira." });
      return;
    }
    setBusy(true);
    const idempotencyKey = `agent-bill-${payingFor.billerId}-${Date.now()}`;
    const res = await api("/api/agent/billers", {
      method: "POST",
      body: JSON.stringify({
        billerId: payingFor.billerId,
        amount: Math.round(amountNum),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        idempotencyKey,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const total = Math.round(amountNum) + payingFor.serviceChargeNgn;
      setNotice({
        ok: true,
        message: `Paid — ${payingFor.name} ₦${Math.round(amountNum).toLocaleString()} + ₦${payingFor.serviceChargeNgn} charge (total ₦${total.toLocaleString()}). Journal posted; biller settlement accrued.`,
      });
      setPayingFor(null);
      setAmount("");
      setCustomerName("");
      setCustomerPhone("");
      await load(true);
    } else {
      setNotice({ ok: false, message: res.message || "The payment failed." });
    }
  };

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Bills & Top-ups"
        subtitle="Airtime, data, electricity, cable, internet and water — customer pays cash at the till; the engine journals principal to biller settlements and splits the service charge."
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void load(true)} />

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-semibold ${
            notice.ok ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
          }`}
        >
          {notice.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      ) : null}

      {/* Category rail */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("ALL")}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
            category === "ALL" ? "bg-emerald-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
          }`}
        >
          All ({catalog.billers.length})
        </button>
        {catalog.categories.map((c) => {
          const count = catalog.billers.filter((b) => b.category === c).length;
          const meta = CATEGORY_META[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                category === c ? "bg-emerald-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {meta.icon}
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Biller grid */}
      <section aria-label="Billers" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {billers.map((b) => (
          <div key={b.billerId} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-bold text-stone-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  {CATEGORY_META[b.category].icon}
                </span>
                {b.name}
              </p>
              <AgentChip label={b.category.replace("_", " ")} tone="sky" />
            </div>
            <p className="mt-2 text-[11px] text-stone-500">
              Range {naira(b.minAmountNgn)} – {naira(b.maxAmountNgn)} · service charge {naira(b.serviceChargeNgn)}
            </p>
            <div className="mt-3 flex flex-1 flex-wrap gap-1.5">
              {(b.denominationsNgn || []).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setPayingFor(b);
                    setAmount(String(d));
                  }}
                  className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-semibold text-stone-600 hover:border-emerald-300 hover:text-emerald-700"
                >
                  {naira(d)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setPayingFor(b);
                setAmount("");
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              <Receipt className="h-3.5 w-3.5" aria-hidden="true" /> Pay {b.name}
            </button>
          </div>
        ))}
      </section>

      {/* History */}
      <section aria-labelledby="bills-history" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 id="bills-history" className="text-sm font-bold text-stone-900">
            Payments today &amp; recent
          </h2>
          <p className="text-[11px] text-stone-400">{catalog.payments.length} recent rows from the operation stream</p>
        </div>
        {catalog.payments.length === 0 ? (
          <p className="mt-4 text-xs text-stone-400">No bill payments recorded yet — they will appear here with their ledger journal references.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl ring-1 ring-stone-100">
            {catalog.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 bg-stone-50/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-800">
                    {p.title} {p.customerName ? `· ${p.customerName}` : ""}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-stone-400">
                    {p.reference} · {p.createdAt.slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-right text-[11px] text-stone-500">
                    <span className="font-bold text-stone-800">{naira(p.amount)}</span>
                    {p.customerFee > 0 ? <span className="ml-1">+ {naira(p.customerFee)} fee</span> : null}
                  </p>
                  <AgentChip label={p.status} tone={p.status === "SUCCESSFUL" ? "green" : "neutral"} />
                  {p.createdAt.slice(0, 10) === todayKey ? <AgentChip label="today" tone="sky" /> : null}
                  <button
                    type="button"
                    onClick={() => openReceipt(p)}
                    className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[10px] font-bold text-stone-600 hover:bg-stone-50"
                  >
                    Receipt
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payment modal */}
      <AgentModal open={payingFor !== null} onClose={() => setPayingFor(null)} labelledBy="pay-bill-title">
        {payingFor ? (
          <div>
            <h3 id="pay-bill-title" className="text-base font-bold text-stone-900">
              Pay {payingFor.name}
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Range {naira(payingFor.minAmountNgn)} – {naira(payingFor.maxAmountNgn)} · service charge {naira(payingFor.serviceChargeNgn)}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Amount (₦)</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Customer name (optional)</span>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Bola Adeyemi"
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Phone (optional)</span>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="+234…"
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>
              {amount ? (
                <p className="rounded-lg bg-stone-50 px-3 py-2 text-[11px] text-stone-600 ring-1 ring-stone-100">
                  Customer pays{" "}
                  <span className="font-bold text-stone-800">
                    {naira((Number(amount) || 0) + payingFor.serviceChargeNgn)}
                  </span>{" "}
                  cash at the till (principal {naira(Number(amount) || 0)} + charge {naira(payingFor.serviceChargeNgn)}).
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPayingFor(null)}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitPayment()}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
                  {busy ? "Posting journal…" : `Collect & pay ${naira((Number(amount) || 0) + payingFor.serviceChargeNgn)}`}
                </button>
              </div>
              <p className="text-[10px] text-stone-400">
                Idempotent key per payment; journal = cash in transit → biller settlements payable + fee split (agency 60/40 engine rule).
              </p>
            </div>
          </div>
        ) : null}
      </AgentModal>
    </div>
  );
}
