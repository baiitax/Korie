"use client";

import React, { useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { BDC_OPERATORS } from "@/services/adminDataService";
import { Repeat2, Search, Coins, Globe2, ShieldCheck, ArrowRightLeft, ArrowRight } from "lucide-react";

export default function BdcAdminPage() {
  const { countryFilter } = useAdmin();
  const [search, setSearch] = useState("");

  const filtered = BDC_OPERATORS.filter((b) => {
    const matchesCountry = countryFilter === "GLOBAL" || b.countryCode === countryFilter;
    const matchesSearch =
      !search.trim() ||
      b.operatorName.toLowerCase().includes(search.toLowerCase()) ||
      b.primaryCorridor.toLowerCase().includes(search.toLowerCase());
    return matchesCountry && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
            BDC & FX DIGITAL COMMAND
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Bureau De Change & Treasury Desks</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor licensed FX operators, multi-currency virtual vaults, corridor spreads, and bilateral settlements.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search BDC operators by name or corridor..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                <th className="p-4 font-semibold">BDC Operator</th>
                <th className="p-4 font-semibold">Corridor</th>
                <th className="p-4 font-semibold">Treasury (NGN)</th>
                <th className="p-4 font-semibold">Treasury (XOF)</th>
                <th className="p-4 font-semibold">Treasury (USD)</th>
                <th className="p-4 font-semibold">Daily Trading</th>
                <th className="p-4 font-semibold">Compliance Score</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((bdc) => (
                <tr key={bdc.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white">{bdc.operatorName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{bdc.licenseNumber}</div>
                  </td>
                  <td className="p-4 font-mono text-emerald-400 font-bold">{bdc.primaryCorridor}</td>
                  <td className="p-4 font-mono font-bold text-white">₦ {(bdc.treasuryNGN / 1000000).toFixed(1)}M</td>
                  <td className="p-4 font-mono font-bold text-amber-400">{(bdc.treasuryXOF / 1000000).toFixed(1)}M CFA</td>
                  <td className="p-4 font-mono font-bold text-blue-400">${bdc.treasuryUSD.toLocaleString()}</td>
                  <td className="p-4 font-mono text-white">₦ {(bdc.dailyTradingVolume / 1000000).toFixed(1)}M</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {bdc.complianceScore}% Aligned
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                      ● {bdc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
