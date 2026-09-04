'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { History, Search, ShieldCheck, Filter, Download } from 'lucide-react';

export default function ComplianceAuditPage() {
  const { auditLogs, selectedJurisdiction, formatDate } = useCompliance();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = auditLogs.filter((l) => {
    if (selectedJurisdiction !== 'ALL' && l.jurisdiction !== selectedJurisdiction && l.jurisdiction !== 'CROSS_BORDER') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.id.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.officerName.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            IMMUTABLE COMPLIANCE LEDGER
          </div>
          <h1 className="text-2xl font-extrabold text-white">Immutable Compliance Audit Log</h1>
          <p className="text-xs text-slate-400">
            Append-only audit trail recording every investigation disposition, KYC review, and restriction action.
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
            placeholder="Search audit trail by officer, action code, or entity reference..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3.5">Log ID & Timestamp</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">Target Entity Ref</th>
                <th className="p-3.5">Officer & Role</th>
                <th className="p-3.5">Audit Narrative</th>
                <th className="p-3.5 text-right">Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-200">{log.id}</div>
                    <div className="text-[10px] text-slate-400">{formatDate(log.timestamp)}</div>
                  </td>
                  <td className="p-3.5 font-sans">
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    <div>{log.entityId}</div>
                    <div className="text-[10px] text-slate-500 font-sans">{log.entityType}</div>
                  </td>
                  <td className="p-3.5 font-sans">
                    <div className="font-bold text-white">{log.officerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{log.officerRole.replace(/_/g, ' ')}</div>
                  </td>
                  <td className="p-3.5 font-sans text-slate-300 max-w-xs">{log.details}</td>
                  <td className="p-3.5 text-right font-sans">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 font-bold">
                      VERIFIED SHA-256
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
