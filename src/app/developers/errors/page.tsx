"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  LifeBuoy,
  BookOpen,
  Filter,
  RefreshCw,
} from 'lucide-react';

export default function ErrorsPage() {
  const { errorAnalytics } = useDeveloper();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredErrors = errorAnalytics.filter(err => {
    return selectedCategory === 'ALL' || err.category === selectedCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
            DIAGNOSTICS & ROOT-CAUSE REMEDIATION
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">Error Analytics Center</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Aggregated HTTP 4xx and 5xx exception telemetry with automated remediation instructions.
          </p>
        </div>

        <Link
          href="/developers/support"
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2"
        >
          <LifeBuoy className="w-4 h-4 text-emerald-400" />
          <span>Contact API Support</span>
        </Link>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {['ALL', 'VALIDATION', 'LEDGER', 'PROVIDER', 'AUTH', 'RATE_LIMIT'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase transition-colors ${
              selectedCategory === cat
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Errors Grid */}
      <div className="space-y-4">
        {filteredErrors.map(err => (
          <div
            key={err.errorCode}
            className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2.5 font-mono">
                <span className="font-black text-rose-400 text-sm">{err.errorCode}</span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                  {err.category}
                </span>
                <span className="text-[11px] text-slate-400 font-bold">
                  {err.method} {err.endpoint}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-white font-bold">{err.count.toLocaleString()} occurrences ({err.percentage}%)</span>
                <span className="text-slate-500 text-[10px]">Last seen {err.lastSeen}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1.5 text-xs">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Recommended Engineering Fix</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">{err.recommendedFix}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
