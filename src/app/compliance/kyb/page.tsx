'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { KycReviewModal } from '@/components/compliance/KycReviewModal';
import { KybVerificationRecord, KycStatus, BusinessType } from '@/types/compliance';
import {
  Building2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Layers,
} from 'lucide-react';

export default function KybPage() {
  const { kybRecords, selectedJurisdiction, formatDate } = useCompliance();
  const [selectedRecord, setSelectedRecord] = useState<KybVerificationRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | BusinessType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | KycStatus>('ALL');

  const filtered = kybRecords.filter((rec) => {
    if (selectedJurisdiction !== 'ALL' && rec.jurisdiction !== selectedJurisdiction) return false;
    if (typeFilter !== 'ALL' && rec.businessType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        rec.id.toLowerCase().includes(q) ||
        rec.businessName.toLowerCase().includes(q) ||
        rec.registrationNumber.toLowerCase().includes(q) ||
        rec.taxIdentificationNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            CORPORATE DUE DILIGENCE (KYB)
          </div>
          <h1 className="text-2xl font-extrabold text-white">Merchant & Corporate KYB</h1>
          <p className="text-xs text-slate-400">
            CAC & RCCM Registry checks, Ultimate Beneficial Ownership (UBO) tracing, and Director PEP screening.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by business name, RC number, or TIN..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Business Entities</option>
            <option value="LIMITED_COMPANY">Limited Liability Company</option>
            <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
            <option value="PARTNERSHIP">Partnership</option>
            <option value="NGO_NONPROFIT">NGO / Non-Profit</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All KYB Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_REVIEW">IN REVIEW</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* KYB Grid Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3.5">Business Entity & ID</th>
                <th className="p-3.5">Entity Type</th>
                <th className="p-3.5">Registry Ref (CAC/RCCM)</th>
                <th className="p-3.5">UBO Count</th>
                <th className="p-3.5">Risk Rating</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-white text-sm">{rec.businessName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {rec.id} • {rec.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-mono text-teal-400 font-bold bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40 text-[11px]">
                      {rec.businessType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-mono text-slate-200">RC: {rec.registrationNumber}</div>
                    <div className="font-mono text-slate-400 text-[11px]">TIN: {rec.taxIdentificationNumber}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="text-slate-300 font-semibold">{rec.beneficialOwners.length} UBO(s)</span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        rec.riskRating === 'HIGH' || rec.riskRating === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {rec.riskRating}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        rec.status === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : rec.status === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setSelectedRecord(rec)}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded transition shadow"
                    >
                      Review KYB
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <KycReviewModal record={selectedRecord} type="KYB" onClose={() => setSelectedRecord(null)} />
    </div>
  );
}
