'use client';

import React from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { Users, ShieldCheck, Mail, Phone, MapPin, UserCheck } from 'lucide-react';

export default function ComplianceTeamPage() {
  const { officers, currentOfficer, setCurrentOfficer } = useCompliance();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            COMPLIANCE RBAC & ACCESS CONTROL
          </div>
          <h1 className="text-2xl font-extrabold text-white">Compliance Officers & Role Matrix</h1>
          <p className="text-xs text-slate-400">
            MLRO authorizations, dual-control clearance levels, and active jurisdictional assignments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {officers.map((officer) => (
          <div
            key={officer.id}
            className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xl transition ${
              currentOfficer.id === officer.id
                ? 'bg-emerald-950/30 border-emerald-500/50 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800/80'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
                  {officer.fullName.slice(0, 2).toUpperCase()}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                    officer.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {officer.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{officer.fullName}</h3>
                <div className="text-xs font-mono text-emerald-400 mt-0.5">
                  {officer.role.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{officer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {officer.jurisdiction === 'NG'
                      ? '🇳🇬 Nigeria (CBN/NFIU Station)'
                      : officer.jurisdiction === 'NE'
                      ? '🇳🇪 Niger (BCEAO/CENTIF Station)'
                      : '🌍 Cross-Border Central'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-slate-400">
                  <span>Assigned Active Cases:</span>
                  <span className="font-bold text-white">{officer.assignedCasesCount}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              {currentOfficer.id === officer.id ? (
                <div className="text-center text-xs font-bold text-emerald-400 py-1.5 bg-emerald-950/60 rounded-lg border border-emerald-800/40">
                  CURRENTLY ACTIVE SESSION
                </div>
              ) : (
                <button
                  onClick={() => setCurrentOfficer(officer)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition"
                >
                  Switch Session to this Officer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
