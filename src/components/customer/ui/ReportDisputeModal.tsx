"use client";

import React, { useState } from "react";
import { useCustomer } from "../CustomerContext";
import { formatMoney } from "@/services/customerDataService";
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Send } from "lucide-react";

export const ReportDisputeModal: React.FC = () => {
  const { isDisputeModalOpen, disputeTx: tx, closeDispute, submitDispute, t } = useCustomer();
  const [category, setCategory] = useState("MONEY_NOT_RECEIVED");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  if (!isDisputeModalOpen || !tx) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    const ticketId = await submitDispute(category, description);
    setIsSubmitting(false);
    setSubmittedTicketId(ticketId);
  };

  const handleClose = () => {
    setSubmittedTicketId(null);
    setDescription("");
    closeDispute();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0b1222] border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>{t("support.disputeTxTitle")}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedTicketId ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Dispute Ticket Submitted</h3>
            <p className="text-xs text-slate-300">
              {t("support.ticketCreated", { ticketNumber: submittedTicketId })}
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-white/5 font-mono text-xs text-emerald-400 font-bold">
              Ticket: {submittedTicketId}
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              {t("common.close")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Transaction Summary Card */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Transaction</span>
                <span className="font-mono text-white font-bold">
                  {formatMoney(tx.amount, tx.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Reference</span>
                <span className="font-mono text-emerald-400">{tx.reference}</span>
              </div>
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                What issue are you experiencing?
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="MONEY_NOT_RECEIVED">Money not received by recipient</option>
                <option value="WRONG_AMOUNT">Debited wrong amount / duplicate charge</option>
                <option value="FAILED_BUT_DEBITED">Transaction failed but money debited</option>
                <option value="UNRECOGNIZED_ACTIVITY">I do not recognize this transaction</option>
                <option value="BILLER_TOKEN_ISSUE">Electricity/Service token not delivered</option>
              </select>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {t("support.describeIssue")}
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any additional details or bank statement reference..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? t("common.loading") : t("support.submitTicket")}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportDisputeModal;
