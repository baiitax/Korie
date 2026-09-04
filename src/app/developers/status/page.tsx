"use client";

import React from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Server,
  Radio,
  Globe2,
} from 'lucide-react';

export default function StatusPage() {
  const { statusNodes, incidents, t } = useDeveloper();

  const activeIncident = incidents.find(i => i.status !== 'RESOLVED');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SYSTEM TELEMETRY & NODE HEALTH
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">{t.status.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.status.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-emerald-400">99.94% Platform Availability</span>
        </div>
      </div>

      {/* Main Status Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0a1829] via-[#091524] to-[#060e1a] border border-emerald-500/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">{t.status.allOperational}</h2>
            <p className="text-xs text-slate-300">
              Providus Bank Nigeria (NIP Outward) and Koris Bank Niger Republic (WAEMU RTGS) operating normally.
            </p>
          </div>
        </div>
      </div>

      {/* Nodes Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statusNodes.map(node => (
          <div
            key={node.id}
            className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">{node.category}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold uppercase">
                    {node.jurisdiction}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm mt-0.5">{node.name}</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                ● {node.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5">
                <span className="text-slate-500 block text-[9px]">90-DAY UPTIME</span>
                <span className="text-emerald-400 font-bold">{node.uptime90d}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5">
                <span className="text-slate-500 block text-[9px]">ROUND-TRIP LATENCY</span>
                <span className="text-teal-300 font-bold">{node.latencyMs}ms</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 text-right">
              Checked {node.lastChecked}
            </div>
          </div>
        ))}
      </div>

      {/* Incident Postmortem History */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{t.status.incidentHistory}</span>
        </h3>

        <div className="space-y-3">
          {incidents.map(inc => (
            <div key={inc.id} className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold text-white">{inc.title}</span>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {inc.status}
                </span>
              </div>
              <p className="text-slate-400">{inc.impactSummary}</p>
              <div className="text-[10px] font-mono text-slate-500">
                Resolved on {inc.resolvedAt?.split('T')[0]} ({inc.updates.length} updates logged)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
