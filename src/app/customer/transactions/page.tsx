"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { formatMoney } from "@/services/customerDataService";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

export default function CustomerTransactionsPage() {
  const { transactions, openReceipt, t } = useCustomer();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.recipientName && tx.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.senderName && tx.senderName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === "ALL" || tx.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "ALL" || tx.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleExportCSV = () => {
    const headers = "Date,Reference,Title,Type,Direction,Amount,Currency,Fee,Status,Recipient/Sender\n";
    const rows = filteredTransactions
      .map(
        (t) =>
          `"${t.createdAt}","${t.reference}","${t.title}","${t.type}","${t.direction}",${t.amount},"${t.currency}",${t.fee},"${t.status}","${t.recipientName || t.senderName || ""}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `koriepay-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {t("transactions.title")}
            </h1>
            <p className="text-xs text-slate-400">
              {t("transactions.subtitle")}
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>{t("transactions.downloadReceipt")}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder={t("transactions.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#090f1e] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: "ALL", label: t("transactions.filterAll") },
            { id: "TRANSFERS", label: t("transactions.filterTransfers") },
            { id: "BILLS", label: t("transactions.filterBills") },
            { id: "FX", label: t("transactions.filterFx") },
            { id: "FUNDING", label: "Funding" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-colors ${
                selectedCategory === cat.id
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Feed */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 divide-y divide-white/5 overflow-hidden shadow-xl">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="text-slate-400 text-sm font-semibold">
              {t("transactions.noResults")}
            </div>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isInward = tx.direction === "INWARD";
            const isSuccess = tx.status === "SUCCESSFUL";
            const isPending = tx.status === "PENDING" || tx.status === "PROCESSING";

            return (
              <div
                key={tx.id}
                onClick={() => openReceipt(tx)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isInward
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/5 text-slate-300 border border-white/10"
                    }`}
                  >
                    {isInward ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                      {tx.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                      <span>{tx.recipientName || tx.senderName || tx.description}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">
                        {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-xs sm:text-sm font-extrabold font-mono ${
                      isInward ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {isInward ? "+" : "-"}
                    {formatMoney(tx.amount, tx.currency)}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span
                      className={`text-[9px] font-mono font-bold uppercase ${
                        isSuccess
                          ? "text-emerald-400"
                          : isPending
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      ● {tx.status}
                    </span>
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
