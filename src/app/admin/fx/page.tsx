"use client";

import React from "react";
import { BarChart3, Repeat2, RefreshCw, CheckCircle2 } from "lucide-react";

export default function FxRatesAdminPage() {
  const currencyPairs = [
    {
      pair: "NGN / XOF CFA",
      corridor: "Bilateral Sahel Trade Corridor",
      buy: "0.406",
      sell: "0.410",
      mid: "0.408",
      source: "KoriePay Bilateral Clearing Node",
      updatedAt: "Live Push (12s ago)",
    },
    {
      pair: "USD / NGN",
      corridor: "Nigeria Interbank & BDC",
      buy: "₦ 1,535.00",
      sell: "₦ 1,545.00",
      mid: "₦ 1,540.00",
      source: "Providus Bank Treasury Feed",
      updatedAt: "Live Push (30s ago)",
    },
    {
      pair: "USD / XOF CFA",
      corridor: "WAEMU Regional Clearing",
      buy: "602.50 CFA",
      sell: "606.00 CFA",
      mid: "604.25 CFA",
      source: "Koris Bank Treasury Feed",
      updatedAt: "Live Push (45s ago)",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
            FX RATES & SPREAD ENGINE
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Multi-Currency Rate Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time interbank reference feeds, BDC spread margins, and bilateral cross-border conversion rates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {currencyPairs.map((cp, idx) => (
          <div key={idx} className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold text-white text-base font-mono">{cp.pair}</span>
              <span className="text-[10px] font-mono text-emerald-400">● Active</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5">
                <span className="text-slate-500 block text-[9px]">BUY</span>
                <span className="text-emerald-400 font-bold">{cp.buy}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5">
                <span className="text-slate-500 block text-[9px]">MID</span>
                <span className="text-white font-bold">{cp.mid}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5">
                <span className="text-slate-500 block text-[9px]">SELL</span>
                <span className="text-amber-400 font-bold">{cp.sell}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1">
              <div>Source: <span className="text-slate-200">{cp.source}</span></div>
              <div className="font-mono text-[10px] text-emerald-400">{cp.updatedAt}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
