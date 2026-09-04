'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { RegulatoryReport, ReportType } from '@/types/compliance';
import {
  FileCheck2,
  Search,
  Filter,
  Send,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  Download,
} from 'lucide-react';

export default function RegulatoryReportingPage() {
  const {
    regulatoryReports,
    selectedJurisdiction,
    submitRegulatoryReport,
    formatDate,
    formatCurrency,
  } = useCompliance();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ReportType>('ALL');

  const filtered = regulatoryReports.filter((r) => {
    if (selectedJurisdiction !== 'ALL' && r.jurisdiction !== selectedJurisdiction) return false;
    if (typeFilter !== 'ALL' && r.reportType !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.reportType.toLowerCase().includes(q) ||
        r.regulator.toLowerCase().includes(q) ||
        r.reportingPeriod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <FileCheck2 className="w-4 h-4" />
            STATUTORY FILING & REGULATORY COMPLIANCE
          </div>
          <h1 className="text-2xl font-extrabold text-white">Regulatory Reporting (NFIU / CENTIF)</h1>
          <p className="text-xs text-slate-400">
            Mandatory Cash Transaction Reports (CTR) and Suspicious Transaction Reports (STR) filing workflows.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by filing type, regulator, period, or acknowledgement ref..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Statutory Reports</option>
          <option value="NFIU_CTR">NFIU Cash Transaction Report (CTR)</option>
          <option value="NFIU_STR">NFIU Suspicious Transaction Report (STR)</option>
          <option value="CENTIF_DECLARATION">CENTIF Niger Suspicion Declaration</option>
          <option value="CBN_MONTHLY_AML">CBN Monthly AML/CFT Returns</option>
          <option value="BCEAO_QUARTERLY_RISK">BCEAO Quarterly Risk Report</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map((rep) => (
          <div
            key={rep.id}
            className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl"
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  {rep.id}
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold uppercase font-mono">
                  {rep.regulator} • {rep.jurisdiction === 'NG' ? '🇳🇬 NIGERIA' : '🇳🇪 NIGER'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    rep.filingStatus === 'SUBMITTED' || rep.filingStatus === 'ACCEPTED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {rep.filingStatus}
                </span>
                <h3 className="text-sm font-bold text-white">{rep.reportType.replace(/_/g, ' ')}</h3>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs space-y-1">
                <div className="text-slate-300">
                  Reporting Cycle Period: <strong className="text-white">{rep.reportingPeriod}</strong>
                </div>
                <div className="text-slate-400 flex items-center gap-4">
                  <span>Transactions Aggregated: <strong className="text-slate-200">{rep.includedTransactionCount}</strong></span>
                  <span>•</span>
                  <span>Total Filing Value: <strong className="text-emerald-400 font-mono">{formatCurrency(rep.totalValueReported, rep.currency)}</strong></span>
                </div>
                {rep.acknowledgementRef && (
                  <div className="text-emerald-400 font-mono text-[11px] pt-1 border-t border-slate-800">
                    Regulator Acknowledgement Ref: {rep.acknowledgementRef}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
              {rep.filingStatus === 'DRAFT' || rep.filingStatus === 'READY_FOR_SUBMISSION' ? (
                <button
                  onClick={() => submitRegulatoryReport(rep.id)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Filing to {rep.regulator}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Filed by {rep.submittedByOfficer}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
