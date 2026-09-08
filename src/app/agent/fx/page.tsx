"use client";

// =============================================================================
// FX / BDC corridor desk — rate truth from the treasury FxPositionEngine,
// conversions journaled on the naira till (XOF leg settles on the corridor
// float — a documented seam). USD/NGN shows as a read-only market card: there
// is no USD till vault in this demo, so no fake USD trades are offered.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { getPortalBearer } from "@/lib/customerPortalClient";
import { AgentFxDirection, AgentFxOrder } from "@/types/agentProducts";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  AgentFreshnessBar,
} from "@/components/agent/ui/AgentUi";
import { Landmark, ArrowRightLeft, Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

function fmtXof(n: number): string {
  return `${n.toLocaleString()} XOF`;
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

interface Board {
  corridor: { pair: string; referenceRateXofPerNgn: number; status: string } | null;
  usdMarket: { pair: string; referenceRate: number; exposureBaseMinor: number; status: string } | null;
  orders: AgentFxOrder[];
  quote: {
    buyXof: { referenceRateXofPerNgn: number; referenceNairaPerXof: number; appliedNairaPerXof: number; ngnAmount: number; marginNgn: number } | null;
    sellXof: { referenceRateXofPerNgn: number; referenceNairaPerXof: number; appliedNairaPerXof: number; ngnAmount: number; marginNgn: number } | null;
  } | null;
}

export default function AgentFxPage() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const [direction, setDirection] = useState<AgentFxDirection>("BUY_XOF");
  const [xofAmount, setXofAmount] = useState("10000");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setPhase("loading");
    const res = await api<Board>("/api/agent/fx");
    if (!res.ok || !res.data) {
      setError(res.message || "Could not load the FX desk.");
      setPhase("error");
      return;
    }
    setBoard(res.data);
    setRefreshedAt(new Date().toISOString());
    setPhase("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase === "loading" && !board) return <AgentPageSkeleton rows={3} />;
  if (phase === "error" && !board) {
    return <AgentErrorState title="We could not load the FX desk" message={error} onRetry={() => void load()} />;
  }
  if (!board) return null;

  const corridor = board.corridor;
  const sampleQuote = direction === "BUY_XOF" ? board.quote?.buyXof : board.quote?.sellXof;
  const xofNum = Number(xofAmount) || 0;
  // Preview is derived from the engine-returned applied naira-per-XOF rate.
  const previewNgn = sampleQuote && xofNum > 0 ? Math.round(xofNum * sampleQuote.appliedNairaPerXof) : null;

  const convert = async () => {
    setNotice(null);
    if (xofNum < 1000) {
      setNotice({ ok: false, message: "The corridor desk minimum is 1,000 XOF." });
      return;
    }
    setBusy(true);
    const idempotencyKey = `agent-fx-${direction}-${Date.now()}`;
    const res = await api("/api/agent/fx", {
      method: "POST",
      body: JSON.stringify({
        direction,
        xofAmount: xofNum,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        idempotencyKey,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const order = (res.data as { order?: AgentFxOrder })?.order;
      setNotice({
        ok: true,
        message: order
          ? `Converted ${fmtXof(order.xofAmount)} (${direction.replace("_", " ")}). Naira leg ${naira(order.ngnAmount)} journaled — ${order.orderReference}.`
          : "Conversion completed.",
      });
      setCustomerName("");
      setCustomerPhone("");
      await load(true);
    } else {
      setNotice({ ok: false, message: res.message || "The conversion failed." });
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="FX / BDC Conversion Desk"
        subtitle="Corridor conversions quoted from the treasury engine reference — the till books the naira leg, the XOF leg settles on the corridor float."
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

      {/* Rate truth board */}
      <section aria-label="Engine rate board" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
              <Landmark className="h-4 w-4 text-stone-400" aria-hidden="true" />
              NGN/XOF corridor desk
            </h2>
            {corridor ? <AgentChip label={`market ${corridor.status}`} tone={corridor.status === "SAFE" ? "green" : "amber"} /> : null}
          </div>
          {corridor ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Engine reference</p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-700">{corridor.referenceRateXofPerNgn.toFixed(4)}</p>
                <p className="text-[10px] text-stone-400">XOF per ₦ · treasury position</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Desk quotes (₦ per XOF)</p>
                <p className="mt-1 text-lg font-bold text-stone-800">
                  {board.quote?.buyXof ? board.quote.buyXof.appliedNairaPerXof.toFixed(4) : "—"}
                </p>
                <p className="text-[10px] text-stone-400">you sell XOF · buy XOF</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-stone-500">Corridor not quoting right now.</p>
          )}
          <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-[10px] leading-relaxed text-sky-800 ring-1 ring-sky-100">
            XOF delivery/receipt happens on the KoriePay corridor float (treasury engine); this till journals the naira leg only — no XOF cash is held at the till.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900">USD/NGN market (read-only)</h2>
            {board.usdMarket ? <AgentChip label={`${board.usdMarket.status}`} tone="neutral" /> : null}
          </div>
          {board.usdMarket ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Reference rate</p>
                <p className="mt-1 font-mono text-lg font-bold text-stone-800">₦{board.usdMarket.referenceRate.toLocaleString()}</p>
                <p className="text-[10px] text-stone-400">per USD · treasury position</p>
              </div>
              <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Desk at this till</p>
                <p className="mt-1 text-sm font-bold text-amber-600">Not tradable</p>
                <p className="text-[10px] text-stone-400">no USD vault on the naira till</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-stone-500">No USD position from the engine.</p>
          )}
        </div>
      </section>

      {/* Converter */}
      <section aria-label="Convert" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-stone-900">New conversion</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDirection("BUY_XOF")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                  direction === "BUY_XOF" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"
                }`}
              >
                Customer buys XOF (pays ₦)
              </button>
              <button
                type="button"
                onClick={() => setDirection("SELL_XOF")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                  direction === "SELL_XOF" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"
                }`}
              >
                Customer sells XOF (gets ₦)
              </button>
            </div>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Amount (XOF)</span>
              <input
                value={xofAmount}
                onChange={(e) => setXofAmount(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-lg font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {["10000", "50000", "100000", "200000"].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setXofAmount(q)}
                  className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:border-emerald-300"
                >
                  {Number(q).toLocaleString()}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Customer name (optional)</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Phone (optional)</span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  inputMode="tel"
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-stone-50 p-4 ring-1 ring-stone-100">
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Live preview (engine rate)</p>
            <div className="mt-2 space-y-2 text-xs text-stone-600">
              <p className="flex justify-between">
                <span>Direction</span>
                <span className="font-bold text-stone-800">{direction.replace("_", " → ")}</span>
              </p>
              <p className="flex justify-between">
                <span>XOF amount</span>
                <span className="font-bold text-stone-800">{fmtXof(xofNum)}</span>
              </p>
              <p className="flex justify-between">
                <span>Applied rate</span>
                <span className="font-bold font-mono text-stone-800">
                  {sampleQuote ? `${sampleQuote.appliedNairaPerXof.toFixed(4)} ₦/XOF` : "—"}
                </span>
              </p>
              <p className="flex justify-between border-t border-stone-200 pt-2">
                <span>Naira leg</span>
                <span className="text-base font-extrabold text-emerald-700">
                  {previewNgn !== null && previewNgn > 0 ? naira(previewNgn) : "—"}
                </span>
              </p>
              <p className="flex items-start gap-1.5 text-[10px] text-stone-400">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                Margin accrues to agent commission payable; single-op cap ₦200,000, daily desk cap ₦1,000,000 (engine-enforced).
              </p>
            </div>
            <button
              type="button"
              onClick={() => void convert()}
              disabled={busy || xofNum < 1000}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
              {busy ? "Journaling…" : "Execute conversion"}
            </button>
          </div>
        </div>
      </section>

      {/* Order history */}
      <section aria-labelledby="fx-history" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 id="fx-history" className="text-sm font-bold text-stone-900">
          Conversions today &amp; recent
        </h2>
        {board.orders.length === 0 ? (
          <p className="mt-3 text-xs text-stone-400">No conversions recorded — completed orders appear here with their journal references.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl ring-1 ring-stone-100">
            {board.orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 bg-stone-50/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-800">
                    {o.direction.replace("_", " → ")} · {fmtXof(o.xofAmount)}
                    {o.customerName ? ` · ${o.customerName}` : ""}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-stone-400">{o.orderReference}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] text-stone-500">
                    Naira {naira(o.ngnAmount)} · ref {o.referenceRate} XOF/₦ · applied {o.appliedRate.toFixed(4)} ₦/XOF
                  </p>
                  <AgentChip label={o.status} tone={o.status === "COMPLETED" ? "green" : "neutral"} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
