'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { CaseInvestigationDrawer } from '@/components/compliance/CaseInvestigationDrawer';
import { KycReviewModal } from '@/components/compliance/KycReviewModal';
import { ComplianceCase, KycVerificationRecord, KybVerificationRecord, AmlAlert, SanctionsAlert } from '@/types/compliance';
import {
  SlidersHorizontal,
  FileSearch,
  AlertTriangle,
  ShieldAlert,
  UserCheck,
  Building2,
  Clock,
  Filter,
  CheckCircle,
  Search,
  ArrowUpDown,
} from 'lucide-react';

export default function WorkQueuePage() {
  const {
    cases,
    amlAlerts,
    sanctionsAlerts,
    kycRecords,
    kybRecords,
    selectedJurisdiction,
    currentOfficer,
    formatCurrency,
    formatDate,
    convertAmlAlertToCase,
    updateSanctionsAlertStatus,
  } = useCompliance();

  const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<KycVerificationRecord | KybVerificationRecord | null>(null);
  const [kycType, setKycType] = useState<'KYC' | 'KYB'>('KYC');
  const [filterType, setFilterType] = useState<'ALL' | 'CASES' | 'AML' | 'SANCTIONS' | 'KYC_KYB'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Combine active work items into a unified operational work queue
  const queueItems = [
    ...cases
      .filter((c) => c.status === 'OPEN' || c.status === 'UNDER_REVIEW' || c.status === 'ESCALATED')
      .map((c) => ({
        id: c.id,
        category: 'CASE' as const,
        title: c.title,
        entityName: c.targetEntityName,
        jurisdiction: c.jurisdiction,
        priority: c.priority,
        assignedOfficer: c.assignedOfficerName,
        deadline: c.deadlineSla,
        amount: c.involvedAmount,
        currency: c.currency,
        raw: c,
      })),
    ...amlAlerts
      .filter((a) => a.status === 'NEW' || a.status === 'INVESTIGATING')
      .map((a) => ({
        id: a.id,
        category: 'AML' as const,
        title: `${a.ruleCode}: ${a.ruleName}`,
        entityName: a.entityName,
        jurisdiction: a.jurisdiction,
        priority: (a.severity === 'CRITICAL' ? 'URGENT' : 'HIGH') as any,
        assignedOfficer: a.assignedOfficer || 'Unassigned',
        deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        amount: a.transactionAmount,
        currency: a.currency,
        raw: a,
      })),
    ...sanctionsAlerts
      .filter((s) => s.status === 'POTENTIAL_MATCH')
      .map((s) => ({
        id: s.id,
        category: 'SANCTIONS' as const,
        title: `Sanctions Match (${s.matchScore}%): ${s.watchlistName}`,
        entityName: s.targetEntityName,
        jurisdiction: s.jurisdiction,
        priority: 'URGENT' as any,
        assignedOfficer: s.reviewedBy || 'Watchlist Analyst',
        deadline: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        amount: 0,
        currency: 'NGN',
        raw: s,
      })),
    ...kycRecords
      .filter((k) => k.status === 'PENDING' || k.status === 'IN_REVIEW')
      .map((k) => ({
        id: k.id,
        category: 'KYC' as const,
        title: `Customer Verification (${k.tier})`,
        entityName: k.customerName,
        jurisdiction: k.jurisdiction,
        priority: 'MEDIUM' as any,
        assignedOfficer: k.assignedOfficer || 'KYC Specialist',
        deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        amount: 0,
        currency: 'NGN',
        raw: k,
      })),
    ...kybRecords
      .filter((b) => b.status === 'PENDING' || b.status === 'IN_REVIEW')
      .map((b) => ({
        id: b.id,
        category: 'KYB' as const,
        title: `Corporate KYB (${b.businessType})`,
        entityName: b.businessName,
        jurisdiction: b.jurisdiction,
        priority: 'HIGH' as any,
        assignedOfficer: b.assignedOfficer || 'Corporate Analyst',
        deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        amount: 0,
        currency: 'NGN',
        raw: b,
      })),
  ];

  const filteredQueue = queueItems.filter((item) => {
    if (selectedJurisdiction !== 'ALL' && item.jurisdiction !== selectedJurisdiction) return false;
    if (filterType === 'CASES' && item.category !== 'CASE') return false;
    if (filterType === 'AML' && item.category !== 'AML') return false;
    if (filterType === 'SANCTIONS' && item.category !== 'SANCTIONS') return false;
    if (filterType === 'KYC_KYB' && item.category !== 'KYC' && item.category !== 'KYB') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.entityName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <SlidersHorizontal className="w-4 h-4" />
            OPERATIONAL TRIAGE & RESOLUTION
          </div>
          <h1 className="text-2xl font-extrabold text-white">Compliance Work Queue</h1>
          <p className="text-xs text-slate-400">
            Priority-ranked tasks across KYC, KYB, AML alerts, sanctions hits, and active case files.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['ALL', 'CASES', 'AML', 'SANCTIONS', 'KYC_KYB'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                filterType === type
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter queue by entity name, ID, or rule code..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono hidden sm:block">
          Showing <strong className="text-emerald-400">{filteredQueue.length}</strong> prioritized items
        </div>
      </div>

      {/* Queue Items Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3.5">Category & ID</th>
                <th className="p-3.5">Task Description</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">Region</th>
                <th className="p-3.5">Priority SLA</th>
                <th className="p-3.5">Assigned Officer</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredQueue.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          item.category === 'CASE'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : item.category === 'AML'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : item.category === 'SANCTIONS'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        }`}
                      >
                        {item.category}
                      </span>
                      <span className="font-mono text-slate-300 font-semibold">{item.id}</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-semibold text-white">
                    <div>{item.title}</div>
                    {item.amount > 0 && (
                      <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                        {formatCurrency(item.amount, item.currency)}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-300 font-medium">{item.entityName}</td>
                  <td className="p-3.5 font-mono">
                    {item.jurisdiction === 'NG' ? '🇳🇬 NIGERIA' : '🇳🇪 NIGER'}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        item.priority === 'URGENT'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : item.priority === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-400">{item.assignedOfficer}</td>
                  <td className="p-3.5 text-right">
                    {item.category === 'CASE' && (
                      <button
                        onClick={() => setSelectedCase(item.raw as ComplianceCase)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition shadow"
                      >
                        Open Case
                      </button>
                    )}
                    {item.category === 'AML' && (
                      <button
                        onClick={() => convertAmlAlertToCase(item.id)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded transition shadow"
                      >
                        Triage AML
                      </button>
                    )}
                    {item.category === 'SANCTIONS' && (
                      <button
                        onClick={() => updateSanctionsAlertStatus(item.id, 'CONFIRMED_MATCH')}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition shadow"
                      >
                        Verify Match
                      </button>
                    )}
                    {item.category === 'KYC' && (
                      <button
                        onClick={() => {
                          setSelectedKyc(item.raw as KycVerificationRecord);
                          setKycType('KYC');
                        }}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded transition shadow"
                      >
                        Inspect KYC
                      </button>
                    )}
                    {item.category === 'KYB' && (
                      <button
                        onClick={() => {
                          setSelectedKyc(item.raw as KybVerificationRecord);
                          setKycType('KYB');
                        }}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded transition shadow"
                      >
                        Inspect KYB
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer & Modal integration */}
      <CaseInvestigationDrawer caseItem={selectedCase} onClose={() => setSelectedCase(null)} />
      <KycReviewModal record={selectedKyc} type={kycType} onClose={() => setSelectedKyc(null)} />
    </div>
  );
}
