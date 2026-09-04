'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { RestrictionModal } from '@/components/compliance/RestrictionModal';
import { Building2, Search, AlertTriangle, ShieldCheck, Lock, DollarSign } from 'lucide-react';

export default function HighRiskMerchantsPage() {
  const { selectedJurisdiction, formatCurrency } = useCompliance();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRestrictionOpen, setIsRestrictionOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);

  const mockMerchants = [
    {
      id: 'MER-NG-5501',
      name: 'Sahel Grain Trading Consortium',
      category: 'Cross-Border Commodity Trade',
      jurisdiction: 'NG' as const,
      riskLevel: 'HIGH',
      monthlyVolume: 85000000,
      chargebackRate: '0.12%',
      eddStatus: 'COMPLETED',
      settlementDelayHours: 24,
    },
    {
      id: 'MER-NG-5589',
      name: 'Apex Crypto Exchange P2P Desk',
      category: 'Digital Assets / Virtual Assets',
      jurisdiction: 'NG' as const,
      riskLevel: 'CRITICAL',
      monthlyVolume: 320000000,
      chargebackRate: '1.45%',
      eddStatus: 'IN_PROGRESS',
      settlementDelayHours: 72,
    },
    {
      id: 'MER-NE-9902',
      name: 'Société Sahélienne de Minéraux',
      category: 'Artisanal Mining & Commodities',
      jurisdiction: 'NE' as const,
      riskLevel: 'HIGH',
      monthlyVolume: 45000000,
      chargebackRate: '0.04%',
      eddStatus: 'ACTION_REQUIRED',
      settlementDelayHours: 48,
    },
  ];

  const filtered = mockMerchants.filter((m) => {
    if (selectedJurisdiction !== 'ALL' && m.jurisdiction !== selectedJurisdiction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            HIGH-RISK MERCHANT PORTFOLIO
          </div>
          <h1 className="text-2xl font-extrabold text-white">High-Risk Merchants & Settlement Controls</h1>
          <p className="text-xs text-slate-400">
            Enhanced supervision for high-velocity cross-border traders, FX brokers, and commodity merchants.
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
            placeholder="Search high-risk merchants by name, sector, or ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
            <tr>
              <th className="p-3.5">Merchant & ID</th>
              <th className="p-3.5">Industry Category</th>
              <th className="p-3.5">Monthly Volume</th>
              <th className="p-3.5">Chargeback Rate</th>
              <th className="p-3.5">EDD State</th>
              <th className="p-3.5">Settlement Delay</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-slate-800/40">
                <td className="p-3.5">
                  <div className="font-bold text-white text-sm">{m.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {m.id} • {m.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                  </div>
                </td>
                <td className="p-3.5 text-slate-300 font-medium">{m.category}</td>
                <td className="p-3.5 text-emerald-400 font-mono font-bold">
                  {formatCurrency(m.monthlyVolume, m.jurisdiction === 'NG' ? 'NGN' : 'XOF')}
                </td>
                <td className="p-3.5 font-mono text-slate-200 font-semibold">{m.chargebackRate}</td>
                <td className="p-3.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      m.eddStatus === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {m.eddStatus.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-3.5 text-amber-400 font-mono font-semibold">T+{m.settlementDelayHours}h Hold</td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => {
                      setSelectedMerchant(m);
                      setIsRestrictionOpen(true);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-700 font-bold text-xs rounded transition flex items-center gap-1 ml-auto"
                  >
                    <Lock className="w-3 h-3" />
                    Hold Payout
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RestrictionModal
        isOpen={isRestrictionOpen}
        onClose={() => setIsRestrictionOpen(false)}
        defaultEntity={
          selectedMerchant
            ? {
                id: selectedMerchant.id,
                type: 'MERCHANT',
                name: selectedMerchant.name,
                jurisdiction: selectedMerchant.jurisdiction,
              }
            : undefined
        }
      />
    </div>
  );
}
