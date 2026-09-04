"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  Activity,
  Zap,
} from "lucide-react";

export default function AggregatorRiskPage() {
  const { riskAlerts, acknowledgeRiskAlert, t } = useAggregator();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Risk & Fraud Command Desk</h1>
        <p className="text-xs text-slate-400">
          Continuous anomaly detection for velocity spikes, repeated POS terminal rejections, and abnormal cash drains
        </p>
      </div>

      {/* Risk Alerts Grid */}
      <div className="space-y-4">
        {riskAlerts.map((ra) => (
          <div
            key={ra.id}
            className="p-5 sm:p-6 rounded-3xl bg-[#091122] border border-white/10 hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-purple-300 text-sm">{ra.alertType}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {ra.severity} RISK
                </span>
                <span className="text-xs text-slate-400 font-mono">• {ra.entityType}: {ra.entityName}</span>
              </div>

              <p className="text-xs text-slate-300 max-w-2xl">{ra.details}</p>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-[11px] text-teal-300 font-mono">
                <span className="font-bold text-amber-400">Recommended Operational Action: </span>
                <span>{ra.recommendedAction}</span>
              </div>
            </div>

            <div className="shrink-0">
              {ra.status === "ACKNOWLEDGED" ? (
                <span className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-mono font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Acknowledged</span>
                </span>
              ) : (
                <button
                  onClick={() => acknowledgeRiskAlert(ra.id)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Acknowledge Alert
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
