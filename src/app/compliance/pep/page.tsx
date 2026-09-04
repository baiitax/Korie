'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { Eye, Search, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';

export default function PepScreeningPage() {
  const { selectedJurisdiction, formatDate } = useCompliance();
  const [searchQuery, setSearchQuery] = useState('');

  const mockPepList = [
    {
      id: 'PEP-NG-001',
      fullName: 'Hon. Bello Sani Garba',
      designation: 'Former State Commissioner for Trade & Investment',
      jurisdiction: 'NG' as const,
      category: 'DOMESTIC_PEP',
      tier: 'HIGH_RISK',
      associatedEntities: ['Kano Commodity Hub', 'Garba Logistics'],
      lastScreened: '2026-08-20',
      eddRequirement: 'ANNUAL_MANDATORY',
    },
    {
      id: 'PEP-NE-002',
      fullName: 'Dr. Mariam Soumana',
      designation: 'Senior Director, Ministry of Petroleum & Energy',
      jurisdiction: 'NE' as const,
      category: 'DOMESTIC_PEP',
      tier: 'HIGH_RISK',
      associatedEntities: ['Société Pétrolière du Sahel'],
      lastScreened: '2026-08-25',
      eddRequirement: 'ANNUAL_MANDATORY',
    },
    {
      id: 'PEP-NG-003',
      fullName: 'Tariq Al-Mansoor',
      designation: 'Foreign Diplomatic Envoy / Embassy Commercial Attaché',
      jurisdiction: 'NG' as const,
      category: 'FOREIGN_PEP',
      tier: 'MEDIUM_RISK',
      associatedEntities: ['Middle East Trade Desk'],
      lastScreened: '2026-09-01',
      eddRequirement: 'BIANNUAL_MANDATORY',
    },
  ];

  const filtered = mockPepList.filter((p) => {
    if (selectedJurisdiction !== 'ALL' && p.jurisdiction !== selectedJurisdiction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.id.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q) || p.designation.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Eye className="w-4 h-4" />
            POLITICALLY EXPOSED PERSONS REGISTER
          </div>
          <h1 className="text-2xl font-extrabold text-white">PEP Watchlist & Family Associates</h1>
          <p className="text-xs text-slate-400">
            Monitoring of domestic and foreign politically exposed persons, family members, and close business associates.
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
            placeholder="Search PEP records by official name, position, or associated business..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
            <tr>
              <th className="p-3.5">PEP Official & ID</th>
              <th className="p-3.5">Public Designation / Office</th>
              <th className="p-3.5">PEP Category</th>
              <th className="p-3.5">Associated Entities</th>
              <th className="p-3.5">EDD Schedule</th>
              <th className="p-3.5 text-right">Last Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((pep) => (
              <tr key={pep.id} className="hover:bg-slate-800/40">
                <td className="p-3.5">
                  <div className="font-bold text-white text-sm">{pep.fullName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {pep.id} • {pep.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                  </div>
                </td>
                <td className="p-3.5 text-slate-300 font-medium">{pep.designation}</td>
                <td className="p-3.5">
                  <span className="font-mono text-teal-400 font-bold bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40 text-[11px]">
                    {pep.category.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-3.5 text-slate-300">
                  {pep.associatedEntities.join(', ')}
                </td>
                <td className="p-3.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-500/20 text-amber-300">
                    {pep.eddRequirement.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-3.5 text-right font-mono text-slate-400 text-[11px]">
                  {pep.lastScreened}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
