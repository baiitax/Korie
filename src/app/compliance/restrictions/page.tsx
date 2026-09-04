'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { RestrictionModal } from '@/components/compliance/RestrictionModal';
import { AccountRestriction, RestrictionType } from '@/types/compliance';
import {
  Lock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Unlock,
} from 'lucide-react';

export default function RestrictionsPage() {
  const {
    restrictions,
    currentOfficer,
    selectedJurisdiction,
    approveAccountRestriction,
    liftAccountRestriction,
    formatCurrency,
    formatDate,
  } = useCompliance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liftModalRestrictionId, setLiftModalRestrictionId] = useState<string | null>(null);
  const [liftReason, setLiftReason] = useState('');

  const filtered = restrictions.filter((r) => {
    if (selectedJurisdiction !== 'ALL' && r.jurisdiction !== selectedJurisdiction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.targetEntityName.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleLiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liftModalRestrictionId || !liftReason.trim()) return;
    liftAccountRestriction(liftModalRestrictionId, liftReason);
    setLiftModalRestrictionId(null);
    setLiftReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 uppercase tracking-wider mb-1">
            <Lock className="w-4 h-4" />
            ENFORCEMENT & DUAL-CONTROL RESTRICTIONS
          </div>
          <h1 className="text-2xl font-extrabold text-white">Account Restrictions & Freezes</h1>
          <p className="text-xs text-slate-400">
            Maker-checker enforced controls for Total Asset Freezes, Debit Suspensions (Post-No-Debit), and Settlement Holds.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition shadow-lg shadow-rose-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>Apply New Restriction</span>
        </button>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search restrictions by entity name, ID, or legal rationale..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((r) => (
          <div
            key={r.id}
            className={`p-5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl ${
              r.status === 'ACTIVE'
                ? 'bg-rose-950/20 border-rose-900/60'
                : r.status === 'PENDING_MAKER_CHECKER'
                ? 'bg-amber-950/20 border-amber-900/60'
                : 'bg-slate-900/40 border-slate-800/60'
            }`}
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                  {r.id}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono bg-rose-500/20 text-rose-300">
                  {r.restrictionType.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">
                  {r.jurisdiction === 'NG' ? '🇳🇬 NIGERIA' : '🇳🇪 NIGER'}
                </span>
                <h3 className="text-sm font-bold text-white">{r.targetEntityName}</h3>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/60 text-xs space-y-1">
                <div>
                  <strong className="text-slate-200">Legal/Policy Ground: </strong>
                  <span className="text-slate-300">{r.reason.replace(/_/g, ' ')}</span>
                  {r.courtOrderReference && (
                    <span className="text-amber-400 font-mono ml-2">({r.courtOrderReference})</span>
                  )}
                </div>
                <div className="text-slate-400 pt-0.5">
                  Rationale: <span className="text-slate-300">{r.rationale}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                <span>Maker: <strong className="text-slate-200">{r.makerOfficerName}</strong></span>
                <span>•</span>
                <span>Checker: <strong className="text-slate-200">{r.checkerOfficerName || 'PENDING DUAL-APPROVAL'}</strong></span>
                <span>•</span>
                <span>Applied: {formatDate(r.appliedAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
              {r.status === 'PENDING_MAKER_CHECKER' && (
                <button
                  onClick={() => approveAccountRestriction(r.id)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Dual-Authorize (Checker)
                </button>
              )}

              {r.status === 'ACTIVE' && (
                <button
                  onClick={() => setLiftModalRestrictionId(r.id)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" />
                  Lift Restriction
                </button>
              )}

              {r.status === 'LIFTED' && (
                <div className="text-xs font-mono text-slate-500">
                  LIFTED • {r.liftReason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lift Restriction Reason Prompt */}
      {liftModalRestrictionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleLiftSubmit} className="bg-[#090E1A] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Lift Account Restriction</h3>
            <p className="text-xs text-slate-400">
              Provide formal audit rationale for unfreezing this account and restoring full ledger debit/credit capability.
            </p>
            <textarea
              rows={3}
              value={liftReason}
              onChange={(e) => setLiftReason(e.target.value)}
              placeholder="e.g. Court order vacated, source of funds fully substantiated..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLiftModalRestrictionId(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
              >
                Confirm Lift
              </button>
            </div>
          </form>
        </div>
      )}

      <RestrictionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
