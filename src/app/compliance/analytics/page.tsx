'use client';

import React from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { BarChart3, TrendingUp, ShieldAlert, PieChart, Activity, Globe } from 'lucide-react';

export default function ComplianceAnalyticsPage() {
  const { stats, selectedJurisdiction, formatCurrency } = useCompliance();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            FINANCIAL CRIME INTELLIGENCE
          </div>
          <h1 className="text-2xl font-extrabold text-white">Compliance & Risk Analytics</h1>
          <p className="text-xs text-slate-400">
            Cross-border risk exposure metrics, alert conversion rates, and regulatory compliance performance.
          </p>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase font-bold">Case Conversion Rate</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">28.4%</div>
          <div className="text-[11px] text-slate-400 mt-1">AML alerts escalated to formal cases</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase font-bold">Mean SLA Resolution Time</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">18.2 hrs</div>
          <div className="text-[11px] text-emerald-400 mt-1">Target: &lt; 24.0 hrs SLA</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase font-bold">Sanctions False Positive Rate</div>
          <div className="text-2xl font-extrabold text-teal-400 font-mono mt-1">62.5%</div>
          <div className="text-[11px] text-slate-400 mt-1">AI fuzzy match optimization active</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase font-bold">Regulatory Compliance Score</div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">99.4%</div>
          <div className="text-[11px] text-slate-400 mt-1">CBN / BCEAO Audit Readiness</div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Jurisdictional Alert Distribution</h3>
            <span className="text-xs text-slate-400 font-mono">Q3 2026</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Nigeria 🇳🇬 (NFIU / CBN Corridors)</span>
                <span className="font-bold text-emerald-400">68%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Niger Republic 🇳🇪 (BCEAO / CENTIF Corridors)</span>
                <span className="font-bold text-amber-400">26%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '26%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Cross-Border Direct FX Clearing</span>
                <span className="font-bold text-teal-400">6%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div className="bg-teal-500 h-2 rounded-full" style={{ width: '6%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Top Financial Crime Typologies Flagged</h3>
            <span className="text-xs text-slate-400 font-mono">Real-Time Risk Engine</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/80 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Rapid In-and-Out Flow (Structuring)</div>
                <div className="text-[11px] text-slate-400">Funds deposited and evacuated within &lt;10 minutes</div>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400">42 Alerts</span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Cross-Border Velocity Anomaly</div>
                <div className="text-[11px] text-slate-400">Abnormal Kano - Niamey corridor volume spikes</div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">28 Alerts</span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Tier-1 Limit Smurfing</div>
                <div className="text-[11px] text-slate-400">Multiple micro-transfers to avoid KYC tier caps</div>
              </div>
              <span className="text-xs font-mono font-bold text-teal-400">19 Alerts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
