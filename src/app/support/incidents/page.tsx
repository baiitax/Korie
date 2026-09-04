'use client';

import React, { useState } from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { IncidentModal } from '@/components/support/IncidentModal';
import { AlertTriangle, Plus, CheckCircle2, Clock, Radio, Users } from 'lucide-react';

export default function IncidentsDeskPage() {
  const { incidents, resolveIncident, formatDate } = useSupport();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4" />
            INCIDENT-AWARE SUPPORT OPERATIONS
          </div>
          <h1 className="text-2xl font-extrabold text-white">System Incidents & Outage Desk</h1>
          <p className="text-xs text-slate-400">
            Link incoming tickets to parent technical incidents and broadcast approved customer advisories.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold transition shadow-lg shadow-amber-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>Declare Technical Incident</span>
        </button>
      </div>

      <div className="space-y-4">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className={`p-5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl ${
              inc.status === 'RESOLVED'
                ? 'bg-slate-900/40 border-slate-800 opacity-80'
                : 'bg-amber-950/20 border-amber-900/60'
            }`}
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  {inc.incidentNumber}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono bg-amber-500/20 text-amber-300">
                  {inc.severity} SEVERITY
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    inc.status === 'RESOLVED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300 animate-pulse'
                  }`}
                >
                  {inc.status}
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                  {inc.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                </span>
                <h3 className="text-base font-bold text-white">{inc.title}</h3>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800/60 leading-relaxed">
                {inc.description}
              </p>

              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/40 text-xs space-y-1">
                <div className="text-teal-300 font-semibold">
                  Approved Customer Advisory Notice:
                </div>
                <div className="text-slate-300 italic text-[11px]">&quot;{inc.customerNotice}&quot;</div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                <span>Affected: <strong className="text-slate-200">{inc.affectedServices.join(', ')}</strong></span>
                <span>•</span>
                <span>Providers: <strong className="text-slate-200">{inc.affectedProviders.join(', ')}</strong></span>
                <span>•</span>
                <span>Started: {formatDate(inc.startTime)}</span>
              </div>
            </div>

            <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-bold">Linked Complaints</div>
                <div className="text-lg font-extrabold text-amber-400 font-mono">
                  {inc.linkedTicketsCount} Tickets
                </div>
              </div>

              {inc.status !== 'RESOLVED' && (
                <button
                  onClick={() => resolveIncident(inc.id)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Incident Resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <IncidentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
