"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Phone,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  LifeBuoy,
} from "lucide-react";

const CATEGORIES = [
  { value: "TRANSACTION_DISPUTE", label: "Transaction Dispute" },
  { value: "SETTLEMENT_ISSUE", label: "Settlement Issue" },
  { value: "FLOAT_ISSUE", label: "Float Issue" },
  { value: "AGENT_ISSUE", label: "Agent Issue" },
  { value: "MERCHANT_ISSUE", label: "Merchant Issue" },
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "OTHER", label: "Other" },
];

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"];

export default function AggregatorSupportPage() {
  const { supportTickets, supportSummary, submitSupportTicket, formatDate, t } = useAggregator();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("NORMAL");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    setResult(null);
    const res = await submitSupportTicket({ subject: subject.trim(), description: description.trim(), category, priority });
    setSubmitting(false);
    if (res.success) {
      setResult({ ok: true, message: "Ticket submitted. A support engineer will respond according to SLA." });
      setSubject("");
      setDescription("");
      setCategory("OTHER");
      setPriority("NORMAL");
    } else {
      setResult({ ok: false, message: res.error || "Could not submit ticket." });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Aggregator Support & Technical Escalation</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Direct Tier-1 relationship management, POS hardware dispatch desk, and settlement engineers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">Total Tickets</div>
          <div className="text-xl font-bold font-mono text-[var(--foreground)]">{supportSummary?.totalTickets ?? 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400">Open Tickets</div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{supportSummary?.openTickets ?? 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400">Critical / Urgent</div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{supportSummary?.criticalOrUrgent ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Contact info & ticket history */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Phone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--foreground)] text-base">Dedicated Aggregator Hotline</h3>
              <p className="text-xs text-[var(--foreground-muted)]">Priority direct line to KoriePay Core Treasury.</p>
              <div className="text-sm font-mono font-bold text-teal-600 dark:text-teal-400 pt-1">+234 64 881 920</div>
            </div>

            <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--foreground)] text-base">Treasury Email Desk</h3>
              <p className="text-xs text-[var(--foreground-muted)]">Guaranteed 15-minute response SLA on all operational tickets.</p>
              <div className="text-sm font-mono font-bold text-teal-600 dark:text-teal-400 pt-1">aggregator-desk@koriepay.com</div>
            </div>
          </div>

          {/* Ticket History */}
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h2 className="text-sm font-bold text-[var(--foreground)]">Your Support Tickets</h2>
            </div>
            {supportTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--foreground-muted)]">No support tickets yet.</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {supportTickets.map((tk) => (
                  <div key={tk.id} className="p-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[var(--foreground)]">{tk.ticketNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          tk.status === "RESOLVED" || tk.status === "CLOSED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : tk.priority === "CRITICAL" || tk.priority === "URGENT"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {tk.status}
                      </span>
                    </div>
                    <div className="font-bold text-[var(--foreground)]">{tk.subject}</div>
                    <p className="text-[var(--foreground-muted)]">{tk.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--foreground-muted)] font-mono pt-1">
                      <span>{tk.category}</span>
                      <span>• {tk.priority}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(tk.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Submit Ticket */}
        <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4 h-fit">
          <h3 className="font-bold text-[var(--foreground)] text-base">Submit Escalation Ticket</h3>

          {result?.ok ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <div className="font-bold text-[var(--foreground)] text-sm">Ticket Dispatched!</div>
              <p className="text-xs text-[var(--foreground)]">{result.message}</p>
              <button onClick={() => setResult(null)} className="text-[11px] underline text-teal-600 dark:text-teal-400">
                Submit another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">Issue Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Providus NIP Batch Delay"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--foreground-muted)] block mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide transaction IDs or affected agent codes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                />
              </div>

              {result && !result.ok && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{result.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Submitting…" : "Submit Ticket"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
