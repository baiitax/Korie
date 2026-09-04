"use client";

import React from "react";
import { History, ShieldCheck, Lock, Search } from "lucide-react";

export default function AuditAdminPage() {
  const auditLogs = [
    {
      id: "aud-0981",
      actor: "super.admin@koriepay.com",
      role: "SUPER_ADMIN",
      action: "MAKER_CHECKER_APPROVAL",
      resource: "BDC High-Value FX Order ₦12.5M",
      ip: "105.112.84.12",
      timestamp: "2 mins ago",
    },
    {
      id: "aud-0982",
      actor: "kyc.officer@koriepay.com",
      role: "COMPLIANCE_ADMIN",
      action: "KYC_TIER_3_UPGRADE",
      resource: "Dawanau Commodity Hub Ltd",
      ip: "197.210.92.11",
      timestamp: "18 mins ago",
    },
    {
      id: "aud-0983",
      actor: "infrastructure.lead@koriepay.com",
      role: "INFRA_ADMIN",
      action: "BANKING_NODE_HEALTH_CHECK",
      resource: "Providus Bank & Koris Bank Nodes",
      ip: "102.89.44.20",
      timestamp: "35 mins ago",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
            GOVERNANCE & AUDIT TRAIL
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Immutable Administrative Audit Log</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically sealed journal of every privileged administrative action, KYC decision, and dual-control approval.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Audit Event ID</th>
              <th className="p-4 font-semibold">Administrator</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Action Performed</th>
              <th className="p-4 font-semibold">Target Resource</th>
              <th className="p-4 font-semibold">IP Address</th>
              <th className="p-4 font-semibold text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">{log.id}</td>
                <td className="p-4 text-emerald-400 font-semibold">{log.actor}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-white/5">
                    {log.role}
                  </span>
                </td>
                <td className="p-4 text-white font-bold">{log.action}</td>
                <td className="p-4 text-slate-300">{log.resource}</td>
                <td className="p-4 text-slate-400 text-[11px]">{log.ip}</td>
                <td className="p-4 text-right text-slate-500 text-[10px]">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
