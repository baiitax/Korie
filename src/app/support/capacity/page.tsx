'use client';

import React from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { SlidersHorizontal, Users, TrendingUp, Sparkles, UserPlus } from 'lucide-react';

export default function CapacityPlanningPage() {
  const { staffCapacity } = useSupport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <SlidersHorizontal className="w-4 h-4" />
            WORKFORCE MODELING & RECRUITMENT READINESS
          </div>
          <h1 className="text-2xl font-extrabold text-white">Staff Capacity Planning</h1>
          <p className="text-xs text-slate-400">
            Data-driven workforce forecasting to scale junior support hiring without increasing operational risk.
          </p>
        </div>
      </div>

      {/* High-level Recommendation Banner */}
      <div className="p-6 bg-gradient-to-r from-blue-950/60 via-slate-900 to-teal-950/60 border border-teal-500/30 rounded-2xl space-y-3 shadow-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-bold text-white">Workforce Scaling Recommendation</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
          Based on 30-day ticket velocity, peak hours between 10:00 AM – 3:00 PM (WAT), and cross-border expansion in Niger Republic, KoriePay requires an additional <strong>{staffCapacity.recommendedJuniorOfficers} Junior Support Officers</strong> fluent in Hausa and French.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-xs">Current Active Workforce</span>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{staffCapacity.currentWorkforce} Officers</div>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-xs">Peak Queue Target</span>
            <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{staffCapacity.peakQueueRequirement} Officers</div>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-xs">Recommended Junior Hires</span>
            <div className="text-xl font-bold text-teal-400 font-mono mt-0.5">+{staffCapacity.recommendedJuniorOfficers} T1 Staff</div>
          </div>
        </div>
      </div>

      {/* Language Breakdown */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white">Inbound Language Demand Breakdown</h3>
        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>English (Nigeria & Regional Trade)</span>
              <span className="font-bold text-blue-400">{staffCapacity.languageDemand.english}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${staffCapacity.languageDemand.english}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Hausa (Northern Nigeria & Southern Niger Border)</span>
              <span className="font-bold text-emerald-400">{staffCapacity.languageDemand.hausa}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${staffCapacity.languageDemand.hausa}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>French (Niger Republic / UEMOA Corridor)</span>
              <span className="font-bold text-amber-400">{staffCapacity.languageDemand.french}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${staffCapacity.languageDemand.french}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
