'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { KycReviewModal } from '@/components/compliance/KycReviewModal';
import { KycVerificationRecord, KycStatus, KycTier } from '@/types/compliance';
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function KycPage() {
  const { kycRecords, selectedJurisdiction, formatDate } = useCompliance();
  const [selectedRecord, setSelectedRecord] = useState<KycVerificationRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | KycTier>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | KycStatus>('ALL');

  const filtered = kycRecords.filter((rec) => {
    if (selectedJurisdiction !== 'ALL' && rec.jurisdiction !== selectedJurisdiction) return false;
    if (tierFilter !== 'ALL' && rec.tier !== tierFilter) return false;
    if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        rec.id.toLowerCase().includes(q) ||
        rec.customerName.toLowerCase().includes(q) ||
        rec.email.toLowerCase().includes(q) ||
        rec.maskedNin.toLowerCase().includes(q)
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
            <UserCheck className="w-4 h-4" />
            CUSTOMER IDENTITY & DUE DILIGENCE
          </div>
          <h1 className="text-2xl font-extrabold text-white">Customer KYC Verification</h1>
          <p className="text-xs text-slate-400">
            Tier-1 to Tier-3 identity checks, NIN/BVN validation, biometric liveness, and address verifications.
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
            placeholder="Search by name, ID, NIN, or email..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All KYC Tiers</option>
            <option value="TIER_1">TIER 1 (Basic / Phone)</option>
            <option value="TIER_2">TIER 2 (NIN / ID Proof)</option>
            <option value="TIER_3">TIER 3 (Full / Utility Proof)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_REVIEW">IN REVIEW</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* KYC Grid Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3.5">Customer & ID</th>
                <th className="p-3.5">KYC Tier</th>
                <th className="p-3.5">Identity (NIN/BVN)</th>
                <th className="p-3.5">Address Proof</th>
                <th className="p-3.5">Risk Rating</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-white text-sm">{rec.customerName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {rec.id} • {rec.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[11px]">
                      {rec.tier}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-mono text-slate-200">NIN: {rec.maskedNin}</div>
                    {rec.maskedBvn && (
                      <div className="font-mono text-slate-400 text-[11px]">BVN: {rec.maskedBvn}</div>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        rec.addressVerificationStatus === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {rec.addressVerificationStatus}
                    </span>
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
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition shadow"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <KycReviewModal record={selectedRecord} type="KYC" onClose={() => setSelectedRecord(null)} />
    </div>
  );
}
