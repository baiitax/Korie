"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  History,
  ShieldCheck,
  Search,
} from "lucide-react";

export default function AggregatorAuditPage() {
  const { t } = useAggregator();

  const auditEvents = [
    {
      id: "aud-01",
      actor: "Alhaji Sani Bello (AGGREGATOR_OWNER)",
      action: "FLOAT_INJECTION_DISPATCH",
      entity: "AGT-KN-0104 (Dan-Batta Agro)",
      amount: "₦500,000",
      timestamp: "2026-09-03 11:45:10",
      correlationId: "CORR-99281048",
    },
    {
      id: "aud-02",
      actor: "Hadiza Umar Faruk (FINANCE_MANAGER)",
      action: "ON_DEMAND_PAYOUT_TRIGGERED",
      entity: "Providus Bank Nigeria (0182****29)",
      amount: "₦2,000,000",
      timestamp: "2026-09-03 10:15:22",
      correlationId: "CORR-99281020",
    },
    {
      id: "aud-03",
      actor: "Musa Dan-Ali (OPERATIONS_MANAGER)",
      action: "AGENT_ENROLLED",
      entity: "AGT-KN-0149 (Garko Women MF)",
      amount: "—",
      timestamp: "2026-09-02 16:30:00",
      correlationId: "CORR-99280912",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Immutable Security Audit Ledger</h1>
        <p className="text-xs text-slate-400">
          Tamper-evident logs of all administrative logins, float dispatches, KYC reviews, and settlement authorizations
        </p>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-[#091122] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a16] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Timestamp & Correlation</th>
                <th className="px-4 py-3">Actor / Operator</th>
                <th className="px-4 py-3">Action Event</th>
                <th className="px-4 py-3">Affected Target Node</th>
                <th className="px-4 py-3 text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {auditEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-mono font-bold text-white">{evt.timestamp}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{evt.correlationId}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-200">{evt.actor}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-teal-300 font-bold">
                      {evt.action}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-300">{evt.entity}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-400">{evt.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
