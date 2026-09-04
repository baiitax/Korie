"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Building2,
  MapPin,
  Users,
  Store,
  CheckCircle2,
  Phone,
} from "lucide-react";

export default function AggregatorBranchesPage() {
  const { aggregator, t } = useAggregator();

  const branches = [
    {
      id: "br-kn-01",
      name: "Sahel Syndicate Kano Central Hub",
      address: "Suite 402, Sahel Commerce Tower, Murtala Mohammed Way",
      city: "Kano",
      state: "Kano State",
      country: "NG",
      manager: "Mukhtar Dan-Iya",
      phone: "+234 64 881 920",
      assignedAgents: 114,
      assignedMerchants: 42,
    },
    {
      id: "br-abj-02",
      name: "Abuja FCT Regional Operations Center",
      address: "Plot 104, Aminu Kano Crescent, Wuse 2",
      city: "Abuja",
      state: "FCT",
      country: "NG",
      manager: "Ngozi Eze",
      phone: "+234 9 441 9002",
      assignedAgents: 48,
      assignedMerchants: 14,
    },
    {
      id: "br-nia-03",
      name: "Niamey BCEAO Cross-Border Hub",
      address: "Avenue du Général de Gaulle, Zone Industrielle",
      city: "Niamey",
      state: "Niamey Region",
      country: "NE",
      manager: "Seydou Kountché",
      phone: "+227 90 88 77 66",
      assignedAgents: 30,
      assignedMerchants: 10,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Regional Operations Hubs</h1>
        <p className="text-xs text-slate-400">
          Physical support offices, cashier distribution centers, and field supervisor headquarters
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {branches.map((b) => (
          <div
            key={b.id}
            className="p-6 rounded-3xl bg-[#091122] border border-white/10 hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {b.country === "NG" ? "🇳🇬 NGN" : "🇳🇪 XOF"}
                </span>
              </div>

              <h3 className="font-bold text-white text-base mt-3 leading-snug">{b.name}</h3>
              <div className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{b.address}, {b.city}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Hub Lead:</span>
                <span className="text-white font-medium">{b.manager}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Phone:</span>
                <span className="text-teal-300 font-mono">{b.phone}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-white/5">
                <span>Network Scope:</span>
                <span className="text-slate-200 font-medium">{b.assignedAgents} Agents • {b.assignedMerchants} Merchants</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
