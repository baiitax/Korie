"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMerchant } from "@/components/merchant/MerchantContext";
import MerchantBalanceHero from "@/components/merchant/ui/MerchantBalanceHero";
import {
  CreditCard,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShieldCheck,
  ChevronRight,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Link as LinkIcon,
  FileText,
  Smartphone,
  ExternalLink,
} from "lucide-react";

export default function MerchantDashboard() {
  const {
    merchant,
    transactions,
    branches,
    totalActiveTerminals,
    selectedBranchId,
    formatCurrency,
    formatDate,
    setIsReceiveModalOpen,
    setIsCreateLinkModalOpen,
    setIsCreateInvoiceModalOpen,
    t,
  } = useMerchant();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("ALL");

  const recentTransactions = transactions
    .filter((tx) => {
      const matchesBranch = selectedBranchId === "ALL" || tx.branchId === selectedBranchId;
      const matchesMethod = selectedMethod === "ALL" || tx.paymentMethod === selectedMethod;
      const matchesSearch =
        tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.customerPhone.includes(searchTerm);
      return matchesBranch && matchesMethod && matchesSearch;
    })
    .slice(0, 7);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome / Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Merchant Financial Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Omni-Channel Collections, Instant Dynamic NUBAN Transfers & Providus Batch Settlements
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold">
            CAC: {merchant.cacNumber}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
            {merchant.country === "NG" ? "🇳🇬 Nigeria (NGN)" : "🇳🇪 Niger (XOF)"}
          </span>
        </div>
      </div>

      {/* Merchant Financial Hero Card */}
      <MerchantBalanceHero />

      {/* Multi-Branch Snapshot Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Store / Branch Performance Network</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400">
              {totalActiveTerminals} Active Terminal{totalActiveTerminals === 1 ? "" : "s"} (business-wide)
            </span>
            <Link
              href="/merchant/branches"
              className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              <span>Manage Branches ({branches.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 hover:border-teal-500/30 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{branch.branchName}</h3>
                  <div className="text-[11px] text-slate-400">
                    {branch.city}, {branch.stateOrRegion}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    branch.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {branch.status}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">Dynamic POS NUBAN:</span>
                  <span className="font-mono text-teal-300 font-bold">{branch.virtualNuban || "Not yet provisioned"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-slate-400 font-mono">Today's Revenue:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(branch.todayGrossSales)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions & Quick Collections Table */}
      <div className="rounded-3xl bg-[#091020] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c1426]">
          <div>
            <h2 className="text-base font-bold text-white">Live Payment Collection Stream</h2>
            <p className="text-xs text-slate-400">
              Transactions processed across Dynamic NUBAN Transfers, POS Cards, and Payment Links
            </p>
          </div>
          <Link
            href="/merchant/payments"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <span>View All Ledger Records</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="p-3 sm:p-4 bg-[#070b16] border-b border-white/5 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "BANK_TRANSFER", "CARD_POS", "PAYMENT_LINK", "QR_CODE"].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-colors ${
                  selectedMethod === m
                    ? "bg-teal-500 text-slate-950 font-bold"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {m === "ALL" ? "All Methods" : m.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d1a] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Reference / ID</th>
                <th className="px-4 py-3">Customer & Store</th>
                <th className="px-4 py-3">Channel / Method</th>
                <th className="px-4 py-3 text-right">Gross Amount</th>
                <th className="px-4 py-3 text-right">Net Settled</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-mono font-bold text-white">{tx.reference}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{tx.providerReference}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-white font-bold">{tx.customerName}</div>
                    <div className="text-[10px] text-slate-400">{tx.branchName}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-1 rounded-md text-[10px] font-mono bg-white/5 text-teal-300 border border-white/5">
                      {tx.paymentMethod.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                    {formatCurrency(tx.netAmount)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        tx.status === "SUCCESSFUL"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : tx.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {tx.status === "SUCCESSFUL" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      <span>{tx.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-400 text-[11px]">
                    {formatDate(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
