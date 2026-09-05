'use client';

import React, { useState } from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { TransactionInvestigationContext } from '@/types/support';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  FileText,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function TransactionInvestigationPage() {
  const { transactionInvestigationMap, formatCurrency, formatDate } = useSupport();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransactionInvestigationContext | null>(null);

  const txList = Object.values(transactionInvestigationMap);

  const filtered = txList.filter((tx) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.transactionId.toLowerCase().includes(q) ||
        tx.reference.toLowerCase().includes(q) ||
        tx.originEntity.toLowerCase().includes(q) ||
        tx.destinationEntity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Search className="w-4 h-4" />
            LEDGER & SWITCH TELEMETRY
          </div>
          <h1 className="text-2xl font-extrabold text-white">Transaction Investigation Desk</h1>
          <p className="text-xs text-slate-400">
            Lifecycle traces, NIBSS Session IDs, Providus Bank NG & Coris Bank NE gateway logs.
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
            placeholder="Search by transaction ID, NIBSS reference, or customer name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((tx) => (
          <div
            key={tx.transactionId}
            className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl"
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                  {tx.transactionId}
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono font-bold">
                  {tx.channel}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                    tx.status === 'SUCCESSFUL'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : tx.status === 'FAILED'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {tx.status}
                </span>
                <span className="text-xs font-mono text-slate-400 font-semibold">{tx.reference}</span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/60 text-xs space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Origin: <strong className="text-white">{tx.originEntity}</strong></span>
                  <span>Destination: <strong className="text-white">{tx.destinationEntity}</strong></span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/60 font-mono text-[11px]">
                  <span>Provider: {tx.providerNode}</span>
                  <span>Ledger: <strong className="text-emerald-400">{tx.ledgerPostingStatus}</strong></span>
                </div>
              </div>

              {/* Lifecycle stages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                {tx.timeline.map((step, idx) => (
                  <div key={idx} className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] space-y-0.5">
                    <div className="flex justify-between font-semibold text-slate-200">
                      <span>{step.stage}</span>
                      <span className="text-[10px] font-mono text-slate-500">{step.timestamp}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">{step.details}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-right flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold">Transaction Value</div>
                <div className="text-lg font-extrabold text-emerald-400 font-mono">
                  {formatCurrency(tx.amount, tx.currency)}
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                Auto-Refund: {tx.canAutomateRefund ? 'ELIGIBLE' : 'MANUAL'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
