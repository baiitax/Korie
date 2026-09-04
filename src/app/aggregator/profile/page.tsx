"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

export default function AggregatorProfilePage() {
  const { aggregator, t } = useAggregator();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Corporate Profile</h1>
        <p className="text-xs text-slate-400">
          Statutory licensing records, Tier-1 super-aggregator mandate, and registered banking node configuration
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#091122] border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              S
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">{aggregator.name}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="font-mono text-amber-400 font-bold">{aggregator.code}</span>
                <span>•</span>
                <span>{aggregator.tier.replace(/_/g, " ")}</span>
              </div>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4" />
            <span>CBN LICENSED SUPER AGGREGATOR</span>
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">CAC Incorporation Number</div>
            <div className="font-mono font-bold text-white text-sm">{aggregator.rcNumber}</div>
            <div className="text-slate-500">Corporate Affairs Commission (Nigeria)</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Registered Headquarters</div>
            <div className="font-bold text-white text-sm">Sahel Commerce Tower, Kano</div>
            <div className="text-slate-400">Plot 88 Victoria Island, Lagos</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Primary Email & Contact</div>
            <div className="font-bold text-white text-sm">{aggregator.contactEmail}</div>
            <div className="text-slate-400 font-mono">{aggregator.contactPhone}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Corporate Settlement Bank</div>
            <div className="font-bold text-white text-sm">{aggregator.settlementBank}</div>
            <div className="text-teal-300 font-mono">{aggregator.settlementAccountMasked}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
