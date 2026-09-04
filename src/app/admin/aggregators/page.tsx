"use client";

import React from "react";
import { Users, Building2, TrendingUp } from "lucide-react";

export default function AggregatorsAdminPage() {
  const aggregators = [
    {
      id: "agg-01",
      name: "Arewa FinTech Super-Agent Consortium",
      region: "Northern Nigeria (Kano, Kaduna, Sokoto)",
      agentsCount: 840,
      monthlyVolume: "₦ 184,000,000",
      status: "ACTIVE",
    },
    {
      id: "agg-02",
      name: "Sahel Mobile Commerce Distribution",
      region: "Niger Republic (Maradi, Zinder, Niamey)",
      agentsCount: 420,
      monthlyVolume: "92,000,000 CFA",
      status: "ACTIVE",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
            AGGREGATOR & SUPER-AGENT NETWORKS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Aggregator Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage regional super-agents, sub-agent networks, and tiered revenue-sharing distributions.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Aggregator Name</th>
              <th className="p-4 font-semibold">Territory</th>
              <th className="p-4 font-semibold">Sub-Agents Deployed</th>
              <th className="p-4 font-semibold">Monthly Volume</th>
              <th className="p-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {aggregators.map((a) => (
              <tr key={a.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">{a.name}</td>
                <td className="p-4 text-slate-300">{a.region}</td>
                <td className="p-4 font-mono font-bold text-emerald-400">{a.agentsCount} Active Terminals</td>
                <td className="p-4 font-mono text-white font-bold">{a.monthlyVolume}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    ● {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
