"use client";

import React from "react";
import { ArrowRightLeft, Send, CheckCircle2 } from "lucide-react";
import { TRANSACTIONS } from "@/services/adminDataService";
import { useAdmin } from "@/components/admin/AdminContext";

export default function TransfersAdminPage() {
  const { openDrawer } = useAdmin();
  const transfers = TRANSACTIONS.filter((t) => t.type.includes("TRANSFER"));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            INTERBANK & CROSS-BORDER TRANSFERS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Transfer Routing & Execution</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor domestic NIBSS NIP transfers and bilateral Nigeria ↔ Niger Republic cross-border rails.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Reference</th>
              <th className="p-4 font-semibold">Corridor</th>
              <th className="p-4 font-semibold">Sender</th>
              <th className="p-4 font-semibold">Recipient</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Gateway</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transfers.map((tx) => (
              <tr
                key={tx.id}
                onClick={() => openDrawer("TRANSACTION", tx)}
                className="hover:bg-white/5 cursor-pointer transition-colors group"
              >
                <td className="p-4 font-mono font-bold text-white group-hover:text-emerald-400">{tx.reference}</td>
                <td className="p-4 font-mono">{tx.countryCode === "NG" ? "🇳🇬 NIP" : "🇳🇪 WAEMU"}</td>
                <td className="p-4 font-semibold text-white">{tx.sender.name}</td>
                <td className="p-4 text-slate-300">{tx.recipient.name}</td>
                <td className="p-4 font-mono font-bold text-emerald-400">
                  {tx.currency === "NGN" ? "₦" : "CFA "}
                  {tx.amount.toLocaleString()}
                </td>
                <td className="p-4 text-slate-400 font-mono text-[11px]">{tx.provider.name}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    ● {tx.status}
                  </span>
                </td>
                <td className="p-4 text-right font-mono text-emerald-400 group-hover:underline">
                  Timeline ↗
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
