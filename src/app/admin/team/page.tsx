"use client";

import React from "react";
import { Users, ShieldCheck, Lock, UserPlus } from "lucide-react";

export default function TeamAdminPage() {
  const teamMembers = [
    {
      name: "Ibrahim Shehu",
      email: "super.admin@koriepay.com",
      role: "SUPER_ADMIN",
      department: "Executive Operations (Abuja HQ)",
      permissions: "Full System Governance, Maker-Checker Dual Control, Node Failover",
      mfaStatus: "ENFORCED",
    },
    {
      name: "Amina Aliyu",
      email: "treasury.lead@koriepay.com",
      role: "TREASURY_ADMIN",
      department: "Treasury & Clearing (Lagos Desk)",
      permissions: "Settlement Approvals, Liquidity Float Management, BDC Desks",
      mfaStatus: "ENFORCED",
    },
    {
      name: "Ousmane Dan Kaka",
      email: "niamey.operations@koriepay.com",
      role: "OPERATIONS_ADMIN",
      department: "Sahel Regional Clearing (Niamey Desk)",
      permissions: "Agent Onboarding, Merchant QR Audits, WAEMU Settlement",
      mfaStatus: "ENFORCED",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
            ROLE-BASED ACCESS CONTROL (RBAC)
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Super Admin Team & Permissions</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage authorized administrative users, granular capability scopes, and hardware MFA enforcement.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Administrator</th>
              <th className="p-4 font-semibold">RBAC Role</th>
              <th className="p-4 font-semibold">Regional Desk</th>
              <th className="p-4 font-semibold">Scoped Capabilities</th>
              <th className="p-4 font-semibold">MFA Policy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {teamMembers.map((m, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-white font-sans">{m.name}</div>
                  <div className="text-[10px] text-slate-400">{m.email}</div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {m.role}
                  </span>
                </td>
                <td className="p-4 text-slate-300 font-sans">{m.department}</td>
                <td className="p-4 text-slate-400 font-sans text-[11px] max-w-xs">{m.permissions}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    ● {m.mfaStatus}
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
