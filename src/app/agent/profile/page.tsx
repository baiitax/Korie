"use client";

import React from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Smartphone,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

export default function AgentProfilePage() {
  const { agent, terminal, t } = useAgent();

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
            <span className="text-amber-400 font-bold">{terminal.terminalId} ({terminal.model})</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400">Compliance & KYC</span>
            <span className="text-emerald-400 font-bold">● {agent.kycStatus}</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-400">Sovereign Node</span>
            <span className="text-white font-bold">Providus Bank Nigeria (NIP Gateway)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
