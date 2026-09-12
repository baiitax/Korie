"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Store,
  Search,
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function AggregatorMerchantsPage() {
  const { merchants, formatCurrency, formatDate, t } = useAggregator();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMerchants = merchants.filter(
    (mch) =>
      mch.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mch.tradingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mch.merchantCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mch.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Merchant Acquiring Network</h1>
          <p className="text-xs text-[var(--foreground-muted)]">
            Supervise enterprise retail chains, wholesale distributors, POS standees, and Providus/Coris settlement routes
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Search business, merchant code, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Merchants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredMerchants.map((mch) => (
          <div
            key={mch.id}
            className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-5"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-[var(--foreground)] text-base leading-snug">{mch.businessName}</h3>
                  <div className="text-xs text-teal-600 dark:text-teal-300 font-mono mt-0.5">{mch.merchantCode}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {mch.status}
                </span>
              </div>

              <div className="text-xs text-[var(--foreground-muted)] mt-2 space-y-0.5">
                <div>Category: <span className="text-[var(--foreground)]">{mch.category}</span></div>
                <div>Territory: <span className="text-[var(--foreground)]">{mch.territoryName}</span></div>
              </div>
            </div>

            <div className="p-3 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Today's TPV:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(mch.todayVolume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Transactions:</span>
                <span className="font-mono text-[var(--foreground)]">{mch.todayTxCount} orders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Settlement Route:</span>
                <span className="text-teal-600 dark:text-teal-300 font-mono text-[11px]">{mch.settlementBank}</span>
              </div>
            </div>

            <Link
              href={`/aggregator/merchants/${mch.id}`}
              className="w-full py-2.5 rounded-xl bg-[var(--surface-2)] hover:bg-teal-500/10 border border-[var(--border)] hover:border-teal-500/40 text-xs font-bold text-teal-600 dark:text-teal-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Inspect Merchant Profile</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
