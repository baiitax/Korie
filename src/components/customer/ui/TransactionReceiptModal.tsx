"use client";

import React, { useRef } from "react";
import { useCustomer } from "../CustomerContext";
import { formatMoney } from "@/services/customerDataService";
import KorieLogo from "@/components/brand/KorieLogo";
import {
  X,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export const TransactionReceiptModal: React.FC = () => {
  const {
    isReceiptModalOpen,
    selectedReceiptTx: tx,
    closeReceipt,
    openDispute,
    t,
  } = useCustomer();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copiedRef, setCopiedRef] = React.useState(false);

  if (!isReceiptModalOpen || !tx) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tx.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `KoriePay Receipt — ${tx.reference}`,
          text: `Payment Receipt: ${formatMoney(tx.amount, tx.currency)} sent via KoriePay. Reference: ${tx.reference}`,
          url: window.location.href,
        });
      } catch {
        // Fallback copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const isSuccess = tx.status === "SUCCESSFUL";
  const isPending = tx.status === "PENDING" || tx.status === "PROCESSING";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[#090f1d] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        ref={receiptRef}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <KorieLogo variant="compact" theme="dark" height={24} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              {t("receipt.title")}
            </span>
          </div>
          <button
            onClick={closeReceipt}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status & Amount Hero */}
          <div className="text-center space-y-2 py-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-1">
              {isSuccess ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : isPending ? (
                <Clock className="w-8 h-8 text-amber-400" />
              ) : (
                <AlertCircle className="w-8 h-8 text-rose-400" />
              )}
            </div>

            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {formatMoney(tx.amount, tx.currency)}
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold uppercase font-mono tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              ● {tx.status}
            </div>

            <p className="text-xs text-slate-400 max-w-xs mx-auto pt-1">
              {tx.title}
            </p>
          </div>

          {/* Vended Token Card (If Electricity) */}
          {tx.billerCustomerToken && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-center space-y-1">
              <span className="text-[10px] font-mono uppercase text-amber-300 font-bold">
                ⚡ ELECTRICITY TOKEN
              </span>
              <div className="text-lg sm:text-xl font-mono font-extrabold text-amber-200 tracking-wider select-all">
                {tx.billerCustomerToken}
              </div>
              <p className="text-[11px] text-amber-300/80">
                Enter this token into your prepaid meter keypad.
              </p>
            </div>
          )}

          {/* Key Receipt Parameters */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5 text-xs">
            <div className="flex items-center justify-between p-3.5">
              <span className="text-slate-400">{t("receipt.transactionReference")}</span>
              <div className="flex items-center gap-1.5 font-mono text-white font-semibold">
                <span>{tx.reference}</span>
                <button
                  onClick={handleCopy}
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                  title="Copy reference"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copiedRef && <span className="text-[10px] text-emerald-400 font-mono">Copied</span>}
              </div>
            </div>

            {tx.recipientName && (
              <div className="flex items-center justify-between p-3.5">
                <span className="text-slate-400">{t("receipt.recipientDetails")}</span>
                <div className="text-right">
                  <div className="font-semibold text-white">{tx.recipientName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {tx.recipientBank} {tx.recipientAccount && `• ${tx.recipientAccount}`}
                  </div>
                </div>
              </div>
            )}

            {tx.senderName && (
              <div className="flex items-center justify-between p-3.5">
                <span className="text-slate-400">{t("receipt.senderDetails")}</span>
                <div className="text-right">
                  <div className="font-semibold text-white">{tx.senderName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{tx.senderBank}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3.5">
              <span className="text-slate-400">{t("receipt.paymentRail")}</span>
              <span className="font-mono text-emerald-400 font-medium">
                {tx.type.replace(/_/g, " ")}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5">
              <span className="text-slate-400">{t("receipt.dateTime")}</span>
              <span className="text-slate-200 font-mono">
                {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                at{" "}
                {new Date(tx.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5">
              <span className="text-slate-400">{t("receipt.serviceFee")}</span>
              <span className="text-slate-200 font-mono">{formatMoney(tx.fee, tx.currency)}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-white/[0.02]">
              <span className="text-white font-bold">{t("receipt.totalDebited")}</span>
              <span className="text-white font-bold font-mono text-sm">
                {formatMoney(tx.totalAmount, tx.currency)}
              </span>
            </div>
          </div>

          {/* Timeline */}
          {tx.timeline && tx.timeline.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t("transactions.timelineTitle")}</span>
              </div>
              <div className="space-y-2 border-l-2 border-emerald-500/30 pl-3 ml-2 text-xs">
                {tx.timeline.map((step, idx) => (
                  <div key={idx} className="relative pb-1">
                    <div className="text-slate-200 font-medium">{step.title}</div>
                    <div className="text-[10px] text-slate-400">{step.description}</div>
                    <div className="text-[9px] font-mono text-emerald-400/80">{step.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            {t("receipt.disclaimer")}
          </p>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => {
              closeReceipt();
              openDispute(tx);
            }}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t("transactions.reportIssue")}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t("common.share")}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("common.download")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionReceiptModal;
