"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Users,
  Search,
  Plus,
  Zap,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  ChevronRight,
  Download,
} from "lucide-react";

export default function AggregatorAgentsPage() {
  const {
    agents,
    territories,
    selectedTerritoryId,
    setSelectedTerritoryId,
    formatCurrency,
    formatDate,
    openLiquidityModal,
    t,
  } = useAggregator();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredAgents = agents.filter((agt) => {
    const matchesTerritory =
      selectedTerritoryId === "ALL" || agt.territoryId === selectedTerritoryId;
    const matchesStatus = statusFilter === "ALL" || agt.status === statusFilter;
    const matchesSearch =
      agt.agentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agt.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agt.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agt.phone.includes(searchTerm);
    return matchesTerritory && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Agency Network Directory</h1>
          <p className="text-xs text-slate-400">
            Supervise authorized cash points, POS hardware terminals, drawer cash positions, and float levels
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => openLiquidityModal()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Top-up Agent Float</span>
          </button>
          <Link
            href="/aggregator/agents/onboarding"
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Onboard New Agent</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-[#091122] border border-white/10 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search agent code, name, phone, business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <select
              value={selectedTerritoryId}
              onChange={(e) => setSelectedTerritoryId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Territories</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="RESTRICTED">RESTRICTED</option>
              <option value="PENDING">PENDING</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="rounded-3xl bg-[#091122] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a16] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Agent Code & Name</th>
                <th className="px-4 py-3">Territory & Branch</th>
                <th className="px-4 py-3 text-right">Wallet Float</th>
                <th className="px-4 py-3 text-right">Cash in Drawer</th>
                <th className="px-4 py-3 text-right">Today's Volume</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredAgents.map((agt) => (
                <tr key={agt.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-white">{agt.fullName}</div>
                    <div className="text-[10px] text-teal-300 font-mono">
                      {agt.agentCode} • {agt.businessName}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-white">{agt.territoryName}</div>
                    <div className="text-[10px] text-slate-400">{agt.lga}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-teal-300">
                    {formatCurrency(agt.walletBalance)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                    {formatCurrency(agt.cashInDrawer)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                    {formatCurrency(agt.todayVolume)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        agt.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : agt.status === "RESTRICTED"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {agt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openLiquidityModal(agt.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/20"
                    >
                      Float Top-up
                    </button>
                    <Link
                      href={`/aggregator/agents/${agt.id}`}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-bold"
                    >
                      Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
