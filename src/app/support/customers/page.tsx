'use client';

import React, { useState } from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { Customer360Context } from '@/types/support';
import {
  Users,
  Search,
  ShieldCheck,
  CreditCard,
  Phone,
  Mail,
  Lock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function CustomersDirectoryPage() {
  const { customer360Map, selectedJurisdiction } = useSupport();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer360Context | null>(null);

  const customerList = Object.values(customer360Map);

  const filtered = customerList.filter((c) => {
    if (selectedJurisdiction !== 'ALL' && c.country !== selectedJurisdiction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.customerId.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.emailMasked.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            CUSTOMER 360° CONTEXT DESK
          </div>
          <h1 className="text-2xl font-extrabold text-white">Customer Support Profiles</h1>
          <p className="text-xs text-slate-400">
            Authorized context, masked identity data, KYC status, and security telemetry for frontline officers.
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
            placeholder="Search customers by ID, name, or phone..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.customerId}
            onClick={() => setSelectedCustomer(c)}
            className="bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between space-y-4 shadow-xl group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                  {c.customerId}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-500/20 text-emerald-300 font-mono">
                  {c.kycTier}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition">
                  {c.fullName}
                </h3>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {c.country === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'} • Registered {c.registrationDate}
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Wallet Balance:</span>
                  <span className="font-mono font-bold text-emerald-400">{c.walletBalanceMasked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Txns:</span>
                  <span className="font-semibold text-slate-200">{c.totalTransactionsCount} completed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Assessment:</span>
                  <span className="font-bold text-teal-400">{c.riskLevel} RISK</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">Phone: {c.phoneMasked}</span>
              <span className="text-teal-400 font-bold group-hover:underline flex items-center gap-1">
                Inspect 360° <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Customer 360 Modal Detail */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#090E1A] border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-teal-400">{selectedCustomer.customerId}</span>
                <h2 className="text-lg font-bold text-white">{selectedCustomer.fullName}</h2>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Email (Masked)</span>
                <div className="font-mono text-slate-200 mt-0.5">{selectedCustomer.emailMasked}</div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Phone (Masked)</span>
                <div className="font-mono text-slate-200 mt-0.5">{selectedCustomer.phoneMasked}</div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Wallet Balance</span>
                <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                  {selectedCustomer.walletBalanceMasked}
                </div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Account State</span>
                <div className="font-bold text-teal-300 text-sm mt-0.5">{selectedCustomer.accountStatus}</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="font-bold text-slate-300">Recent Security & Login Telemetry</div>
              {selectedCustomer.securityEvents.map((ev, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/60 last:border-0">
                  <span className="text-slate-300">{ev.event} ({ev.device})</span>
                  <span className="font-mono text-slate-500">{ev.timestamp}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
