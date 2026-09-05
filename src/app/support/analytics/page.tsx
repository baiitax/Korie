'use client';

import React from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { TrendingUp, BarChart3, PieChart, Activity, AlertTriangle, ArrowUpRight } from 'lucide-react';

export default function SupportAnalyticsPage() {
  const { stats, healthScore } = useSupport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            ROOT-CAUSE & SERVICE INTELLIGENCE
          </div>
          <h1 className="text-2xl font-extrabold text-white">Support Intelligence & Insights</h1>
          <p className="text-xs text-slate-400">
            &quot;Why Are Customers Contacting Us?&quot; root-cause breakdown, rising complaint drivers, and automation opportunities.
          </p>
        </div>
      </div>

      {/* Intelligence KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase font-bold">First-Contact Resolution</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">78.4%</div>
          <div className="text-[11px] text-slate-400 mt-1">Resolved on initial response</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase font-bold">Automation Deflection</div>
          <div className="text-2xl font-extrabold text-teal-400 font-mono mt-1">55.0%</div>
          <div className="text-[11px] text-teal-400 mt-1">13,750 cases resolved without human</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase font-bold">Escalation Rate</div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">6.2%</div>
          <div className="text-[11px] text-slate-400 mt-1">Within standard 8% budget</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase font-bold">Mean Resolution Time</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">42 mins</div>
          <div className="text-[11px] text-emerald-400 mt-1">Down 18% from last month</div>
        </div>
      </div>

      {/* Root Cause Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Top Inbound Contact Drivers</h3>
            <span className="text-xs text-slate-400 font-mono">Q3 2026</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>NIP Interbank Transfer Delays (Providus Rail)</span>
                <span className="font-bold text-teal-400">42%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div className="bg-teal-500 h-2 rounded-full" style={{ width: '42%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>POS Agent Float Top-up Synchronizations</span>
                <span className="font-bold text-blue-400">24%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '24%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Tier-2 / Tier-3 KYC Limit Upgrades</span>
                <span className="font-bold text-emerald-400">18%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '18%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Card ATM Dispense Errors & Reversals</span>
                <span className="font-bold text-amber-400">16%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '16%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Automation Opportunities Engine */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Automation Opportunity Engine</h3>
            <span className="text-xs text-teal-400 font-mono">High ROI Candidates</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/80 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-white">Pending NIP Transfer Status Inquiries</span>
                <span className="text-emerald-400 font-bold font-mono">301 hrs/mo Saved</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Auto-inject NIBSS session ID into WhatsApp/In-App chat when customer asks &quot;Where is my transfer?&quot;
              </p>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-white">POS Agent Cloud Float Syncing</span>
                <span className="text-emerald-400 font-bold font-mono">140 hrs/mo Saved</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Auto-trigger MQTT push to PAX terminals immediately after Coris Bank / Providus credit confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
