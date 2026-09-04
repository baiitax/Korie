"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/money";
import { CustomerTransaction } from "@/types/customer";
import {
  ArrowLeft,
  Search,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
} from "lucide-react";

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "SUCCESSFUL":
      return "success";
    case "PENDING":
    case "PROCESSING":
      return "warning";
    case "FAILED":
      return "danger";
    case "REVERSED":
    case "CANCELLED":
      return "info";
    default:
      return "neutral";
  }
}

export default function CustomerTransactionsPage() {
  const { transactions, openReceipt, t, isBalanceHidden } = useCustomer();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const categories = [
    { id: "ALL", label: t("transactions.filterAll") },
    { id: "TRANSFERS", label: t("transactions.filterTransfers") },
    { id: "BILLS", label: t("transactions.filterBills") },
    { id: "FX", label: t("transactions.filterFx") },
    { id: "FUNDING", label: t("transactions.filterFunding") },
    { id: "CARDS", label: t("transactions.filterCards") },
  ];

  const statuses = [
    { id: "ALL", label: t("transactions.statusAll") },
    { id: "SUCCESSFUL", label: t("transactions.statusSuccess") },
    { id: "PENDING", label: t("transactions.statusPending") },
    { id: "PROCESSING", label: t("transactions.statusProcessing") },
    { id: "FAILED", label: t("transactions.statusFailed") },
    { id: "REVERSED", label: t("transactions.statusReversed") },
    { id: "CANCELLED", label: t("transactions.statusCancelled") },
  ];

  const filteredTransactions = transactions.filter((tx) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      tx.title.toLowerCase().includes(q) ||
      tx.reference.toLowerCase().includes(q) ||
      (tx.recipientName && tx.recipientName.toLowerCase().includes(q)) ||
      (tx.senderName && tx.senderName.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === "ALL" || tx.category === selectedCategory;
    const matchesStatus = selectedStatus === "ALL" || tx.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleExportCSV = () => {
    const headers = "Date,Reference,Title,Type,Direction,Amount,Currency,Fee,Status,Recipient/Sender\n";
    const rows = filteredTransactions
      .map(
        (tr) =>
          `"${tr.createdAt}","${tr.reference}","${tr.title}","${tr.type}","${tr.direction}",${tr.amount},"${tr.currency}",${tr.fee},"${tr.status}","${tr.recipientName || tr.senderName || ""}"`,
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">
              {t("transactions.title")}
            </h1>
            <p className="text-xs text-[var(--foreground-muted)]">{t("transactions.subtitle")}</p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[var(--brand-primary)]" />
          <span>{t("transactions.exportStatement")}</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder={t("transactions.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input w-full pl-11 pr-4 py-3 rounded-2xl text-sm text-[var(--foreground)]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-[var(--foreground-muted)] shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-colors ${
                selectedCategory === cat.id
                  ? "bg-[var(--brand-primary)] text-white font-bold"
                  : "bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-mono uppercase tracking-wide text-[var(--foreground-muted)] shrink-0">
            {t("transactions.filterStatus")}
          </span>
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStatus(s.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-colors ${
                selectedStatus === s.id
                  ? "bg-[var(--brand-primary)] text-white font-bold"
                  : "bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Feed */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden shadow-[var(--shadow-card)]">
        {filteredTransactions.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--foreground-muted)]">
              <Search className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-[var(--foreground)]">{t("transactions.noTransactions")}</div>
            <div className="text-xs text-[var(--foreground-muted)]">{t("transactions.noTransactionsDesc")}</div>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} onOpen={openReceipt} isBalanceHidden={isBalanceHidden} />
          ))
        )}
      </div>
    </div>
  );
}

function TransactionRow({
  tx,
  onOpen,
  isBalanceHidden,
}: {
  tx: CustomerTransaction;
  onOpen: (tx: CustomerTransaction) => void;
  isBalanceHidden: boolean;
}) {
  const { t } = useCustomer();
  const isInward = tx.direction === "INWARD";
  const Icon = isInward ? ArrowDownLeft : ArrowUpRight;

  return (
    <div
      onClick={() => onOpen(tx)}
      className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            isInward
              ? "bg-[var(--success-soft)] text-[var(--success)] border border-[var(--brand-soft)]"
              : "bg-[var(--surface-3)] text-[var(--foreground)] border border-[var(--border)]"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-bold text-[var(--foreground)] truncate">{tx.title}</div>
          <div className="text-[11px] text-[var(--foreground-muted)] truncate flex items-center gap-2 mt-0.5">
            <span>{tx.recipientName || tx.senderName || tx.description}</span>
            <span>•</span>
            <span className="font-mono text-[10px]">
              {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className={`text-xs sm:text-sm font-extrabold font-mono tabular ${isInward ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>
          {isInward ? "+" : "−"}
          {isBalanceHidden ? "••••" : formatMoney(tx.amount, tx.currency)}
        </div>
        <div className="flex items-center justify-end gap-1 mt-1">
          <StatusBadge tone={statusTone(tx.status)}>{t(`customer.txStatus.${tx.status}`)}</StatusBadge>
        </div>
      </div>
    </div>
  );
}
