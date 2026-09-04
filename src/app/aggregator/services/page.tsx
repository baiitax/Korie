"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Radio,
  CheckCircle2,
  AlertCircle,
  Building2,
  Activity,
  Zap,
} from "lucide-react";

export default function AggregatorServicesPage() {
  const { services, aggregator, t } = useAggregator();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Banking Nodes & Service Availability</h1>
        <p className="text-xs text-slate-400">
          Real-time telemetry on Providus Bank Nigeria, Koris Bank Niger Republic, Interswitch POS, and NIBSS gateways
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {services.map((srv) => (
          <div
            key={srv.serviceId}
            className="p-6 rounded-3xl bg-[#091122] border border-white/10 hover:border-teal-500/30 transition-all space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-base">{srv.serviceName}</h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Node Provider: {srv.providerNode}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{srv.status}</span>
              </span>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-2xl border border-white/5 grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <div className="text-slate-400">Uptime SLA (30d):</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">{srv.uptimePercentage}%</div>
              </div>
              <div>
                <div className="text-slate-400">Average Latency:</div>
                <div className="text-teal-300 font-bold text-sm mt-0.5">{srv.averageLatencyMs} ms</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
