"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Store,
  ArrowLeft,
  Building2,
  TrendingUp,
  CheckCircle2,
  Receipt,
  ShieldCheck,
  CreditCard,
  Calendar,
} from "lucide-react";

export default function MerchantDetailPage() {
  const params = useParams();
  const { merchants, formatCurrency, formatDate, t } = useAggregator();

  const merchant = merchants.find((m) => m.id === params.id) || merchants[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <Link
        href="/aggregator/merchants"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Merchant Directory</span>
      </Link>

      {/* Header Profile */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#091122] border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              {merchant.businessName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{merchant.businessName}</h1>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="font-mono text-teal-300 font-bold">{merchant.merchantCode}</span>
                <span>•</span>
                <span>{merchant.category}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>KYB {merchant.kybStatus}</span>
            </span>
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Today's Acquiring TPV</div>
            <div className="text-lg font-bold font-mono text-emerald-400">{formatCurrency(merchant.todayVolume)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Monthly Volume</div>
            <div className="text-lg font-bold font-mono text-white">{formatCurrency(merchant.monthVolume)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Average Order Ticket</div>
            <div className="text-lg font-bold font-mono text-teal-300">{formatCurrency(merchant.averageTicket)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Dispute Rate</div>
            <div className="text-lg font-bold font-mono text-slate-200">{merchant.disputeRate}%</div>
          </div>
        </div>
      </div>

      {/* Details & Settlement destination */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-3">
          <h3 className="font-bold text-white text-sm">Settlement Payout Destination</h3>
          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Settlement Bank:</span>
              <span className="font-bold text-white">{merchant.settlementBank}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Account Masked:</span>
              <span className="font-mono text-teal-300">{merchant.settlementAccountMasked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Risk Assessment:</span>
              <span className="font-mono text-emerald-400 font-bold">{merchant.riskState}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-3">
          <h3 className="font-bold text-white text-sm">Territory Assignment</h3>
          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Territory:</span>
              <span className="text-white">{merchant.territoryName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Contact Person:</span>
              <span className="text-white">{merchant.contactPerson}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="font-mono">{merchant.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Registered Date:</span>
              <span className="font-mono">{merchant.registeredAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
