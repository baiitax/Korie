"use client";

import React from "react";
import { LifeBuoy, Clock, CheckCircle2 } from "lucide-react";

export default function SupportAdminPage() {
  const tickets = [
    {
      id: "TCK-8812",
      subject: "POS Terminal Paper Roll & Hardware Replacement (Kano)",
      creator: "Alhaji Garba Sani (Agent)",
      priority: "HIGH",
      status: "ASSIGNED",
      sla: "< 2h Remaining",
    },
    {
      id: "TCK-8813",
      subject: "Cross-Border Settlement Rate Inquiry (Maradi)",
      creator: "Mamadou Oumarou (Merchant)",
      priority: "MEDIUM",
      status: "RESOLVED",
      sla: "Resolved in 18m",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
            REGIONAL SUPPORT & HELP DESK
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Agent & Customer Support Tickets</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track customer inquiries, agent terminal support requests, and regional service desk SLAs.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Ticket ID</th>
              <th className="p-4 font-semibold">Subject & Context</th>
              <th className="p-4 font-semibold">Creator</th>
              <th className="p-4 font-semibold">Priority</th>
              <th className="p-4 font-semibold">SLA Status</th>
              <th className="p-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-mono font-bold text-white">{t.id}</td>
                <td className="p-4 text-white font-semibold">{t.subject}</td>
                <td className="p-4 text-slate-300">{t.creator}</td>
                <td className="p-4 font-mono font-bold text-amber-400">{t.priority}</td>
                <td className="p-4 font-mono text-slate-400">{t.sla}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    ● {t.status}
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
