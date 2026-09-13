"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Receipt, Landmark } from "lucide-react";
import { adminFetch } from "@/lib/consoleKeys";

interface BillerRow {
  billerId: string;
  name: string;
  category: string;
  serviceChargeNgn: number;
  minAmountNgn: number;
  maxAmountNgn: number;
  status: string;
  payments: { count: number; principal: number; charges: number };
}

interface PaymentRow {
  id: string;
  reference: string;
  title: string;
  billerId: string | null;
  amount: number;
  customerFee: number;
  agentCommission: number;
  totalAmount: number;
  currency: string;
  status: string;
  customerName: string | null;
  customerPhoneMasked: string | null;
  terminalId: string;
  ledgerJournalId: string | null;
  createdAt: string;
}

interface Overview {
  generatedAt: string;
  catalog: BillerRow[];
  categories: string[];
  payments: PaymentRow[];
  liability: { billerSettlementsMinor: number; agentCommissionsPayableMinor: number; unit: string };
  notes: string[];
}

export default function BillPaymentsAdminPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch("/api/admin/billers/overview", { cache: "no-store" });
      const json = await r.json();
      if (!r.ok || !json?.success) throw new Error(json?.error?.message || `HTTP ${r.status}`);
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load biller truth");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const billerName = (id: string | null) => data?.catalog.find((b) => b.billerId === id)?.name || id || "unmapped";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            UTILITIES & VALUE-ADDED SERVICES · TILL RECORD
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Bill Payments & Biller Network</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            The till engine&apos;s biller catalog, the payments it has journaled, and the settlement liability those payments created.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {data && (
        <p className="text-[11px] font-mono text-slate-500">
          Read from BillerServiceEngine + LedgerService · synced {new Date(data.generatedAt).toLocaleString()} · {data.catalog.length} biller(s) · {data.payments.length} payment(s)
        </p>
      )}
      {loading && !data && <p className="text-xs text-slate-400 font-mono">Loading biller network…</p>}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300 flex items-center justify-between gap-3">
          <span>{error} — showing nothing rather than stale rows.</span>
          <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-bold">Retry</button>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-slate-400"><Landmark className="w-3.5 h-3.5" /> Biller settlement liability</div>
            <div className="text-xl font-extrabold text-amber-300 font-mono mt-1">₦{(data.liability.billerSettlementsMinor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">acc_liab_biller_settlements_ngn · posted ledger</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-slate-400"><Receipt className="w-3.5 h-3.5" /> Agent commissions payable</div>
            <div className="text-xl font-extrabold text-sky-300 font-mono mt-1">₦{(data.liability.agentCommissionsPayableMinor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">acc_liab_agent_commissions_payable_ngn · posted ledger</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10">
            <div className="text-[10px] font-mono uppercase text-slate-400">Catalog coverage</div>
            <div className="text-xl font-extrabold text-white font-mono mt-1">{data.catalog.length} billers · {data.categories.length} categories</div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">{data.categories.join(" · ")}</div>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-1 text-[10px] font-mono uppercase text-slate-400">Biller catalog & volumes</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                <th className="p-4 font-semibold">Biller</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Service Charge</th>
                <th className="p-4 font-semibold">Accepted Range</th>
                <th className="p-4 font-semibold">Payments</th>
                <th className="p-4 font-semibold">Principal Vended</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(data?.catalog || []).map((b) => (
                <tr key={b.billerId} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white">{b.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{b.billerId}</div>
                  </td>
                  <td className="p-4"><span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-white/5 text-slate-300">{b.category}</span></td>
                  <td className="p-4 font-mono text-slate-300">₦{b.serviceChargeNgn.toLocaleString()}</td>
                  <td className="p-4 font-mono text-slate-400 text-[11px]">₦{b.minAmountNgn.toLocaleString()} – ₦{b.maxAmountNgn.toLocaleString()}</td>
                  <td className="p-4 font-mono font-bold text-white">{b.payments.count}</td>
                  <td className="p-4 font-mono font-bold text-emerald-400">₦{b.payments.principal.toLocaleString()}</td>
                  <td className="p-4 font-mono text-[11px] text-slate-300">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-1 text-[10px] font-mono uppercase text-slate-400">Journaled payments (kiosk stream)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                <th className="p-4 font-semibold">Reference</th>
                <th className="p-4 font-semibold">Biller</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Principal + Fee</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {(data?.payments || []).length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                    No bill payments journaled yet — the till has vended nothing. The catalog above is what it can vend.
                  </td>
                </tr>
              )}
              {(data?.payments || []).map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold text-white">{p.reference}</td>
                  <td className="p-4 text-slate-300 font-sans font-semibold">{billerName(p.billerId)}</td>
                  <td className="p-4 text-slate-300">
                    <div className="font-sans font-semibold text-white">{p.customerName || "walk-in"}</div>
                    <div className="text-[10px] text-slate-500">{p.customerPhoneMasked || "no phone recorded"}</div>
                  </td>
                  <td className="p-4 font-bold text-emerald-400">₦{p.amount.toLocaleString()} <span className="text-slate-500 font-normal">+ ₦{p.customerFee.toLocaleString()} fee</span></td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">● {p.status}</span>
                  </td>
                  <td className="p-4 text-right text-slate-500 text-[10px]">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 space-y-1">
          {data.notes.map((n, i) => (
            <p key={i} className="text-[11px] text-slate-400 leading-relaxed">· {n}</p>
          ))}
        </div>
      )}
    </div>
  );
}
