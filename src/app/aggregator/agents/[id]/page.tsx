"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Users,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Smartphone,
  MapPin,
  Coins,
  Receipt,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function AgentProfilePage() {
  const params = useParams();
  const { agents, formatCurrency, formatDate, openLiquidityModal, t } = useAggregator();

  const agent = agents.find((a) => a.id === params.id) || agents[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <Link
        href="/aggregator/agents"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Agent Directory</span>
      </Link>

      {/* Header Profile Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              {agent.fullName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{agent.fullName}</h1>
              <div className="text-xs text-[var(--foreground-muted)] flex items-center gap-2 mt-0.5">
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{agent.agentCode}</span>
                <span>•</span>
                <span>{agent.businessName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{agent.kycTier} • {agent.kycStatus}</span>
            </span>
            <button
              onClick={() => openLiquidityModal(agent.id)}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Inject Float</span>
            </button>
          </div>
        </div>

        {/* Financial & Drawer Balances */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--border)]">
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
            <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Wallet Float</div>
            <div className="text-lg font-bold font-mono text-teal-600 dark:text-teal-300">{formatCurrency(agent.walletBalance)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
            <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Physical Drawer Cash</div>
            <div className="text-lg font-bold font-mono text-[var(--foreground)]">{formatCurrency(agent.cashInDrawer)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
            <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Today's Commission</div>
            <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{formatCurrency(agent.todayCommission)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
            <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Success SLA</div>
            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{agent.successRate}%</div>
          </div>
        </div>
      </div>

      {/* Identity & Device Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <h3 className="font-bold text-[var(--foreground)] text-sm">Territory & Contact Location</h3>
          <div className="space-y-2 text-[var(--foreground)]">
            <div className="flex justify-between">
              <span className="text-[var(--foreground-muted)]">Territory:</span>
              <span className="font-medium text-[var(--foreground)]">{agent.territoryName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--foreground-muted)]">State / LGA:</span>
              <span>{agent.state} ({agent.lga})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--foreground-muted)]">Phone:</span>
              <span className="font-mono">{agent.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--foreground-muted)]">Registered:</span>
              <span className="font-mono">{agent.registeredAt}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <h3 className="font-bold text-[var(--foreground)] text-sm">Hardware Terminals & Risk State</h3>
          <div className="space-y-2 text-[var(--foreground)]">
            <div className="flex justify-between">
              <span className="text-[var(--foreground-muted)]">Active POS Hardware:</span>
              <span className="font-bold text-[var(--foreground)]">{agent.posTerminalCount} PAX Certified Devices</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--foreground-muted)]">Risk Assessment:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{agent.riskStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--foreground-muted)]">Monthly Volume:</span>
              <span className="font-mono text-teal-600 dark:text-teal-300 font-bold">{formatCurrency(agent.monthlyVolume)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--foreground-muted)]">Last Telemetry:</span>
              <span className="text-[var(--foreground-muted)]">{agent.lastActiveAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
