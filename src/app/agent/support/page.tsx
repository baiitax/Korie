"use client";

// =============================================================================
// Support & disputes — tickets now persist through the ComplaintDisputeEngine
// (reference, priority, SLA, status). No more local isSent toast.
// =============================================================================

import React, { useState } from "react";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  statusTone,
  AgentFreshnessBar,
  AgentEmptyState,
} from "@/components/agent/ui/AgentUi";
import { Send, MessageSquare, Mail, LifeBuoy, CheckCircle2, AlertTriangle } from "lucide-react";

const CATEGORIES = [
  { value: "FAILED_TRANSFER", label: "Failed transfer" },
  { value: "DUPLICATE_DEBIT", label: "Duplicate debit" },
  { value: "UNAUTHORIZED_TRANSACTION", label: "Unauthorized transaction" },
  { value: "POS_TERMINAL_GLITCH", label: "POS terminal glitch" },
  { value: "FEE_DISPUTE", label: "Fee dispute" },
  { value: "REFUND_DELAY", label: "Refund delay" },
  { value: "AGENT_OVERCHARGING", label: "Agent overcharging claim" },
  { value: "ACCOUNT_RESTRICTION", label: "Account restriction" },
];

export default function AgentSupportPage() {
  const { phase, errorMessage, summary, refresh, refreshedAt, submitTicket } = useAgentPortal();
  const [category, setCategory] = useState("FAILED_TRANSFER");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const tickets = summary?.complaints || [];

  if (phase === "loading") return <AgentPageSkeleton rows={4} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your support desk" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const res = await submitTicket({
      category,
      description,
      disputedAmount: Number(amount) || 0,
      transactionReference: reference || undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    });
    setBusy(false);
    if (res.success) {
      setNotice({ ok: true, message: "Ticket logged — the disputes engine assigned a reference and an SLA." });
      setDescription("");
      setAmount("");
      setReference("");
      setCustomerName("");
      setCustomerPhone("");
      await refresh({ silent: true });
    } else {
      setNotice({ ok: false, message: res.message || "Could not log the ticket." });
    }
  };

  const openTickets = tickets.filter((t) => !["RESOLVED", "CLOSED"].includes(t.status));

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Support & Disputes"
        subtitle="Dedicated agency help desk — tickets are persisted with real references and SLA deadlines."
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void refresh({ silent: true })} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Contact cards */}
        <section aria-label="Contact channels" className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <MessageSquare className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-stone-900">Kano Regional Agent WhatsApp Desk</p>
              <p className="text-xs text-stone-500">+234 (0) 802-KORIE-AGENT · escalation for urgent float/till issues</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <Mail className="mt-0.5 h-5 w-5 text-stone-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-stone-900">Agent Operations Email</p>
              <p className="text-xs text-stone-500">agent.support@koriepay.com · documents & reconciliation queries</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <LifeBuoy className="mt-0.5 h-5 w-5 text-stone-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-stone-900">Live status</p>
              <p className="text-xs text-stone-500">
                {openTickets.length} open ticket{openTickets.length === 1 ? "" : "s"} across your terminal — watch SLA deadlines below.
              </p>
            </div>
          </div>
        </section>

        {/* Ticket form */}
        <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Open a ticket">
          <h2 className="text-sm font-bold text-stone-900">Open dispute / incident ticket</h2>
          {notice ? (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ring-1 ${
                notice.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
              }`}
            >
              {notice.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              {notice.message}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-semibold text-stone-700">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-stone-700">Transaction reference (optional)</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="KP-2026-…"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 font-mono text-sm text-stone-900 placeholder:text-stone-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-semibold text-stone-700">Customer name (optional)</span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-stone-700">Disputed amount (₦, optional)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>
          <label className="block text-xs">
            <span className="font-semibold text-stone-700">Incident details</span>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Include the customer's phone, reference and terminal ID…"
              className="mt-1 w-full resize-none rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <button
            type="submit"
            disabled={busy || description.trim().length < 10}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {busy ? "Logging ticket…" : "Submit ticket"}
          </button>
        </form>
      </div>

      {/* Tickets */}
      <section aria-labelledby="tickets-title">
        <h2 id="tickets-title" className="text-sm font-bold text-stone-900">
          Ticket history
        </h2>
        {tickets.length === 0 ? (
          <div className="mt-2">
            <AgentEmptyState
              icon={<LifeBuoy aria-hidden="true" className="h-6 w-6" />}
              title="No tickets yet"
              body="Tickets you open are persisted by the disputes engine with a complaint reference and SLA."
            />
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {tickets.map((t) => (
              <li key={t.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-stone-900">{t.complaintReference}</span>
                  <AgentChip label={t.status} tone={statusTone(t.status)} />
                  <AgentChip label={t.priority} tone={t.priority === "P0" ? "red" : "neutral"} />
                  {t.isSlaBreached ? <AgentChip label="SLA breached" tone="red" /> : null}
                  <span className="ml-auto text-[11px] text-stone-400">
                    {new Date(t.createdAt).toLocaleDateString("en-GB")} · SLA {new Date(t.slaDueAt).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">{t.description}</p>
                {t.transactionReference ? (
                  <p className="mt-1 font-mono text-[10px] text-stone-400">TX: {t.transactionReference}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
