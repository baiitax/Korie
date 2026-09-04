"use client";

import React from "react";
import { Zap, CheckCircle2, Search } from "lucide-react";

export default function BillPaymentsAdminPage() {
  const billTransactions = [
    {
      id: "bill-091",
      biller: "KEDCO Electricity (Kano DisCo)",
      customer: "Alhaji Aminu Sani",
      account: "Meter 4410-9982-120",
      amount: "₦ 15,000",
      token: "4412-8891-2301-4491-0021",
      status: "SUCCESSFUL",
      timestamp: "10 mins ago",
    },
    {
      id: "bill-092",
      biller: "NIGELEC (Niger National Power)",
      customer: "Issoufou Mahamadou",
      account: "Meter NER-NIA-9912",
      amount: "25,000 CFA",
      token: "8891-2201-9941-8812-4412",
      status: "SUCCESSFUL",
      timestamp: "24 mins ago",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            UTILITIES & VALUE-ADDED SERVICES
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Bill Payments & Token Vending</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor electricity prepaid vending (KEDCO, AEDC, EKEDC, NIGELEC), airtime top-ups, and regional aggregators.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Biller / Service</th>
              <th className="p-4 font-semibold">Customer / Account</th>
              <th className="p-4 font-semibold">Vended Token</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {billTransactions.map((b) => (
              <tr key={b.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white font-sans">{b.biller}</td>
                <td className="p-4 text-slate-300">
                  <div className="font-sans font-semibold text-white">{b.customer}</div>
                  <div className="text-[10px] text-slate-500">{b.account}</div>
                </td>
                <td className="p-4 text-amber-400 font-bold">{b.token}</td>
                <td className="p-4 font-bold text-emerald-400">{b.amount}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    ● {b.status}
                  </span>
                </td>
                <td className="p-4 text-right text-slate-500 text-[10px]">{b.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
