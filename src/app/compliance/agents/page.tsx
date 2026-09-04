'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { RestrictionModal } from '@/components/compliance/RestrictionModal';
import { Users, Search, MapPin, ShieldCheck, Lock, Activity } from 'lucide-react';

export default function AgentsCompliancePage() {
  const { selectedJurisdiction, formatCurrency } = useCompliance();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRestrictionOpen, setIsRestrictionOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const mockAgents = [
    {
      id: 'AGT-NG-1001',
      name: 'Musa Bello Ventures',
      location: 'Sabon Gari Market, Kano, Nigeria',
      jurisdiction: 'NG' as const,
      status: 'ACTIVE',
      terminalCount: 4,
      dailyFloatLimit: 5000000,
      currentRiskScore: 22,
      lastAudit: '2026-08-15',
    },
    {
      id: 'AGT-NG-1044',
      name: 'Chukwuemeka POS Solutions',
      location: 'Wuse Zone 4, Abuja, Nigeria',
      jurisdiction: 'NG' as const,
      status: 'WARNING',
      terminalCount: 2,
      dailyFloatLimit: 2500000,
      currentRiskScore: 68,
      lastAudit: '2026-08-20',
    },
    {
      id: 'AGT-NE-2009',
      name: 'Niamey Grand Marché Kiosk',
      location: 'Grand Marché, Niamey, Niger',
      jurisdiction: 'NE' as const,
      status: 'ACTIVE',
      terminalCount: 3,
      dailyFloatLimit: 3000000,
      currentRiskScore: 18,
      lastAudit: '2026-08-28',
    },
    {
      id: 'AGT-NE-2088',
      name: 'Maradi Border Agency Point',
      location: 'Maradi Post, Niger',
      jurisdiction: 'NE' as const,
      status: 'RESTRICTED',
      terminalCount: 1,
      dailyFloatLimit: 1000000,
      currentRiskScore: 84,
      lastAudit: '2026-09-01',
    },
  ];

  const filtered = mockAgents.filter((a) => {
    if (selectedJurisdiction !== 'ALL' && a.jurisdiction !== selectedJurisdiction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.location.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            AGENT NETWORK GOVERNANCE
          </div>
          <h1 className="text-2xl font-extrabold text-white">Agent Network KYC & Risk Desk</h1>
          <p className="text-xs text-slate-400">
            Physical shop geolocation audits, POS float caps, and high-velocity cashout supervision.
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
            placeholder="Search agents by name, terminal ID, or market location..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
            <tr>
              <th className="p-3.5">Agent Point & ID</th>
              <th className="p-3.5">Physical Location</th>
              <th className="p-3.5">Active POS Nodes</th>
              <th className="p-3.5">Daily Float Limit</th>
              <th className="p-3.5">Risk Score</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Enforcement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((agent) => (
              <tr key={agent.id} className="hover:bg-slate-800/40">
                <td className="p-3.5">
                  <div className="font-bold text-white text-sm">{agent.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {agent.id} • {agent.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                  </div>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{agent.location}</span>
                  </div>
                </td>
                <td className="p-3.5 text-slate-300 font-mono font-semibold">{agent.terminalCount} Terminals</td>
                <td className="p-3.5 text-emerald-400 font-mono font-bold">
                  {formatCurrency(agent.dailyFloatLimit, agent.jurisdiction === 'NG' ? 'NGN' : 'XOF')}
                </td>
                <td className="p-3.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      agent.currentRiskScore > 70
                        ? 'bg-rose-500/20 text-rose-300'
                        : agent.currentRiskScore > 40
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    Score {agent.currentRiskScore}/100
                  </span>
                </td>
                <td className="p-3.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      agent.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : agent.status === 'WARNING'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {agent.status}
                  </span>
                </td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => {
                      setSelectedAgent(agent);
                      setIsRestrictionOpen(true);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-700 font-bold text-xs rounded transition flex items-center gap-1 ml-auto"
                  >
                    <Lock className="w-3 h-3" />
                    Restrict
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
          selectedAgent
            ? {
                id: selectedAgent.id,
                type: 'AGENT',
                name: selectedAgent.name,
                jurisdiction: selectedAgent.jurisdiction,
              }
            : undefined
        }
      />
    </div>
  );
}
