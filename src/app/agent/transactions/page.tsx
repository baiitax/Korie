"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  Search,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

export default function AgentTransactionsPage() {
  const { transactions, openReceipt, t } = useAgent();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === "ALL" || tx.type === selectedType;

    return matchesSearch && matchesType;
  });

  const handleExportCSV = () => {
    const headers = "Date,Reference,Type,Amount,CustomerFee,AgentCommission,CustomerName,Bank,Status\n";
    const rows = filtered
      .map(
        (t) =>
          `"${t.createdAt}","${t.reference}","${t.type}",${t.amount},${t.customerFee},${t.agentCommission},"${t.customerName}","${t.customerBank || ""}","${t.status}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `koriepay-agent-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

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
              {t("common.transactions")}
            </h1>
            <p className="text-xs text-slate-400">
              Complete agency audit trail and commission statements.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Export Agent CSV</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search by customer name, reference or terminal ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#090f1e] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: "ALL", label: "All Operations" },
            { id: "CASH_IN", label: "Cash In (Deposits)" },
            { id: "CASH_OUT", label: "Cash Out (Withdrawals)" },
            { id: "TRANSFER_NIP", label: "Interbank Transfers" },
            { id: "BILL_ELECTRICITY", label: "Electricity Bills" },
            { id: "BILL_AIRTIME", label: "Airtime Vending" },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-colors ${
                selectedType === type.id
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 divide-y divide-white/5 overflow-hidden shadow-xl">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No transactions found matching your criteria.
          </div>
        ) : (
          filtered.map((tx) => {
            const isCashIn = tx.type === "CASH_IN";
            return (
              <div
                key={tx.id}
                onClick={() => openReceipt(tx)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isCashIn
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {isCashIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                      <span className="truncate">{tx.title}</span>
                      {tx.status === "PENDING_PROVIDER_INTEGRATION" && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                      {(tx.status === "FAILED" || tx.status === "REVERSED") && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-2.5 h-2.5" /> {tx.status}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                      <span>{tx.customerName}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">{tx.reference}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs sm:text-sm font-extrabold font-mono text-white">
                    ₦{tx.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
                    +₦{tx.agentCommission} Commission
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
