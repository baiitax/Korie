"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import { ApiCategory } from '@/types/developer';
import {
  Database,
  Search,
  ArrowRight,
  Code2,
  Terminal,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  Layers,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export default function ApisCatalogPage() {
  const { apiProductsList, environment } = useDeveloper();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'ALL', label: 'All Products' },
    { id: 'payments', label: 'Payments & Transfers' },
    { id: 'merchant', label: 'Merchant & Dynamic QR' },
    { id: 'wallets', label: 'Wallets & Ledger' },
    { id: 'agency', label: 'Agency Banking & POS' },
    { id: 'fx_cross_border', label: 'FX & Bilateral Corridor' },
    { id: 'kyc', label: 'KYC & Identity' },
    { id: 'customers', label: 'Customer 360°' },
    { id: 'bills', label: 'Utility Bills & VAS' },
  ];

  const filteredProducts = apiProductsList.filter(prod => {
    const matchesCategory = selectedCategory === 'ALL' || prod.category === selectedCategory;
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.endpoints.some(e => e.path.toLowerCase().includes(searchQuery.toLowerCase()) || e.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            API CATALOG & MARKETPLACE
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">Discover KoriePay Financial APIs</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Enterprise REST endpoints for bilateral cross-border settlements, virtual accounts, and POS terminal operations.
          </p>
        </div>

        <Link
          href="/developers/explorer"
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
        >
          <Terminal className="w-4 h-4" />
          <span>Open API Explorer</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                  : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search endpoints..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(prod => (
          <div
            key={prod.id}
            className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {prod.version}
                </span>
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  {prod.endpoints.length} Endpoints
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                  {prod.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {prod.description}
                </p>
              </div>

              {/* Endpoint Preview Pill List */}
              <div className="space-y-1.5 pt-2">
                {prod.endpoints.slice(0, 3).map(ep => (
                  <div key={ep.id} className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        ep.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-slate-300 truncate text-[11px]">{ep.path}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <span>SDKs:</span>
                <span className="text-white font-semibold">{prod.sdks.slice(0, 3).join(', ')}</span>
              </div>
              <Link
                href={`/developers/apis/${prod.id}`}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>View Spec</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
