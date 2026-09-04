"use client";

import React from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  Smartphone,
  BatteryCharging,
  Signal,
  Wifi,
  Radio,
  CheckCircle2,
  RefreshCw,
  Printer,
  CreditCard,
} from "lucide-react";

export default function AgentTerminalsPage() {
  const { terminal, agent, t } = useAgent();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {t("terminals.title")}
            </h1>
            <p className="text-xs text-slate-400">
              {t("terminals.subtitle")}
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>CONNECTED & ONLINE</span>
        </span>
      </div>

      {/* Terminal Hardware Diagnostic Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c162b] to-[#070e1b] border border-white/15 p-6 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-extrabold text-white">{terminal.model}</div>
              <div className="text-xs font-mono text-emerald-400">TID: {terminal.terminalId}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span>{terminal.batteryLevel}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Signal className="w-4 h-4 text-emerald-400" />
              <span>{terminal.networkType} (Strong)</span>
            </div>
          </div>
        </div>

        {/* Hardware Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Thermal Printer</span>
            </div>
            <span className="text-emerald-400 font-bold">READY</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>EMV Chip Reader</span>
            </div>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Firmware Version</span>
            </div>
            <span className="text-slate-300">{terminal.appVersion}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
