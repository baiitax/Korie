"use client";

// =============================================================================
// File: src/components/support/NewTicketModal.tsx
// Description: Quick ticket creation from anywhere in the shell (§07/§84).
// Idempotent; duplicate warnings come from the server.
// =============================================================================

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, Spinner } from "./SupportUI";
import { useSupportOps } from "./SupportOpsProvider";
import { supportOps, isSupportApiError, supportErrorMessage } from "@/services/supportOpsClient";

const CATEGORIES = [
  "TRANSFER", "CARD", "LOGIN_ACCESS", "PENDING_TRANSACTION", "MERCHANT_SETTLEMENT",
  "AGENT_FLOAT", "KYC_TIER", "FRAUD_SECURITY", "TECHNICAL_API", "FEE", "OTHER",
] as const;

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"] as const;

export function NewTicketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (ticketNumber: string) => void;
}) {
  const { t, activeOfficer, isOnline, toast } = useSupportOps();
  const [customer, setCustomer] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("TRANSFER");
  const [priority, setPriority] = useState<string>("NORMAL");
  const [jurisdiction, setJurisdiction] = useState<"NG" | "NE" | "CROSS_BORDER">("NG");
  const [language, setLanguage] = useState<"en" | "fr" | "ha">("en");
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState<{ number: string } | null>(null);

  const reset = () => {
    setCustomer("");
    setSubject("");
    setDescription("");
    setCategory("TRANSFER");
    setPriority("NORMAL");
    setDuplicate(null);
  };

  const submit = async () => {
    if (!customer.trim() || !subject.trim() || !description.trim()) {
      toast(t("supportOps.newTicket.validation"), "error");
      return;
    }
    setBusy(true);
    const res = await supportOps.createTicket(
      {
        customerId: customer.trim(),
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        jurisdiction,
        language,
        channel: "IN_APP",
      },
      `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    );
    setBusy(false);
    if (isSupportApiError(res)) {
      toast(supportErrorMessage(res), "error");
      return;
    }
    onCreated(res.ticket.ticketNumber);
    onClose();
    reset();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={t("supportOps.newTicket.title")}>
      <div className="space-y-4">
        {duplicate && (
          <div className="flex items-start gap-2 rounded-[10px] border border-[var(--state-warning)]/40 bg-[var(--state-warning-soft)] px-3 py-2.5 text-xs font-semibold text-[var(--state-warning)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("supportOps.newTicket.duplicateWarning", { ticket: duplicate.number })}</span>
          </div>
        )}

        <div>
          <label htmlFor="nt-customer" className="mb-1 block text-xs font-bold text-[var(--foreground)]">
            {t("supportOps.newTicket.customer")}
          </label>
          <input
            id="nt-customer"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="CUST-NG-99044"
            className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">{t("supportOps.newTicket.customerHint")}</p>
        </div>

        <div>
          <label htmlFor="nt-subject" className="mb-1 block text-xs font-bold text-[var(--foreground)]">
            {t("supportOps.newTicket.subject")}
          </label>
          <input
            id="nt-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
        </div>

        <div>
          <label htmlFor="nt-desc" className="mb-1 block text-xs font-bold text-[var(--foreground)]">
            {t("supportOps.newTicket.description")}
          </label>
          <textarea
            id="nt-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nt-cat" className="mb-1 block text-xs font-bold text-[var(--foreground)]">{t("supportOps.common.category")}</label>
            <select id="nt-cat" value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`supportOps.categories.${c}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nt-pri" className="mb-1 block text-xs font-bold text-[var(--foreground)]">{t("supportOps.common.priority")}</label>
            <select id="nt-pri" value={priority} onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{t(`supportOps.priorities.${p}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nt-jur" className="mb-1 block text-xs font-bold text-[var(--foreground)]">{t("supportOps.inbox.filters.jurisdiction")}</label>
            <select id="nt-jur" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value as "NG" | "NE" | "CROSS_BORDER")}
              className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]">
              {(["NG", "NE", "CROSS_BORDER"] as const).map((j) => (
                <option key={j} value={j}>{t(`supportOps.jurisdictions.${j}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nt-lang" className="mb-1 block text-xs font-bold text-[var(--foreground)]">{t("supportOps.ticket.language")}</label>
            <select id="nt-lang" value={language} onChange={(e) => setLanguage(e.target.value as "en" | "fr" | "ha")}
              className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]">
              {(["en", "fr", "ha"] as const).map((l) => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => { reset(); onClose(); }} disabled={busy}
            className="rounded-[var(--support-radius-input)] border border-[var(--border)] px-4 py-2 text-[13px] font-bold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-3)] disabled:opacity-50">
            {t("supportOps.common.cancel")}
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy || !isOnline}
            className="flex items-center gap-2 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-4 py-2 text-[13px] font-bold text-[var(--brand-on-primary)] shadow-sm transition-colors hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
          >
            {busy && <Spinner />}
            {t("supportOps.newTicket.create")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
