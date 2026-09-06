"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  Building2,
  Plus,
  MapPin,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Users,
  CreditCard,
  X,
} from "lucide-react";
import { MerchantBranch } from "@/types/merchant";

export default function MerchantBranchesPage() {
  const { branches, totalActiveTerminals, formatCurrency, merchant, t } = useMerchant();
  const [selectedBranch, setSelectedBranch] = useState<MerchantBranch | null>(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Multi-Branch Store Management</h1>
          <p className="text-xs text-slate-400">
            Control physical retail branches, cashier assignments, and regional revenue flows.
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-400 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          {totalActiveTerminals} Active Terminal{totalActiveTerminals === 1 ? "" : "s"} business-wide
        </span>
      </div>

      {/* Branches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-5"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{branch.branchName}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>
                      {branch.address}, {branch.city}, {branch.stateOrRegion}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {branch.status}
                </span>
              </div>

              {/* Virtual Pos Transfer Account */}
              <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 space-y-1 mt-4">
                <div className="text-[10px] font-mono uppercase text-slate-400">Store In-Transfer NUBAN</div>
                <div className="font-mono font-bold text-teal-300 text-sm">{branch.virtualNuban || "Not yet provisioned"}</div>
                <div className="text-[10px] text-slate-500">Providus Bank Instant Routing</div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Branch Manager:</span>
                <span className="text-slate-200 font-medium">{branch.managerName || "Corporate Assigned"}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Today's Revenue:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(branch.todayGrossSales)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Today's Transactions:</span>
                <span className="font-mono font-bold text-white">{branch.todayTransactionsCount || 0}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedBranch(branch)}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-teal-500/10 border border-white/10 hover:border-teal-500/30 text-xs font-bold text-teal-300 transition-colors"
            >
              View Branch Terminal Setup
            </button>
          </div>
        ))}
      </div>

      {/* Branch Modal */}
      {selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0c1324] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">{selectedBranch.branchName}</h3>
                <p className="text-xs text-slate-400 font-mono">Store Branch Settings</p>
              </div>
              <button
                onClick={() => setSelectedBranch(null)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-1">
                <div className="text-slate-400">Location:</div>
                <div className="font-bold text-white">
                  {selectedBranch.address}, {selectedBranch.city}, {selectedBranch.country}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-1">
                <div className="text-slate-400">Assigned Cashier NUBAN:</div>
                <div className="font-mono font-bold text-teal-300 text-sm">{selectedBranch.virtualNuban || "Not yet provisioned"}</div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-1">
                <div className="text-slate-400">Today's Transactions:</div>
                <div className="text-white font-medium">{selectedBranch.todayTransactionsCount || 0}</div>
              </div>
            </div>

            <button
              onClick={() => setSelectedBranch(null)}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
