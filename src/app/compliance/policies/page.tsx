'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { BookOpen, Search, Download, ShieldCheck, Clock, ExternalLink } from 'lucide-react';

export default function CompliancePoliciesPage() {
  const { policies, selectedJurisdiction } = useCompliance();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = policies.filter((p) => {
    if (selectedJurisdiction !== 'ALL' && p.jurisdiction !== selectedJurisdiction && p.jurisdiction !== 'CROSS_BORDER') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            REGULATORY GOVERNANCE & POLICIES
          </div>
          <h1 className="text-2xl font-extrabold text-white">Compliance Policy Framework</h1>
          <p className="text-xs text-slate-400">
            Authoritative compliance manuals, board-approved thresholds, and operational AML/CFT controls.
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
            placeholder="Search policies by title, code, or governance keyword..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((pol) => (
          <div
            key={pol.id}
            className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                  {pol.code}
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold uppercase font-mono">
                  v{pol.version} • {pol.jurisdiction}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{pol.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{pol.summary}</p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Approved By:</span>
                  <span className="text-slate-200 font-semibold">{pol.approvedBy}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Effective Date:</span>
                  <span className="text-slate-200 font-mono">{pol.effectiveDate}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Next Annual Review:</span>
                  <span className="text-amber-400 font-mono font-semibold">{pol.nextReviewDate}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                ACTIVE MANDATORY POLICY
              </span>
              <a
                href={pol.documentUrl}
                download
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
