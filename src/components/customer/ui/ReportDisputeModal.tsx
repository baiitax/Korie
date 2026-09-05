"use client";

import React, { useEffect, useState } from "react";
import { useCustomer } from "../CustomerContext";
import { formatMoney } from "@/lib/money";
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Send } from "lucide-react";

/**
 * Report-dispute modal.
 *
 * Two defects fixed here:
 *  1. It was styled with hardcoded `bg-[#0b1222]` / `slate-*` classes, i.e. a
 *     dark island inside the light-first portal — unreadable in Light mode and
 *     unaffected by the theme control. It is now token-driven like everything
 *     else.
 *  2. Submission was fake: a client-side `KP-DISP-<random>` ticket number and a
 *     push into local React state. It now POSTs to the customer-scoped disputes
 *     API and shows the reference the dispute queue actually created.
 *
 * The reason codes are the ones the ComplaintDisputeEngine can classify; the
 * previous `WRONG_AMOUNT` / `BILLER_TOKEN_ISSUE` values matched nothing on the
 * server and would have landed in an undefined bucket.
 */

const REASONS: { value: string; labelKey: string }[] = [
  { value: "MONEY_NOT_RECEIVED", labelKey: "support.reasonMoneyNotReceived" },
  { value: "DEBITED_TWICE", labelKey: "support.reasonDebitedTwice" },
  { value: "FAILED_BUT_DEBITED", labelKey: "support.reasonFailedButDebited" },
  { value: "UNRECOGNISED_DEBIT", labelKey: "support.reasonUnrecognised" },
  { value: "FEE_QUERY", labelKey: "support.reasonFeeQuery" },
];

export const ReportDisputeModal: React.FC = () => {
  const { isDisputeModalOpen, disputeTx: tx, closeDispute, submitDispute, t, language } = useCustomer();
  const [category, setCategory] = useState(REASONS[0].value);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDisputeModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisputeModalOpen]);

  if (!isDisputeModalOpen || !tx) return null;

  const handleClose = () => {
    setSubmittedTicketId(null);
    setDescription("");
    setError(null);
    closeDispute();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError(t("support.descriptionTooShort"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const result = await submitDispute(category, description);
    setIsSubmitting(false);
    if (result.ok) setSubmittedTicketId(result.ticketNumber);
    else setError(result.error);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-title"
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl glass-modal border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden max-h-[92vh] overflow-y-auto overscroll-contain"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] sticky top-0 glass-modal z-10">
          <div className="flex items-center gap-2 text-[var(--danger)] font-bold text-sm">
            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            <span id="dispute-title">{t("support.disputeTxTitle")}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 -m-1 rounded-xl hover:bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors min-h-[36px] min-w-[36px] grid place-items-center"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedTicketId ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[var(--success-soft)] border border-[var(--brand-border)] text-[var(--success)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">{t("support.disputeLoggedTitle")}</h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              {t("support.ticketCreated", { ticketNumber: submittedTicketId })}
            </p>
            <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] font-mono text-xs text-[var(--brand-primary)] font-bold">
              {t("support.caseNumber")}: {submittedTicketId}
            </div>
            <p className="text-[11px] text-[var(--foreground-muted)]">{t("support.disputeNextStep")}</p>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-[var(--brand-primary)] text-white font-bold text-xs hover:bg-[var(--brand-primary-hover)] transition-colors min-h-[44px]"
            >
              {t("common.close")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Transaction summary — the amount is never masked here: this is a
                private modal about one specific row, not a list view. */}
            <div className="p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--foreground-muted)]">{t("support.disputedAmount")}</span>
                <span className="font-mono font-bold text-[var(--foreground)] tabular-nums">
                  {formatMoney(tx.amount, tx.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--foreground-muted)]">{t("detail.reference")}</span>
                <span className="font-mono text-[var(--brand-primary)] break-all">{tx.reference}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dispute-reason" className="text-xs font-semibold text-[var(--foreground)]">
                {t("support.whatHappened")}
              </label>
              <select
                id="dispute-reason"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-xs focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none min-h-[44px]"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {t(r.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dispute-desc" className="text-xs font-semibold text-[var(--foreground)]">
                {t("support.describeIssue")}
              </label>
              <textarea
                id="dispute-desc"
                rows={3}
                required
                minLength={10}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("support.describePlaceholder")}
                aria-describedby={error ? "dispute-error" : undefined}
                className="w-full p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-xs placeholder:text-[var(--foreground-muted)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none resize-none"
              />
            </div>

            {error && (
              <p
                id="dispute-error"
                role="alert"
                className="flex items-start gap-2 text-[11px] font-semibold text-[var(--danger)] rounded-xl border border-[var(--danger-soft)] bg-[var(--danger-soft)]/40 p-2.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">
              {isSubmitting ? t("support.disputeSubmitting") : t("support.disputeAssurance")}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] font-semibold text-xs disabled:opacity-60 min-h-[44px]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || description.trim().length < 10}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors disabled:opacity-50 min-h-[44px]"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isSubmitting ? t("support.submitting") : t("support.submitTicket")}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportDisputeModal;
