"use client";

import React from 'react';
import Link from 'next/link';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Code2,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Zap,
  Globe2,
  Layers,
  Cpu,
  Radio,
  BookOpen,
  Key,
  BarChart3,
  Server,
  Activity,
  ArrowUpRight,
} from 'lucide-react';

export default function DevelopersLandingPage() {
  const { t, environment, statusNodes, apiProductsList } = useDeveloper();

  const totalEndpoints = apiProductsList.reduce((acc, p) => acc + p.endpoints.length, 0);

  const pillars = [
    {
      title: 'Bilateral Cross-Border Settlement',
      desc: 'Instant NGN (Providus Bank Nigeria) to XOF (Coris Bank Niger Republic) settlement with sub-second atomic locking.',
      icon: Globe2,
      tag: 'Bilateral WAEMU',
    },
    {
      title: 'Dynamic Virtual NUBANs & QR',
      desc: 'Instantly allocate dedicated collection accounts and dynamic EMV QR codes for retail point-of-sale checkout.',
      icon: Zap,
      tag: 'Merchant Collections',
    },
    {
      title: 'Idempotent Financial Ledger',
      desc: 'Server-side enforced UUID v4 Idempotency-Key headers prevent double debits and race condition balance drift.',
      icon: ShieldCheck,
      tag: 'Zero Balance Drift',
    },
    {
      title: 'HMAC Webhooks & Event Replay',
      desc: 'Cryptographically signed webhooks with exponential retry backoff and controlled manual replay capability.',
      icon: Radio,
      tag: 'Real-Time Sync',
    },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1329] via-[#080d1a] to-[#040812] border border-white/10 p-6 sm:p-10 lg:p-14">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            <Code2 className="w-3.5 h-3.5" />
            <span>KORIEPAY DEVELOPER ECOSYSTEM • v1.4 LIVE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            The Financial API Infrastructure for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">Nigeria & Niger Republic</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Integrate instant cross-border payments, dedicated virtual accounts, smart POS agency terminals, and automated webhooks with high-performance REST APIs.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/developers/dashboard"
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <span>Open Developer Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/developers/explorer"
              className="px-5 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Interactive API Explorer</span>
            </Link>
            <Link
              href="/developers/docs"
              className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>API Reference</span>
            </Link>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 mt-10 border-t border-white/10 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-500 block text-[10px]">API PRODUCTS</span>
            <span className="text-white font-bold text-base">{apiProductsList.length} Categories</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-500 block text-[10px]">TOTAL ENDPOINTS</span>
            <span className="text-emerald-400 font-bold text-base">{totalEndpoints} REST Routes</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-500 block text-[10px]">SYSTEM UPTIME</span>
            <span className="text-teal-300 font-bold text-base">99.94% 90d</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-500 block text-[10px]">ACTIVE ENVIRONMENT</span>
            <span className="text-amber-400 font-bold text-base">{environment}</span>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Engineered for Production Fintech</h2>
            <p className="text-xs text-slate-400">Strict zero-data-loss architecture across Providus Bank & Coris Bank networks.</p>
          </div>
          <Link href="/developers/apis" className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1">
            <span>Explore All APIs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 hover:border-emerald-500/30 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                    {p.tag}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">{p.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Developer Experience Workflow Grid */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#080e1d] border border-white/10 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            INTEGRATION LIFECYCLE
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">From Sandbox to Live Settlement</h2>
          <p className="text-xs text-slate-400">
            A frictionless, self-service developer workflow backed by automated verification gates and enterprise auditability.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
            <div className="text-xs font-mono font-bold text-emerald-400">01. DISCOVER & TEST</div>
            <div className="font-bold text-white text-sm">Sandbox Credentials</div>
            <p className="text-xs text-slate-400">Generate isolated sandbox keys, test endpoints in the explorer, and simulate edge-case responses.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
            <div className="text-xs font-mono font-bold text-indigo-400">02. INTEGRATE</div>
            <div className="font-bold text-white text-sm">SDKs & Webhooks</div>
            <p className="text-xs text-slate-400">Install Node, Python, PHP, or Go SDKs. Register HTTPS endpoints with HMAC-SHA256 signature verification.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
            <div className="text-xs font-mono font-bold text-amber-400">03. VERIFY</div>
            <div className="font-bold text-white text-sm">Readiness Scorecard</div>
            <p className="text-xs text-slate-400">Pass the 6-point automated integration checklist (Idempotency, error handling, IP whitelisting).</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
            <div className="text-xs font-mono font-bold text-teal-400">04. GO LIVE</div>
            <div className="font-bold text-white text-sm">Production Settlement</div>
            <p className="text-xs text-slate-400">Submit settlement bank verification (Providus/Coris) to receive live production secret keys.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
