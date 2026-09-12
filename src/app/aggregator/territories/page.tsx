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
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Territory Network Supervision</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Geographical breakdown across Nigeria (Kano, Kaduna, Abuja, Lagos) and Niger Republic (Niamey, Maradi, Zinder)
        </p>
      </div>

      {/* Territories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {territories.map((terr) => (
          <div
            key={terr.id}
            className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-5"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-[var(--foreground)] text-lg">{terr.name}</h3>
                  <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                    {terr.stateOrRegion} • {terr.lgaOrCommune}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {terr.country === "NG" ? "🇳🇬 Nigeria (NGN)" : "🇳🇪 Niger (XOF)"}
                </span>
              </div>

              <div className="p-3.5 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] space-y-1.5 text-xs mt-4">
                <div className="flex justify-between text-[var(--foreground-muted)]">
                  <span>Territory Supervisor:</span>
                  <span className="text-[var(--foreground)] font-bold">{terr.supervisorName}</span>
                </div>
                <div className="flex justify-between text-[var(--foreground-muted)]">
                  <span>Supervisor Direct Line:</span>
                  <span className="text-teal-600 dark:text-teal-300 font-mono">{terr.supervisorPhone}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border)] text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Active Agency Nodes:</span>
                <span className="font-bold text-[var(--foreground)]">{terr.activeAgentsCount} Verified Agents</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Acquired Merchants:</span>
                <span className="font-bold text-[var(--foreground)]">{terr.activeMerchantsCount} Stores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Today's TPV:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(terr.todayTPV)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Aggregator Commission:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(terr.aggregatorCommissionToday)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
