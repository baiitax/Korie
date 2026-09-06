"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { agencyApiFetch } from "@/lib/agency/agentSession";
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Smartphone,
  MapPin,
  Phone,
  Mail,
  Gauge,
} from "lucide-react";

interface EffectiveLimits {
  daily_cash_limit: number;
  single_transaction_limit: number;
  today_spent: number;
  remaining_today: number;
  transaction_count_today: number;
}

export default function AgentProfilePage() {
  const { agent, terminal, t } = useAgent();
  const [limits, setLimits] = useState<EffectiveLimits | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await agencyApiFetch("/api/v1/agency/limits");
        const json = await res.json();
        if (res.ok && json.status === "success") setLimits(json.data);
      } catch {
        /* limits card degrades gracefully if unavailable */
      }
    })();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/agent"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            Agent Kiosk Profile
          </h1>
          <p className="text-xs text-slate-400">
            Registered agency banking location and compliance details.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black font-mono text-xl flex items-center justify-center">
            AG
          </div>
          <div>
            <div className="text-lg font-bold text-white">{agent.agentName}</div>
            <div className="text-xs text-slate-400">{agent.businessName}</div>
            <div className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
              Code: {agent.agentCode} • {agent.tier}
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/5 text-xs font-mono pt-2">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400">Operating Territory</span>
            <span className="text-white font-bold">{agent.cityOrLGA}, {agent.stateOrRegion}</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400">Assigned Smart POS</span>
            <span className="text-amber-400 font-bold">
              {terminal ? `${terminal.terminalId} (${terminal.model})` : agent.terminalId}
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400">Compliance & KYC</span>
            <span className="text-emerald-400 font-bold">● {agent.kycStatus}</span>
          </div>
        </div>

        <Link
          href="/agent/kyc"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold text-xs transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Manage KYC Documents</span>
        </Link>
      </div>

      {/* Effective Transaction Limits — server-computed, never client-derived */}
      {limits && (
        <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Gauge className="w-4 h-4 text-amber-400" />
            <span>Transaction Limits ({agent.tier})</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Daily Cash Usage</span>
                <span className="text-white font-bold">
                  ₦{limits.today_spent.toLocaleString()} / ₦{limits.daily_cash_limit.toLocaleString()}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      (limits.today_spent / Math.max(limits.daily_cash_limit, 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-white/5 pt-3">
              <span className="text-slate-400">Per-Transaction Limit</span>
              <span className="text-white font-bold">
                ₦{limits.single_transaction_limit.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Remaining Today</span>
              <span className="text-emerald-400 font-bold">
                ₦{limits.remaining_today.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Transactions Today</span>
              <span className="text-white font-bold">{limits.transaction_count_today}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
