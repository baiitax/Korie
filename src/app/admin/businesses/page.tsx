"use client";

import React from "react";
import { Briefcase, Building2, Users, FileSpreadsheet, ArrowRight } from "lucide-react";

export default function BusinessesAdminPage() {
  const businesses = [
    {
      id: "biz-001",
      name: "Sahel Logistics & Freight Corp",
      industry: "Cross-Border Transport",
      country: "Nigeria & Niger 🌍",
      monthlyPayroll: "₦ 45,000,000",
      usersCount: 8,
      status: "ACTIVE",
    },
    {
      id: "biz-002",
      name: "Maradi Agrochemicals SARL",
      industry: "Wholesale Agriculture",
      country: "Niger Republic 🇳🇪",
      monthlyPayroll: "28,000,000 CFA",
      usersCount: 4,
      status: "ACTIVE",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
            CORPORATE TREASURY & PAYROLL
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Enterprise & SME Accounts</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage corporate organizations, multi-signatory permissions, and bulk automated payroll dispatches.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Corporate Business</th>
              <th className="p-4 font-semibold">Industry</th>
              <th className="p-4 font-semibold">Market Corridor</th>
              <th className="p-4 font-semibold">Monthly Bulk Payroll</th>
              <th className="p-4 font-semibold">Signatory Users</th>
              <th className="p-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {businesses.map((b) => (
              <tr key={b.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">{b.name}</td>
                <td className="p-4 text-slate-300">{b.industry}</td>
                <td className="p-4 font-mono">{b.country}</td>
                <td className="p-4 font-mono font-bold text-emerald-400">{b.monthlyPayroll}</td>
                <td className="p-4 font-mono text-white">{b.usersCount} Approvers</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    ● {b.status}
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
