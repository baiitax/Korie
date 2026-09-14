"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PageHeader, fmtMoney, fmtDate } from "@/components/admin/AdminPageUI";
import { useAdmin } from "@/components/admin/AdminContext";
import { adminApiFetch } from "@/lib/admin/adminSession";

/**
 * Money-Movement Approvals — the four-eyes queue (assessment §43 remediation).
 * Every controlled movement that is waiting for a first or second distinct
 * approver: agent float top-ups above the dual-control threshold, merchant
 * payouts above the approval threshold, and Adashi maker-checker payouts.
 * The RPCs enforce distinct approvers and refuse self-approval; this page is
 * the sanctioned surface for recording those decisions.
 */

type QueueItem = {
  type: "AGENT_FLOAT_TOPUP" | "MERCHANT_PAYOUT" | "ADASHI_PAYOUT";
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  status: string;
  requested_at: string;
  approvals: number;
  required: number;
};

const TYPE_LABEL: Record<QueueItem["type"], string> = {
  AGENT_FLOAT_TOPUP: "Float top-up",
  MERCHANT_PAYOUT: "Merchant payout",
  ADASHI_PAYOUT: "Adashi payout",
};

export default function ApprovalsPage() {
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminApiFetch("/api/admin/approvals");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "The approval queue failed to load.");
      setQueue(json.queue ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The approval queue failed to load.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (item: QueueItem, decision: "APPROVE" | "REJECT") => {
    setBusyId(item.id);
    setError(null);
    setFlash(null);
    try {
      const res = await adminApiFetch("/api/admin/approvals", {
        method: "POST",
        body: JSON.stringify({ type: item.type, id: item.id, decision, notes: notes[item.id] ?? null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "The decision did not complete.");
      const result = json.decision?.result ?? {};
      setFlash(
        `${TYPE_LABEL[item.type]} · ${fmtMoney(item.amount, item.currency)} — ${decision === "APPROVE" ? "approved" : "rejected"}` +
          (result.status ? ` (status: ${result.status})` : ""),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The decision did not complete.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Finance"
        title="Money-Movement Approvals"
        subtitle="Four-eyes queue: float top-ups and merchant payouts above the dual-control thresholds, and Adashi maker-checker payouts. Approvals must come from distinct people; self-approval is refused by the database."
      />

      {flash && <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm">{flash}</div>}
      {error && <div className="p-3 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">{error}</div>}
      {queue === null && !error && <div className="p-4 text-sm text-[var(--foreground-muted)]">Loading approval queue…</div>}
      {queue !== null && queue.length === 0 && (
        <div className="p-6 rounded-xl border bg-[var(--surface)] text-sm text-[var(--foreground-muted)]">
          Nothing is waiting for approval. Controlled money movements above the dual-control thresholds will appear here.
        </div>
      )}

      <div className="space-y-3">
        {queue?.map((item) => (
          <div key={`${item.type}:${item.id}`} className="p-4 rounded-xl border bg-[var(--surface)] space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">
                {TYPE_LABEL[item.type]}
              </span>
              <span className="font-bold">{item.title}</span>
              <span className="text-lg font-bold">{fmtMoney(item.amount, item.currency)}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.approvals >= item.required ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {item.approvals}/{item.required} approvals
              </span>
              <span className="ml-auto text-xs text-[var(--foreground-muted)]">{fmtDate(item.requested_at)}</span>
            </div>
            <div className="text-xs text-[var(--foreground-muted)]">{item.subtitle} · status {item.status}</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Decision note (optional)"
                value={notes[item.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                className="flex-1 min-w-48 px-3 py-2 rounded-lg border bg-transparent text-sm"
              />
              <button
                onClick={() => void decide(item, "APPROVE")}
                disabled={busyId === item.id}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {busyId === item.id ? "…" : "Approve"}
              </button>
              <button
                onClick={() => void decide(item, "REJECT")}
                disabled={busyId === item.id}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
