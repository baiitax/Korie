"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  Users,
  Search,
  Building2,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Send,
  Plus,
} from "lucide-react";
import { MerchantCustomerCRM } from "@/types/merchant";

export default function MerchantCustomersPage() {
  const { customers, formatCurrency, formatDate, setIsReceiveModalOpen, t } = useMerchant();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<MerchantCustomerCRM | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Customer CRM</h1>
          <p className="text-xs text-slate-400">
            Track customer spend, recurring buyers, trade terms, and push instant payment requests.
          </p>
        </div>
        <button
          onClick={() => setIsReceiveModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all self-start sm:self-auto"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
          <span>Charge / Request Payment</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-black text-teal-400">
                  {cust.fullName.charAt(0)}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-teal-300 border border-white/10">
                  {cust.totalTransactionsCount} Orders
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3">{cust.fullName}</h3>
              <div className="text-xs text-slate-400 space-y-0.5 mt-1">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span className="font-mono">{cust.phone}</span>
                </div>
                {cust.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span>{cust.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Lifetime Spent:</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(cust.totalSpent)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Last Order:</span>
                <span className="text-slate-300 font-mono">{formatDate(cust.lastTransactionDate)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsReceiveModalOpen(true)}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-teal-500/10 border border-white/10 hover:border-teal-500/30 text-xs font-bold text-teal-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Invoice / Request</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
