"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  MapPin,
  Users,
  Store,
  TrendingUp,
  ShieldCheck,
  Building2,
  Phone,
} from "lucide-react";

export default function AggregatorTerritoriesPage() {
  const { territories, formatCurrency, t } = useAggregator();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Territory Network Supervision</h1>
        <p className="text-xs text-slate-400">
          Geographical breakdown across Nigeria (Kano, Kaduna, Abuja, Lagos) and Niger Republic (Niamey, Maradi, Zinder)
        </p>
      </div>

      {/* Territories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {territories.map((terr) => (
          <div
            key={terr.id}
            className="p-6 rounded-3xl bg-[#091122] border border-white/10 hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-5"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg">{terr.name}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {terr.stateOrRegion} • {terr.lgaOrCommune}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {terr.country === "NG" ? "🇳🇬 Nigeria (NGN)" : "🇳🇪 Niger (XOF)"}
                </span>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-2xl border border-white/5 space-y-1.5 text-xs mt-4">
                <div className="flex justify-between text-slate-400">
                  <span>Territory Supervisor:</span>
                  <span className="text-white font-bold">{terr.supervisorName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Supervisor Direct Line:</span>
                  <span className="text-teal-300 font-mono">{terr.supervisorPhone}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Agency Nodes:</span>
                <span className="font-bold text-white">{terr.activeAgentsCount} Verified Agents</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Acquired Merchants:</span>
                <span className="font-bold text-white">{terr.activeMerchantsCount} Stores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Today's TPV:</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(terr.todayTPV)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Aggregator Commission:</span>
                <span className="font-mono font-bold text-amber-400">{formatCurrency(terr.aggregatorCommissionToday)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
