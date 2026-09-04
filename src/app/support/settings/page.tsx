'use client';

import React from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { Settings, Clock, ShieldCheck, Globe, SlidersHorizontal } from 'lucide-react';

export default function SupportSettingsPage() {
  const { currentOfficer } = useSupport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            OPERATIONS & SLA POLICY CONFIGURATION
          </div>
          <h1 className="text-2xl font-extrabold text-white">SLA & Operational Settings</h1>
          <p className="text-xs text-slate-400">
            Configure response time targets, operational shifts, escalation rules, and banking node timeout limits.
          </p>
        </div>
      </div>

      {/* SLA Policy Matrix */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Priority SLA Targets Matrix</h3>
            <p className="text-xs text-slate-400">Configured first response and resolution targets per severity grade</p>
          </div>
          <span className="text-xs text-teal-400 font-mono font-bold">CBN & BCEAO Compliant</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Priority Level</th>
                <th className="p-3">First Response SLA</th>
                <th className="p-3">Resolution Target</th>
                <th className="p-3">Auto-Escalation Window</th>
                <th className="p-3 text-right">Target Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-rose-400">CRITICAL</td>
                <td className="p-3 text-white font-bold">5 minutes</td>
                <td className="p-3 text-emerald-400 font-bold">30 minutes</td>
                <td className="p-3 text-amber-400">15 minutes past breach</td>
                <td className="p-3 text-right text-slate-300 font-sans">Tier-2 / Specialist</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-amber-400">URGENT</td>
                <td className="p-3 text-white font-bold">15 minutes</td>
                <td className="p-3 text-emerald-400 font-bold">2 hours</td>
                <td className="p-3 text-amber-400">30 minutes past breach</td>
                <td className="p-3 text-right text-slate-300 font-sans">Tier-1 / Tier-2</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-teal-400">HIGH</td>
                <td className="p-3 text-white font-bold">30 minutes</td>
                <td className="p-3 text-emerald-400 font-bold">4 hours</td>
                <td className="p-3 text-amber-400">1 hour past breach</td>
                <td className="p-3 text-right text-slate-300 font-sans">Tier-1 Junior</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-slate-300">NORMAL</td>
                <td className="p-3 text-white font-bold">2 hours</td>
                <td className="p-3 text-emerald-400 font-bold">24 hours</td>
                <td className="p-3 text-amber-400">4 hours past breach</td>
                <td className="p-3 text-right text-slate-300 font-sans">Tier-1 Junior</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-slate-500">LOW</td>
                <td className="p-3 text-white font-bold">8 hours</td>
                <td className="p-3 text-emerald-400 font-bold">72 hours</td>
                <td className="p-3 text-amber-400">12 hours past breach</td>
                <td className="p-3 text-right text-slate-300 font-sans">Tier-1 Junior</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Operating Shifts & Banking Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>Support Shifts & Active Operating Hours</span>
          </div>
          <div className="text-xs text-slate-300 space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Morning Shift (Lagos / Kano / Niamey):</span>
              <span className="font-mono font-bold text-white">07:00 – 15:30 (WAT)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Evening Shift:</span>
              <span className="font-mono font-bold text-white">15:00 – 23:30 (WAT)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Night Watch & Automated Triage:</span>
              <span className="font-mono font-bold text-teal-400">23:00 – 07:30 (WAT)</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Financial Safeguards & Permission Enforcements</span>
          </div>
          <div className="text-xs text-slate-300 space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Direct Balance Alteration via Support:</span>
              <span className="text-rose-400 font-bold font-mono">HARD DISABLED (LOCKED)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Refund Triggering &gt; ₦50,000:</span>
              <span className="text-amber-400 font-bold font-mono">FINANCE MAKER-CHECKER</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Customer Credential/OTP Exposure:</span>
              <span className="text-emerald-400 font-bold font-mono">FULLY MASKED (ZERO-LEAK)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
