"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  FileText,
  Plus,
  Search,
  Download,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Eye,
  X,
  CreditCard,
} from "lucide-react";
import { MerchantInvoice } from "@/types/merchant";

export default function MerchantInvoicesPage() {
  const { invoices, setIsCreateInvoiceModalOpen, formatCurrency, formatDate, markInvoicePaid, t } = useMerchant();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<MerchantInvoice | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customerEmail && inv.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Commercial Tax Invoices</h1>
          <p className="text-xs text-slate-400">
            Automated B2B invoicing with dedicated Providus virtual settlement accounts & real-time payment webhook matching.
          </p>
        </div>
        <button
          onClick={() => setIsCreateInvoiceModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Issue New Tax Invoice</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-slate-400">Total Invoiced (Month)</div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(invoices.reduce((acc, i) => acc + i.total, 0))}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-emerald-400">Paid Invoices</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {formatCurrency(invoices.filter((i) => i.status === "PAID").reduce((acc, i) => acc + i.total, 0))}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-amber-400">Pending Receivables</div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {formatCurrency(invoices.filter((i) => i.status === "PENDING" || i.status === "SENT").reduce((acc, i) => acc + i.total, 0))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "PAID", "SENT", "PENDING", "OVERDUE"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-colors ${
                statusFilter === s ? "bg-teal-500 text-slate-950 font-bold" : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-3xl bg-[#091020] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d1a] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Customer / Client</th>
                <th className="px-4 py-3">Virtual Providus NUBAN</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3.5">
                    <div className="text-white font-bold">{inv.customerName}</div>
                    <div className="text-[10px] text-slate-400">{inv.customerEmail || "No email"}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-teal-300">
                    {inv.virtualAccountNuban ? (
                      <div>
                        <div>{inv.virtualAccountNuban}</div>
                        <div className="text-[9px] text-slate-500">{inv.virtualAccountBank}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-300">{inv.dueDate}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        inv.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : inv.status === "SENT"
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                          : inv.status === "OVERDUE"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                      title="View Invoice Sheet"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {inv.status !== "PAID" && (
                      <button
                        onClick={() => markInvoicePaid(inv.id)}
                        className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Sheet Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0c1324] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Tax Invoice {selectedInvoice.invoiceNumber}</h3>
                <p className="text-xs text-slate-400 font-mono">Issued on {formatDate(selectedInvoice.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill To & Virtual NUBAN */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/5 text-xs">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Billed To</div>
                <div className="font-bold text-white text-sm mt-0.5">{selectedInvoice.customerName}</div>
                <div className="text-slate-400">{selectedInvoice.customerEmail}</div>
                <div className="text-slate-400">{selectedInvoice.customerPhone}</div>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
                <div className="text-[10px] font-mono text-teal-400 uppercase">Payment Settlement NUBAN</div>
                <div className="font-mono font-bold text-white text-base mt-0.5">
                  {selectedInvoice.virtualAccountNuban || "9928193820"}
                </div>
                <div className="text-[11px] text-teal-300">
                  {selectedInvoice.virtualAccountBank || "Providus Bank"}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase">Line Items</div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-white">{item.description}</td>
                      <td className="p-2 text-center font-mono">{item.quantity}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2 text-right font-mono font-bold text-teal-300">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary breakdown */}
            <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (7.5%):</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-white/10">
                <span>Total Due:</span>
                <span className="font-mono text-teal-400">{formatCurrency(selectedInvoice.total)}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
