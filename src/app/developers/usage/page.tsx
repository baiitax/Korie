"use client";

import React from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  BarChart3,
  Zap,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';

export default function UsagePage() {
  const { rateLimits, activeApplication, environment } = useDeveloper();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            CAPACITY & RATE-LIMITING QUOTAS
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">API Usage & Rate Limit Center</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time throughput consumption, per-minute burst limits, and daily volume allocation for {activeApplication.name}.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-4 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <span className="text-slate-500 block text-[10px]">TOTAL 24H REQUESTS</span>
          <span className="text-white font-bold text-xl">85,220</span>
          <span className="text-[10px] text-emerald-400 block">Within Tier 1 limit</span>
        </div>
        <div className="p-4 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <span className="text-slate-500 block text-[10px]">THROTTLED TODAY</span>
          <span className="text-emerald-400 font-bold text-xl">0 (0.00%)</span>
          <span className="text-[10px] text-slate-400 block">No 429 errors</span>
        </div>
        <div className="p-4 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <span className="text-slate-500 block text-[10px]">PEAK RPM TODAY</span>
          <span className="text-teal-300 font-bold text-xl">92 req/min</span>
          <span className="text-[10px] text-slate-400 block">FX Corridor route</span>
        </div>
        <div className="p-4 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <span className="text-slate-500 block text-[10px]">APPLICATION TIER</span>
          <span className="text-amber-400 font-bold text-xl">{activeApplication.environment}</span>
          <span className="text-[10px] text-slate-400 block">Enterprise Quota</span>
        </div>
      </div>

      {/* Rate Limits by Category */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Category Rate Limits & Consumption</h3>
          <span className="text-xs font-mono text-slate-400">Enforced by Edge API Gateway</span>
        </div>

        <div className="space-y-4">
          {rateLimits.map(quota => {
            const usagePercent = Math.round((quota.requestsToday / quota.quotaToday) * 100);
            return (
              <div
                key={quota.category}
                className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-2 text-xs font-mono"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase">{quota.category}</span>
                    <span className="text-[10px] text-slate-500">
                      (Limit: {quota.maxRpm} RPM | Burst: {quota.burstLimit} RPM)
                    </span>
                  </div>
                  <div className="text-slate-400 text-right">
                    <span className="text-white font-bold">{quota.requestsToday.toLocaleString()}</span> / {quota.quotaToday.toLocaleString()} reqs ({usagePercent}%)
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
