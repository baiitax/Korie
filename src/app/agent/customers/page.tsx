"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  Users,
  Search,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
} from "lucide-react";

export default function AgentCustomersPage() {
  const { customers, t } = useAgent();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.accountNumberMasked.includes(searchTerm) ||
      c.bankName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {t("common.customers")}
            </h1>
            <p className="text-xs text-slate-400">
              Agency retail customers and verified bank accounts.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert("Customer onboarding initiated. Collect NIN / BVN for Tier-1 registration.")}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Onboard New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search customer by name, phone or account number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#090f1e] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      {/* Customer Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((cust) => (
          <div
            key={cust.id}
            className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 hover:border-amber-500/30 transition-all space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-sm font-mono">
                  {cust.fullName[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{cust.fullName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300">
                      {cust.kycTier}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{cust.phone}</div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-xs font-mono">
              <div className="text-slate-400 text-[10px]">Primary Bank Account</div>
              <div className="text-white font-bold mt-0.5">
                {cust.bankName} • {cust.accountNumberMasked}
              </div>
              <div className="text-slate-400 text-[10px] pt-1">
                Total Operations: {cust.totalTransactionsCount}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href={`/agent/cash-in?account=${cust.accountNumberMasked}&name=${encodeURIComponent(cust.fullName)}`}
                className="flex-1 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs text-center transition-colors"
              >
                Cash In
              </Link>
              <Link
                href={`/agent/cash-out?account=${cust.accountNumberMasked}&name=${encodeURIComponent(cust.fullName)}`}
                className="flex-1 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs text-center transition-colors"
              >
                Cash Out
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
