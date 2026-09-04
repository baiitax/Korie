"use client";

import React from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Clock,
  Download,
} from "lucide-react";

export default function AgentSettlementPage() {
  const { agent, t } = useAgent();

  const settlements = [
    {
      id: "stl-0091",
      date: "2026-09-02",
      amount: 48200,
      bank: "Providus Bank Nigeria",
      account: "0123****23",
      status: "SETTLED",
      reference: "PRV-SETTL-99120",
    },
    {
      id: "stl-0090",
      date: "2026-09-01",
      amount: 62400,
      bank: "Providus Bank Nigeria",
      account: "0123****23",
      status: "SETTLED",
      reference: "PRV-SETTL-88410",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Bank Settlements
            </h1>
            <p className="text-xs text-slate-400">
              Commercial bank auto-settlement batches to Providus Bank.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-[#090f1e] border border-white/10 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4">Settlement ID</th>
              <th className="p-4">Date</th>
              <th className="p-4">Gross Payout</th>
              <th className="p-4">Settlement Bank</th>
              <th className="p-4">Reference</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {settlements.map((stl) => (
              <tr key={stl.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">{stl.id}</td>
                <td className="p-4 text-slate-300">{stl.date}</td>
                <td className="p-4 text-emerald-400 font-extrabold">₦{stl.amount.toLocaleString()}</td>
                <td className="p-4 text-slate-300">{stl.bank} ({stl.account})</td>
                <td className="p-4 text-slate-400">{stl.reference}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ● {stl.status}
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
