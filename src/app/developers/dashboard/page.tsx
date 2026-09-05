"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  Radio,
  Key,
  ShieldCheck,
  Terminal,
  Cpu,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Copy,
  AlertTriangle,
  Play,
  Layers,
  ChevronRight,
} from 'lucide-react';
import CredentialModal from '@/components/developer/CredentialModal';
import WebhookModal from '@/components/developer/WebhookModal';
import SandboxSimulatorModal from '@/components/developer/SandboxSimulatorModal';
import ProductionAccessModal from '@/components/developer/ProductionAccessModal';

export default function DeveloperDashboardPage() {
  const {
    t,
    environment,
    organization,
    activeApplication,
    credentials,
    webhooks,
    webhookLogs,
    requestLogs,
    errorAnalytics,
    integrationChecklist,
    productionRequest,
  } = useDeveloper();

  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);

  const completedChecks = integrationChecklist.filter(c => c.status === 'COMPLETED').length;
  const readinessPercentage = Math.round((completedChecks / integrationChecklist.length) * 100);

  const activeEnvCreds = credentials.filter(c => c.environment === environment);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Hero Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0a1329] via-[#0b162f] to-[#070d1c] border border-white/10 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                COMMAND DASHBOARD
              </span>
              <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full ${
                environment === 'PRODUCTION' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                ● {environment} ACTIVE
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white">{t.dashboard.heroTitle}</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {t.dashboard.heroDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsSimModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Simulate Payment</span>
            </button>
            <button
              onClick={() => setIsCredModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Generate Key</span>
            </button>
            <button
              onClick={() => setIsProdModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Go-Live Access</span>
            </button>
          </div>
        </div>

        {/* Real-Time KPI Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[10px]">24H REQUESTS</span>
            <span className="text-white font-bold text-lg">18,450</span>
            <span className="text-[10px] text-emerald-400 block">+14% vs yesterday</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[10px]">SUCCESS RATE</span>
            <span className="text-emerald-400 font-bold text-lg">99.82%</span>
            <span className="text-[10px] text-slate-400 block">0.18% handled 4xx</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[10px]">AVG LATENCY</span>
            <span className="text-teal-300 font-bold text-lg">142ms</span>
            <span className="text-[10px] text-slate-400 block">Providus / Coris</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[10px]">GO-LIVE READINESS</span>
            <span className="text-amber-400 font-bold text-lg">{readinessPercentage}%</span>
            <span className="text-[10px] text-emerald-400 block">{completedChecks}/{integrationChecklist.length} Checks Done</span>
          </div>
        </div>
      </div>

      {/* Integration Lifecycle Tracker */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">Developer Onboarding & Go-Live Funnel</h3>
          </div>
          <Link href="/developers/testing" className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1">
            <span>View Full Scorecard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 text-xs font-mono">
          <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-emerald-400 space-y-1">
            <div className="text-[10px] text-slate-400">Step 1</div>
            <div className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Org Verified</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-emerald-400 space-y-1">
            <div className="text-[10px] text-slate-400">Step 2</div>
            <div className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sandbox Keys</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-emerald-400 space-y-1">
            <div className="text-[10px] text-slate-400">Step 3</div>
            <div className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>API Tested</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-emerald-400 space-y-1">
            <div className="text-[10px] text-slate-400">Step 4</div>
            <div className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Webhooks Live</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-emerald-400 space-y-1">
            <div className="text-[10px] text-slate-400">Step 5</div>
            <div className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Idempotency</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 text-amber-300 space-y-1">
            <div className="text-[10px] text-slate-400">Step 6</div>
            <div className="font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Prod Approved</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Recent API Traffic vs Active Credentials & Webhooks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent API Request Logs */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Recent API Request Stream</h3>
            </div>
            <Link href="/developers/logs" className="text-xs text-emerald-400 hover:underline font-mono">
              View All Logs →
            </Link>
          </div>

          <div className="space-y-2">
            {requestLogs.slice(0, 4).map(log => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.statusCode >= 200 && log.statusCode < 300
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {log.statusCode}
                  </span>
                  <span className="font-bold text-slate-300">{log.method}</span>
                  <span className="text-slate-400 truncate">{log.endpoint}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-slate-500 text-[10px]">
                  <span>{log.latencyMs}ms</span>
                  <span>{log.timestamp.split('T')[1].slice(0, 8)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href="/developers/explorer"
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test More Endpoints in Explorer</span>
            </Link>
          </div>
        </div>

        {/* Right: Active Credentials & Webhooks */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-white text-sm">Credentials & Webhooks</h3>
            </div>
            <button
              onClick={() => setIsCredModalOpen(true)}
              className="text-xs text-emerald-400 hover:underline font-mono"
            >
              + Add Key
            </button>
          </div>

          <div className="space-y-3">
            {activeEnvCreds.slice(0, 2).map(cred => (
              <div key={cred.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white">{cred.name}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-bold">
                    {cred.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="truncate">{cred.secretKeyMasked}</span>
                  <span className="text-[10px] text-slate-500">{cred.scopes.length} Scopes</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Radio className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-300 font-medium">{webhooks.length} Active Webhook Subscriptions</span>
            </div>
            <Link href="/developers/webhooks" className="text-xs font-bold text-teal-400 hover:underline">
              Manage Webhooks →
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CredentialModal isOpen={isCredModalOpen} onClose={() => setIsCredModalOpen(false)} />
      <WebhookModal isOpen={isWebhookModalOpen} onClose={() => setIsWebhookModalOpen(false)} />
      <SandboxSimulatorModal isOpen={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} />
      <ProductionAccessModal isOpen={isProdModalOpen} onClose={() => setIsProdModalOpen(false)} />
    </div>
  );
}
