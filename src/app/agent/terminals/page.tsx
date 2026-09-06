"use client";

import React from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  Smartphone,
  Signal,
  Radio,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  OFFLINE: "bg-rose-500/15 border-rose-500/30 text-rose-300",
  MAINTENANCE: "bg-amber-500/15 border-amber-500/30 text-amber-300",
};

export default function AgentTerminalsPage() {
  const { terminal, isTerminalLoading, agent, t } = useAgent();

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

        {terminal && (
          <span
            className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 ${
              STATUS_STYLES[terminal.status] || STATUS_STYLES.ACTIVE
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{terminal.status}</span>
          </span>
        )}
      </div>

      {isTerminalLoading ? (
        <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-6 space-y-4 animate-pulse">
          <div className="h-5 w-40 rounded bg-white/10" />
          <div className="h-4 w-64 rounded bg-white/5" />
          <div className="h-24 rounded-2xl bg-white/5" />
        </div>
      ) : !terminal ? (
        <div className="p-6 rounded-3xl bg-[#090f1e] border border-white/10 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm text-slate-300 font-semibold">No terminal assigned yet</p>
          <p className="text-xs text-slate-500">
            Your account (terminal ID {agent.terminalId || "pending"}) has not been provisioned
            with a POS terminal record. Contact support if you already have physical hardware.
          </p>
        </div>
      ) : (
        <>
          {/* Terminal Hardware Card */}
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
                  <Signal className="w-4 h-4 text-emerald-400" />
                  <span>{terminal.networkType}</span>
                </div>
              </div>
            </div>

            {/* Terminal Status Grid — real fields only, no fabricated sensor readouts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Serial Number</span>
                </div>
                <span className="text-slate-300">{terminal.serialNumber || "—"}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>App Version</span>
                </div>
                <span className="text-slate-300">{terminal.appVersion}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Last Sync</span>
                </div>
                <span className="text-slate-300">
                  {terminal.lastSyncTime ? new Date(terminal.lastSyncTime).toLocaleString() : "—"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
