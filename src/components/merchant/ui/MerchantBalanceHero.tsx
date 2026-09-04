"use client";

import React from "react";
import { useMerchant } from "../MerchantContext";
import {
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  Link as LinkIcon,
  FileText,
  Clock,
  Building2,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export const MerchantBalanceHero: React.FC = () => {
  const {
    merchant,
    formatCurrency,
    isBalanceHidden,
    setIsReceiveModalOpen,
    setIsCreateLinkModalOpen,
    setIsCreateInvoiceModalOpen,
    t,
  } = useMerchant();

  const mask = (val: string) => (isBalanceHidden ? "••••••••" : val);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1527] via-[#09101f] to-[#060a15] border border-white/10 p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top row: Business info & Banking node */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400 font-bold">
              {t("common.availableBalance")}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Providus Settlement Node Active
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight mt-1">
            {mask(formatCurrency(merchant.availableBalance))}
          </div>
        </div>

        {/* Settlement Account Chip */}
        <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 self-start sm:self-auto backdrop-blur-sm">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Payout Destination</div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{merchant.settlementBank}</span>
              <span className="text-teal-300 font-mono text-[11px]">({merchant.settlementAccountMasked})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row: Pending Settlements, Gross Sales Today, Fees Saved */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 relative z-10 border-t border-white/10">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Pending Settlement</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-amber-400 mt-1">
            {mask(formatCurrency(merchant.pendingSettlement))}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Auto-clears at 23:59 WAT</div>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Gross Sales (Today)</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-1">
            {mask(formatCurrency(merchant.totalGrossSalesToday))}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">+18.4% vs yesterday</div>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3 text-teal-400" />
            <span>Net Settlement Rate</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-white mt-1">98.5%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tier-1 1.5% Flat Rate</div>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-teal-400" />
            <span>Chargeback Ratio</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-1">0.02%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Below 0.5% threshold</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10">
        <button
          onClick={() => setIsReceiveModalOpen(true)}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98]"
        >
          <QrCode className="w-4 h-4 stroke-[2.5]" />
          <span>{t("common.receivePayment")}</span>
        </button>

        <button
          onClick={() => setIsCreateLinkModalOpen(true)}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <LinkIcon className="w-4 h-4 text-teal-400" />
          <span>{t("common.createLink")}</span>
        </button>

        <button
          onClick={() => setIsCreateInvoiceModalOpen(true)}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>{t("common.invoices")}</span>
        </button>
      </div>
    </div>
  );
};

export default MerchantBalanceHero;
