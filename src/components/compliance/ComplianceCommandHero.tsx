'use client';

import React from 'react';
import { useCompliance } from './ComplianceContext';
import {
  ShieldAlert,
  AlertTriangle,
  FileSearch,
  UserCheck,
  Lock,
  Calendar,
  Activity,
  Plus,
  Filter,
} from 'lucide-react';

interface HeroProps {
  onOpenCreateCase?: () => void;
  onOpenRestriction?: () => void;
}

export const ComplianceCommandHero: React.FC<HeroProps> = ({
  onOpenCreateCase,
  onOpenRestriction,
}) => {
  const { stats, t, selectedJurisdiction, currentOfficer } = useCompliance();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0C1527] via-[#091122] to-[#060B18] border border-slate-800 p-6 shadow-2xl">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider uppercase">
              LIVE REGULATORY POSTURE: {selectedJurisdiction === 'ALL' ? 'NIGERIA 🇳🇬 + NIGER 🇳🇪' : selectedJurisdiction === 'NG' ? 'NIGERIA (CBN/NFIU)' : 'NIGER (BCEAO/CENTIF)'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-medium">
              MLRO Officer: <strong className="text-slate-200">{currentOfficer.fullName}</strong>
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
          {onOpenRestriction && (
            <button
              onClick={onOpenRestriction}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/50 text-xs font-bold transition shadow-lg"
            >
              <Lock className="w-4 h-4" />
              <span>Apply Restriction</span>
            </button>
          )}

          {onOpenCreateCase && (
            <button
              onClick={onOpenCreateCase}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Open New Case</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Ticker Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Open Cases</span>
            <FileSearch className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">{stats.totalOpenCases}</div>
          <div className="text-[10px] text-emerald-400 mt-1 font-semibold">Active investigations</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>AML Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">{stats.totalAmlAlerts}</div>
          <div className="text-[10px] text-amber-400/80 mt-1 font-semibold">Needs triage</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Sanctions Hits</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-extrabold text-rose-400 font-mono">{stats.totalSanctionsAlerts}</div>
          <div className="text-[10px] text-rose-400/80 mt-1 font-semibold">Watchlist review</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>KYC / KYB Queue</span>
            <UserCheck className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">{stats.pendingKycKyb}</div>
          <div className="text-[10px] text-teal-400 mt-1 font-semibold">Verification backlog</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Restrictions</span>
            <Lock className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-extrabold text-rose-300 font-mono">{stats.activeRestrictions}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold">Frozen / suspended</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>SLA Deadlines</span>
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">
            {stats.overdueDeadlines > 0 ? (
              <span className="text-rose-400">{stats.overdueDeadlines} Overdue</span>
            ) : (
              <span className="text-emerald-400">On Track</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold">NFIU / CENTIF filing</div>
        </div>
      </div>
    </div>
  );
};
