"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  CreditCard,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Receipt,
  Building2,
  ExternalLink,
  ChevronDown,
  X,
} from "lucide-react";
import { MerchantPaymentTransaction } from "@/types/merchant";

export default function MerchantPaymentsPage() {
  const {
    transactions,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    formatCurrency,
    formatDate,
    refundTransaction,
    t,
  } = useMerchant();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [selectedTx, setSelectedTx] = useState<MerchantPaymentTransaction | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesBranch = selectedBranchId === "ALL" || tx.branchId === selectedBranchId;
    const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;
    const matchesMethod = methodFilter === "ALL" || tx.paymentMethod === methodFilter;
    const matchesSearch =
      tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customerPhone.includes(searchTerm) ||
      tx.narration.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBranch && matchesStatus && matchesMethod && matchesSearch;
  });

  const handleOpenRefund = (tx: MerchantPaymentTransaction) => {
    setSelectedTx(tx);
    setRefundReason("");
    setIsRefundModalOpen(true);
  };

  const handleOpenReceipt = (tx: MerchantPaymentTransaction) => {
    setSelectedTx(tx);
    setIsReceiptModalOpen(true);
  };

  const handleProcessRefund = () => {
    if (!selectedTx || !refundReason.trim()) return;
    refundTransaction(selectedTx.id, refundReason);
    setIsRefundModalOpen(false);
  };

  const exportCSV = () => {
    const headers = "Reference,Customer,Branch,Method,Amount,Fee,Net,Status,Timestamp\n";
    const rows = filteredTransactions
      .map(
        (t) =>
          `"${t.reference}","${t.customerName}","${t.branchName}","${t.paymentMethod}",${t.amount},${t.fee},${t.netAmount},"${t.status}","${t.createdAt}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `koriepay-transactions-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Payment Collections Ledger</h1>
          <p className="text-xs text-slate-400">
            Immutable settlement records, POS slips, virtual NUBAN inflows, and dispute refunds
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-teal-400" />
          <span>Export CSV Statement</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, customer name, phone, narration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Store Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Payment Channels</option>
              <option value="BANK_TRANSFER">Bank Transfer (Dynamic NUBAN)</option>
              <option value="CARD_POS">Card POS Terminal</option>
              <option value="PAYMENT_LINK">Payment Link</option>
              <option value="QR_CODE">QR Standee</option>
              <option value="USSD">USSD *992#</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-3xl bg-[#091020] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d1a] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Reference / Session</th>
                <th className="px-4 py-3">Customer & Store</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Fee</th>
                <th className="px-4 py-3 text-right">Net Settled</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-white">{tx.reference}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{formatDate(tx.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-white font-bold">{tx.customerName}</div>
                      <div className="text-[10px] text-slate-400">
                        {tx.customerPhone} • {tx.branchName}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-1 rounded-md text-[10px] font-mono bg-white/5 text-teal-300 border border-white/5">
                        {tx.paymentMethod.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                      {formatCurrency(tx.fee)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(tx.netAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          tx.status === "SUCCESSFUL"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : tx.status === "REFUNDED"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : tx.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReceipt(tx)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                        title="View Digital Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                      {tx.status === "SUCCESSFUL" && (
                        <button
                          onClick={() => handleOpenRefund(tx)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Authorize Refund"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital Receipt Modal */}
      {isReceiptModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0c1324] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Digital Payment Slip</h3>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white text-slate-950 font-mono text-xs space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-black text-sm uppercase">KORIEPAY MERCHANT SERVICES</div>
                <div className="text-[11px] text-slate-600">{selectedTx.branchName}</div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Reference:</span>
                  <span className="font-bold">{selectedTx.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{selectedTx.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span>{selectedTx.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Channel Ref:</span>
                  <span className="truncate max-w-[150px]">{selectedTx.providerReference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{selectedTx.createdAt}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-black text-sm">
                <span>TOTAL PAID:</span>
                <span>{formatCurrency(selectedTx.amount)}</span>
              </div>
              <div className="text-center text-[10px] text-slate-500 pt-1">
                Providus Settlement Confirmed • Kudinka, Hannunka
              </div>
            </div>

            <button
              onClick={() => setIsReceiptModalOpen(false)}
              className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* Refund Authorization Modal */}
      {isRefundModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0c1324] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Authorize Customer Refund</h3>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              Refunding will reverse {formatCurrency(selectedTx.amount)} back to the customer's origin account. This
              action is irreversible and logged to the audit ledger.
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Reason for Refund <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Defective merchandise returned by customer / Duplicate payment"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessRefund}
                disabled={!refundReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm & Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
