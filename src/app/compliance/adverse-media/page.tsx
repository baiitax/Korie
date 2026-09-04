'use client';

import React, { useState } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { Globe, Search, ExternalLink, AlertTriangle, Newspaper, ShieldAlert } from 'lucide-react';

export default function AdverseMediaPage() {
  const { selectedJurisdiction, formatDate } = useCompliance();
  const [searchQuery, setSearchQuery] = useState('');

  const mockNews = [
    {
      id: 'MED-2026-801',
      title: 'EFCC probes unlicensed FX arbitrage operators in Northern Nigeria corridor',
      source: 'BusinessDay Nigeria / Daily Trust',
      date: '2026-08-29',
      jurisdiction: 'NG' as const,
      sentiment: 'HIGH_RISK_FINANCIAL_CRIME',
      matchedEntities: ['Danladi FX Hub', 'Kano FX Arbitrage Desk'],
      summary: 'Special enforcement actions conducted targeting unrecorded cross-border settlement desks operating parallel liquidity channels.',
    },
    {
      id: 'MED-2026-802',
      title: 'CENTIF Niger issues advisory on gold export payment laundering typologies',
      source: 'Le Sahel / Journal Officiel du Niger',
      date: '2026-08-22',
      jurisdiction: 'NE' as const,
      sentiment: 'REGULATORY_ALERT',
      matchedEntities: ['Société Minière de Tillabéri'],
      summary: 'Financial Intelligence Unit issues guidance warning banks regarding artisanal bullion trade structuring.',
    },
    {
      id: 'MED-2026-803',
      title: 'Interpol and NFIU issue joint notice on international identity cloning networks',
      source: 'Punch News / NFIU Intelligence Bulletin',
      date: '2026-08-14',
      jurisdiction: 'NG' as const,
      sentiment: 'HIGH_RISK_IDENTITY_FRAUD',
      matchedEntities: ['Unspecified Cyber Gang Syndicate'],
      summary: 'Syndicate forging National Identity Numbers (NIN) to bypass Tier-2 fintech digital onboarding.',
    },
  ];

  const filtered = mockNews.filter((n) => {
    if (selectedJurisdiction !== 'ALL' && n.jurisdiction !== selectedJurisdiction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.source.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4" />
            GLOBAL ADVERSE MEDIA & NEWS MONITORING
          </div>
          <h1 className="text-2xl font-extrabold text-white">Adverse Media & Negative News Desk</h1>
          <p className="text-xs text-slate-400">
            Real-time sentiment screening across global press, regulatory circulars, and investigative disclosures.
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
            placeholder="Search adverse news articles by headline, keywords, or publication..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between space-y-3 shadow-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-800 text-teal-400 rounded-lg">
                  <Newspaper className="w-4 h-4" />
                </span>
                <span className="font-bold text-white text-base">{item.title}</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                  item.sentiment.includes('HIGH_RISK')
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {item.sentiment.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 leading-relaxed">
              {item.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span>Source: <strong className="text-slate-200">{item.source}</strong></span>
                <span>•</span>
                <span>Region: {item.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}</span>
                <span>•</span>
                <span>Date: {item.date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-slate-500">Entities flagged:</span>
                <span className="text-emerald-400 font-semibold">{item.matchedEntities.join(', ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
