"use client";

import React from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  GitPullRequest,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export default function ChangelogPage() {
  const releases = [
    {
      version: 'v1.4.0',
      date: '2026-08-15',
      title: 'Bilateral Atomic Settlement & EMVCo Standee Dynamic QR',
      type: 'FEATURE',
      summary: 'Introduced atomic bilateral corridor settlement between Nigeria (Providus) and Niger Republic (Coris Bank) with sub-second locks and EMV dynamic QR payloads.',
      changes: [
        'Added POST /v1/transfers/cross-border with guaranteed 60s FX lock.',
        'Added POST /v1/merchant/checkout dynamic QR standee generation.',
        'Added WAEMU central bank benchmark rate parity stream in /v1/fx/corridor-rates.',
      ],
    },
    {
      version: 'v1.3.2',
      date: '2026-06-20',
      title: 'Providus NIP Outward Retry Backoff & Idempotency Hardening',
      type: 'FIX',
      summary: 'Optimized outward NIP settlement retry backoff schedules and hardened duplicate Idempotency-Key locking.',
      changes: [
        'Enforced strict UUID v4 validation on all Idempotency-Key request headers.',
        'Upstream Providus NIP timeout handler now automatically parks transfers in PENDING for asynchronous reconciliation.',
      ],
    },
    {
      version: 'v1.3.0',
      date: '2026-05-18',
      title: 'Multi-Currency Escrow Holds & Sub-Accounts',
      type: 'FEATURE',
      summary: 'Added double-entry multi-currency wallet ledger holds and sub-account partitioning for aggregators.',
      changes: [
        'Added POST /v1/wallets/create with Tier 1/2/3 limit checks.',
        'Introduced wallet.hold_placed and wallet.hold_released webhook events.',
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            PLATFORM EVOLUTION & LIFECYCLE
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">API Changelog & Deprecations</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track major feature releases, contract improvements, security patches, and migration guidelines.
          </p>
        </div>
      </div>

      {/* Release Timeline */}
      <div className="space-y-6">
        {releases.map((rel, idx) => (
          <div
            key={rel.version}
            className="p-6 sm:p-8 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base sm:text-lg font-black text-emerald-400">
                  {rel.version}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded uppercase font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {rel.type}
                </span>
                <h3 className="font-bold text-white text-sm sm:text-base">{rel.title}</h3>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{rel.date}</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{rel.summary}</p>

            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Key Updates:</span>
              <ul className="space-y-1 text-xs text-slate-400 font-mono">
                {rel.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400">●</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
