'use client';

import React from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { Users, ShieldCheck, Mail, CheckCircle2, Award } from 'lucide-react';

export default function SupportTeamPage() {
  const { officers, currentOfficer, setCurrentOfficer } = useSupport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            SUPPORT WORKFORCE & RBAC TIERS
          </div>
          <h1 className="text-2xl font-extrabold text-white">Support Officers Roster</h1>
          <p className="text-xs text-slate-400">
            Workforce distribution across Tier 1 (Junior), Tier 2 (Senior), Tier 3 (Specialists), and Supervisors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {officers.map((officer) => (
          <div
            key={officer.id}
            className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xl transition ${
              currentOfficer.id === officer.id
                ? 'bg-blue-950/30 border-blue-500/50 ring-1 ring-blue-500/30'
                : 'bg-slate-900/60 border-slate-800/80'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">
                  {officer.fullName.slice(0, 2).toUpperCase()}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                    officer.status === 'ONLINE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  ● {officer.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{officer.fullName}</h3>
                <div className="text-xs font-mono text-teal-400 mt-0.5">
                  {officer.role.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Clearance Tier:</span>
                  <span className="font-semibold text-slate-200">{officer.tier.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Active Load:</span>
                  <span className="font-mono text-white">
                    {officer.activeTicketCount} / {officer.maxCapacity} Tickets
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>QA Evaluation:</span>
                  <span className="font-bold text-emerald-400 font-mono">{officer.qaScore}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Languages:</span>
                  <span className="font-mono text-teal-300 uppercase">{officer.languages.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              {currentOfficer.id === officer.id ? (
                <div className="text-center text-xs font-bold text-teal-400 py-1.5 bg-teal-950/40 rounded-lg border border-teal-800/40">
                  CURRENT ACTIVE SESSION
                </div>
              ) : (
                <button
                  onClick={() => setCurrentOfficer(officer)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition"
                >
                  Switch Session to {officer.fullName.split(' ')[0]}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
