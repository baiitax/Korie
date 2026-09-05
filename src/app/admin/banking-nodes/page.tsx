"use client";

import React, { useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { BANKING_NODES } from "@/services/adminDataService";
import {
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Globe2,
  ShieldCheck,
  ArrowRight,
  Radio,
  Clock,
  Layers,
  Database,
} from "lucide-react";

export default function BankingNodesPage() {
  const { openMakerChecker } = useAdmin();
  const [nodes, setNodes] = useState(BANKING_NODES);
  const [pingingNodeId, setPingingNodeId] = useState<string | null>(null);

  const handlePing = (nodeId: string) => {
    setPingingNodeId(nodeId);
    setTimeout(() => {
      setPingingNodeId(null);
    }, 800);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CORE BANKING INFRASTRUCTURE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Financial Institution Gateway Nodes
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status, API latency, webhooks, and settlement clearing for Providus Bank (Nigeria) and Coris Bank (Niger Republic).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPingingNodeId("all");
              setTimeout(() => setPingingNodeId(null), 1000);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${pingingNodeId ? "animate-spin" : ""}`} />
            <span>Health Check All Nodes</span>
          </button>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl space-y-6 relative overflow-hidden"
          >
            {/* Top Node Title & Health Status */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {node.countryCode === "NG" ? "🇳🇬" : node.countryCode === "NE" ? "🇳🇪" : "🌍"}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">{node.name}</h3>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{node.institution}</div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{node.health}</span>
              </span>
            </div>

            {/* Telemetry Metrics Bar */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                <span className="text-slate-500 block text-[9px] uppercase">Latency</span>
                <span className="text-emerald-400 font-bold text-sm">{node.latencyMs}ms</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                <span className="text-slate-500 block text-[9px] uppercase">24h Uptime</span>
                <span className="text-white font-bold text-sm">{node.uptime24h}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                <span className="text-slate-500 block text-[9px] uppercase">Success</span>
                <span className="text-amber-400 font-bold text-sm">{node.successRate}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                <span className="text-slate-500 block text-[9px] uppercase">Currency</span>
                <span className="text-white font-bold text-sm">{node.currency}</span>
              </div>
            </div>

            {/* Provider Technical Capabilities */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Active Banking Rails & Features:
              </span>
              <div className="space-y-1.5">
                {node.supportedServices.map((svc, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{svc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Node Operations Footer */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-400 font-mono text-[11px]">
                Last Sync: {new Date(node.lastSuccessfulRequest).toLocaleTimeString()}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePing(node.id)}
                  disabled={pingingNodeId === node.id}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {pingingNodeId === node.id ? "Pinging..." : "Test Ping"}
                </button>
                <button
                  onClick={() =>
                    openMakerChecker({
                      id: `mc-failover-${node.id}`,
                      actionType: "PROVIDER_FAILOVER",
                      resourceType: "BANKING_NODE",
                      resourceId: node.id,
                      resourceName: node.name,
                      countryCode: node.countryCode,
                      requestedBy: "infrastructure.lead@koriepay.com",
                      requestedAt: new Date().toISOString(),
                      reason: "Scheduled provider maintenance failover verification",
                      payload: { nodeId: node.id, activeFailover: !node.isFailoverActive },
                      status: "PENDING",
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold transition-colors"
                >
                  Failover Protocol
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
