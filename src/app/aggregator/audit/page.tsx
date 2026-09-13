"use client";

import React, { useMemo, useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import { History, ShieldCheck, Search, Inbox } from "lucide-react";

const RESULT_TONE: Record<string, string> = {
  SUCCESS: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  FAILURE: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
  DENIED: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
};

export default function AggregatorAuditPage() {
  const { auditLog, formatDate, t } = useAggregator();
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...auditLog].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!q) return sorted;
    return sorted.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        e.actorName.toLowerCase().includes(q) ||
        e.actorRole.toLowerCase().includes(q) ||
        e.targetType.toLowerCase().includes(q) ||
        (e.targetId || "").toLowerCase().includes(q) ||
        (e.reason || "").toLowerCase().includes(q),
    );
  }, [auditLog, query]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Immutable Security Audit Ledger</h1>
          <p className="text-xs text-[var(--foreground-muted)]">
            Append-only log of administrative logins, float dispatches, KYC reviews, and settlement authorizations —
            every row is an audited backend event.
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search action, actor, entity…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Table */}
      {shown.length === 0 ? (
        <div className="p-10 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center">
          <History className="w-8 h-8 mx-auto text-[var(--foreground-muted)] mb-3" />
          <div className="text-sm font-bold text-[var(--foreground)]">
            {query ? "No audited events match that search" : "No audited events yet"}
          </div>
          <p className="text-xs text-[var(--foreground-muted)] mt-1 max-w-md mx-auto">
            {query
              ? "Try a different action, actor or reference."
              : "Events appear here as your team acts — float dispatches, KYC reviews, settlements, API key issuance."}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-2)] text-[var(--foreground-muted)] font-mono uppercase text-[10px] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {shown.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--surface-2)]/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-[var(--foreground-muted)] whitespace-nowrap">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--foreground)]">{e.actorName}</div>
                      <div className="font-mono text-[10px] text-[var(--foreground-muted)]">{e.actorRole}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-teal-600 dark:text-teal-400">{e.action}</td>
                    <td className="px-4 py-3 font-mono text-[var(--foreground-muted)]">
                      <div>{e.targetType}</div>
                      {e.targetId && <div className="text-[10px] opacity-70">{e.targetId.slice(0, 18)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${RESULT_TONE[e.result] || "bg-[var(--surface-2)] text-[var(--foreground-muted)]"}`}>
                        {e.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)] max-w-[220px] truncate">{e.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-mono text-[var(--foreground-muted)]">
              {shown.length} of {auditLog.length} audited events — read-only, append-only at source
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
