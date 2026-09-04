'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { CaseInvestigationDrawer } from '@/components/compliance/CaseInvestigationDrawer';
import { CreateCaseModal } from '@/components/compliance/CreateCaseModal';
import { ComplianceCase, CaseStatus, RiskLevel } from '@/types/compliance';
import {
  FileSearch,
  Plus,
  Search,
  Filter,
  Clock,
  ShieldAlert,
  ArrowRight,
  ChevronRight,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';

export default function CasesPage() {
  const { cases, selectedJurisdiction, formatCurrency, formatDate } = useCompliance();
  const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CaseStatus>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');

  const filteredCases = cases.filter((c) => {
    if (selectedJurisdiction !== 'ALL' && c.jurisdiction !== selectedJurisdiction) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (riskFilter !== 'ALL' && c.riskLevel !== riskFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.caseNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.targetEntityName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <FileSearch className="w-4 h-4" />
            INVESTIGATION LIFECYCLE MANAGEMENT
          </div>
          <h1 className="text-2xl font-extrabold text-white">Compliance Cases</h1>
          <p className="text-xs text-slate-400">
            End-to-end investigation workspace with immutable audit trails, evidence vaults, and STR/CTR filings.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>Open New Case</span>
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case #, entity name, or subject..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>

      {/* Case Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCases.map((c) => (
          <div
            key={c.id}
            className="bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition group shadow-lg"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  {c.caseNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    c.status === 'RESOLVED' || c.status === 'CLOSED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : c.status === 'ESCALATED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {c.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition line-clamp-1">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.summary}</p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Entity:</span>
                  <span className="font-semibold text-slate-200">{c.targetEntityName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Involved Value:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {formatCurrency(c.involvedAmount, c.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned MLRO:</span>
                  <span className="text-slate-300">{c.assignedOfficerName}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                SLA: {formatDate(c.deadlineSla).slice(0, 12)}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/compliance/cases/${c.id}`}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded text-[11px] transition"
                >
                  Deep Dive
                </Link>
                <button
                  onClick={() => setSelectedCase(c)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition shadow"
                >
                  Investigate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CaseInvestigationDrawer caseItem={selectedCase} onClose={() => setSelectedCase(null)} />
      <CreateCaseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
}
