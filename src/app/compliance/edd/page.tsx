'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { FileText, Search, ShieldAlert, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';

export default function EnhancedDueDiligencePage() {
  const { selectedJurisdiction, formatCurrency, formatDate } = useCompliance();
  const [searchQuery, setSearchQuery] = useState('');

  const mockEddFiles = [
    {
      id: 'EDD-2026-001',
      entityName: 'Sahel Grain Trading Consortium',
      entityType: 'MERCHANT',
      jurisdiction: 'NG' as const,
      sourceOfWealth: 'West African Agricultural Commodity Arbitrage & Import/Export',
      turnoverEstimate: 1200000000,
      assignedMlro: 'Amina Bello, CAMS',
      status: 'APPROVED',
      nextReviewDate: '2027-02-15',
      documentsCount: 6,
    },
    {
      id: 'EDD-2026-002',
      entityName: 'Hon. Al-Hassan Mamane (PEP Associate)',
      entityType: 'CUSTOMER',
      jurisdiction: 'NE' as const,
      sourceOfWealth: 'Real Estate Development & Civil Engineering Contracts',
      turnoverEstimate: 450000000,
      assignedMlro: 'Mamadou Ousmane',
      status: 'IN_REVIEW',
      nextReviewDate: '2026-10-01',
      documentsCount: 4,
    },
    {
      id: 'EDD-2026-003',
      entityName: 'Apex Virtual Asset Brokerage',
      entityType: 'MERCHANT',
      jurisdiction: 'NG' as const,
      sourceOfWealth: 'Cryptocurrency Market Making & Liquidity Provision',
      turnoverEstimate: 3500000000,
      assignedMlro: 'Amina Bello, CAMS',
      status: 'ADDITIONAL_DOCS_REQUIRED',
      nextReviewDate: '2026-09-15',
      documentsCount: 8,
    },
  ];

  const filtered = mockEddFiles.filter((e) => {
    if (selectedJurisdiction !== 'ALL' && e.jurisdiction !== selectedJurisdiction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.id.toLowerCase().includes(q) || e.entityName.toLowerCase().includes(q) || e.sourceOfWealth.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            ENHANCED DUE DILIGENCE (EDD)
          </div>
          <h1 className="text-2xl font-extrabold text-white">Enhanced Due Diligence & Source of Wealth</h1>
          <p className="text-xs text-slate-400">
            Deep background investigation, ultimate beneficial ownership unmasking, and wealth source verification.
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
            placeholder="Search EDD files by entity, wealth source, or MLRO..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((edd) => (
          <div
            key={edd.id}
            className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                  {edd.id}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    edd.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : edd.status === 'IN_REVIEW'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {edd.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{edd.entityName}</h3>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {edd.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'} • {edd.entityType}
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Documented Source of Wealth:</span>
                  <span className="text-slate-200 text-xs font-medium">{edd.sourceOfWealth}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500">Annual Turnover:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {formatCurrency(edd.turnoverEstimate, edd.jurisdiction === 'NG' ? 'NGN' : 'XOF')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned MLRO:</span>
                  <span className="text-slate-300 font-semibold">{edd.assignedMlro}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[11px]">Next Audit: {edd.nextReviewDate}</span>
              <span className="text-teal-400 font-bold font-mono text-[11px] bg-teal-950/40 px-2 py-0.5 rounded border border-teal-800/30">
                {edd.documentsCount} Vault Exhibits
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
