'use client';

import React from 'react';
import Link from 'next/link';
import { useSupport } from './SupportContext';
import {
  LifeBuoy,
  Activity,
  AlertTriangle,
  Zap,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface HeroProps {
  onOpenCreateTicket?: () => void;
  onOpenDeclareIncident?: () => void;
}

export const SupportCommandHero: React.FC<HeroProps> = ({
  onOpenCreateTicket,
  onOpenDeclareIncident,
}) => {
  const { stats, healthScore, incidents, currentOfficer, selectedJurisdiction, t } = useSupport();

  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED');

  return (
    <div className="space-y-4">
      {/* Live Technical Incident Alert Ribbon */}
      {activeIncidents.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  ACTIVE SYSTEM INCIDENT ({activeIncidents[0].incidentNumber})
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                  {activeIncidents[0].severity}
                </span>
              </div>
              <p className="text-xs text-amber-200/90 font-medium mt-0.5">
                {activeIncidents[0].title} — {activeIncidents[0].customerNotice}
              </p>
            </div>
          </div>
          <Link
            href="/support/incidents"
            className="self-start sm:self-center px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-md whitespace-nowrap"
          >
            <span>View Incident Desk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Command Hero Container */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1528] via-[#081224] to-[#050A16] border border-slate-800 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
              <span className="text-xs font-mono font-bold text-teal-400 tracking-wider uppercase">
                SUPPORT OPERATIONS POSTURE: {selectedJurisdiction === 'ALL' ? 'NIGERIA 🇳🇬 + NIGER 🇳🇪' : selectedJurisdiction === 'NG' ? 'NIGERIA (NGN)' : 'NIGER (XOF)'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-medium">
                Active Officer: <strong className="text-slate-200">{currentOfficer.fullName}</strong> ({currentOfficer.tier.replace(/_/g, ' ')})
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {t.dashboard.title}
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 mt-1 max-w-3xl">
              {t.dashboard.subtitle}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {onOpenDeclareIncident && (
              <button
                onClick={onOpenDeclareIncident}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/50 text-xs font-bold transition shadow-lg"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Declare Incident</span>
              </button>
            )}

            {onOpenCreateTicket && (
              <button
                onClick={onOpenCreateTicket}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-blue-900/30"
              >
                <Plus className="w-4 h-4" />
                <span>New Inbound Ticket</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Operational KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Open Queue</span>
              <LifeBuoy className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-extrabold text-white font-mono">{stats.totalOpen}</div>
            <div className="text-[10px] text-teal-400 mt-1 font-semibold">{stats.unassigned} unassigned</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Assigned to Me</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">{stats.assignedToMe}</div>
            <div className="text-[10px] text-slate-400 mt-1 font-semibold">Active workload</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>SLA At Risk</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {stats.slaAtRisk + stats.slaBreached}
            </div>
            <div className="text-[10px] text-rose-400 mt-1 font-semibold">
              {stats.slaBreached > 0 ? `${stats.slaBreached} breached` : 'Approaching limit'}
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Automation Runs</span>
              <Zap className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-xl font-extrabold text-teal-300 font-mono">{stats.automationResolvedCount}</div>
            <div className="text-[10px] text-teal-400/80 mt-1 font-semibold">55% auto-handled</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>CSAT Rating</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-white font-mono">{healthScore.csat}%</div>
            <div className="text-[10px] text-emerald-400 mt-1 font-semibold">4.8 / 5.0 Rating</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Support Health</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-extrabold text-teal-300 font-mono">
              {healthScore.overallScore}/100
            </div>
            <div className="text-[10px] text-teal-400 mt-1 font-semibold">High Efficiency Posture</div>
          </div>
        </div>
      </div>
    </div>
  );
};
