'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { RestrictionModal } from '@/components/compliance/RestrictionModal';
import { ShieldAlert, Search, CheckCircle, XCircle, AlertOctagon, Lock } from 'lucide-react';

export default function SanctionsPage() {
  const {
    sanctionsAlerts,
    selectedJurisdiction,
    updateSanctionsAlertStatus,
    formatDate,
  } = useCompliance();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRestrictionOpen, setIsRestrictionOpen] = useState(false);
  const [selectedAlertForFreeze, setSelectedAlertForFreeze] = useState<any>(null);

  const filtered = sanctionsAlerts.filter((s) => {
    if (selectedJurisdiction !== 'ALL' && s.jurisdiction !== selectedJurisdiction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.id.toLowerCase().includes(q) ||
        s.targetEntityName.toLowerCase().includes(q) ||
        s.watchlistName.toLowerCase().includes(q) ||
        s.matchedNameOnList.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            WATCHLIST & SANCTIONS SURVEILLANCE
          </div>
          <h1 className="text-2xl font-extrabold text-white">Sanctions Screening Desk</h1>
          <p className="text-xs text-slate-400">
            Real-time screening against OFAC, UN Security Council, European Union, Central Bank of Nigeria, and BCEAO CENTIF.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search watchlist hits by entity name, list name, or match code..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl"
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                  {s.matchScore}% MATCH SCORE
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold uppercase">
                  {s.category}
                </span>
                <h3 className="text-sm font-bold text-white">{s.targetEntityName}</h3>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs space-y-1">
                <div className="text-slate-300">
                  <strong className="text-rose-400">Watchlist Record: </strong>
                  {s.matchedNameOnList} ({s.watchlistName})
                </div>
                <div className="text-slate-400">
                  Screening match basis: <strong>{s.matchType}</strong> • Region: {s.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                Screened at: {formatDate(s.screenedAt)} • Alert ID: {s.id}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
              {s.status === 'POTENTIAL_MATCH' && (
                <>
                  <button
                    onClick={() => updateSanctionsAlertStatus(s.id, 'FALSE_POSITIVE', 'Verified divergence')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition"
                  >
                    False Positive
                  </button>
                  <button
                    onClick={() => {
                      updateSanctionsAlertStatus(s.id, 'CONFIRMED_MATCH', 'Confirmed match against designated list');
                      setSelectedAlertForFreeze(s);
                      setIsRestrictionOpen(true);
                    }}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-lg transition flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Confirm & Freeze Account
                  </button>
                </>
              )}
              {s.status === 'CONFIRMED_MATCH' && (
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 px-3 py-1.5 rounded-lg border border-rose-800/40 flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4" />
                  CONFIRMED MATCH • ASSETS FROZEN
                </span>
              )}
              {s.status === 'FALSE_POSITIVE' && (
                <span className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg">
                  RESOLVED AS FALSE POSITIVE
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <RestrictionModal
        isOpen={isRestrictionOpen}
        onClose={() => setIsRestrictionOpen(false)}
        defaultEntity={
          selectedAlertForFreeze
            ? {
                id: selectedAlertForFreeze.targetEntityId,
                type: 'CUSTOMER',
                name: selectedAlertForFreeze.targetEntityName,
                jurisdiction: selectedAlertForFreeze.jurisdiction,
              }
            : undefined
        }
      />
    </div>
  );
}
