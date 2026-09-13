"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { Wallet, Check, X, Loader2 } from "lucide-react";

interface FloatAccount {
  id: string;
  agentId: string;
  agentCode: string;
  agentName: string;
  agentStatus: string;
  stateOrRegion: string;
  kind: string;
  currency: string;
  balance: number | null;
  thresholdMin: number | null;
}

interface TopupRequest {
  id: string;
  agentId: string;
  agentCode: string;
  agentName: string;
  stateOrRegion: string;
  amount: number;
  currency: string;
  method: string | null;
  proofReference: string | null;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  notes: string | null;
}

export default function RegionalFloatPage() {
  const { t, formatCurrency, formatDate, manager, managerError } = useRegional();
  const [accounts, setAccounts] = useState<FloatAccount[] | null>(null);
  const [requests, setRequests] = useState<TopupRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await regionalApiFetch("/api/regional/float");
      const json = await res.json();
      if (!res.ok) setError(json?.error?.message || "FLOAT_FAILED");
      else {
        setAccounts(json.data.accounts);
        setRequests(json.data.requests);
      }
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    }
  }, []);

  useEffect(() => {
    if (manager) void load();
  }, [manager, load]);

  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    if (decision === "APPROVED" && !window.confirm(t("float.confirmApprove"))) return;
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await regionalApiFetch("/api/regional/float/review", {
        method: "POST",
        body: JSON.stringify({ requestId: id, decision, notes: noteFor === id ? noteText : undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "DECISION_FAILED");
      } else {
        setNotice(decision === "APPROVED" ? t("float.approved") : t("float.rejected"));
        setNoteFor(null);
        setNoteText("");
        await load();
      }
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    } finally {
      setBusyId(null);
    }
  };

  if (managerError) {
    return (
      <div className="p-6 sm:p-8">
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--muted)]">{t("session.error")}</div>
      </div>
    );
  }

  const pending = (requests ?? []).filter((r) => r.status === "PENDING");
  const decided = (requests ?? []).filter((r) => r.status !== "PENDING");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{t("float.title")}</h1>
        <p className="text-sm text-[var(--muted)] mt-1 max-w-2xl">{t("float.subtitle")}</p>
      </div>

      {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-500">{error}</div>}
      {notice && <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/10 text-sm text-teal-600 dark:text-teal-400">{notice}</div>}

      {/* Top-up queue */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
          {t("float.queue")} · {pending.length}
        </h2>
        {requests === null ? (
          <div className="h-20 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
        ) : pending.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--muted)]">{t("float.emptyQueue")}</div>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-[var(--surface)] border border-amber-500/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold">
                      {r.agentName} <span className="font-mono text-[11px] text-[var(--muted)]">{r.agentCode}</span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {r.stateOrRegion} · {formatDate(r.requestedAt)} · {r.method || "—"}
                      {r.proofReference ? ` · ${t("float.requestCol.proof")}: ${r.proofReference}` : ""}
                    </div>
                    <div className="text-lg font-bold font-mono mt-1">{formatCurrency(r.amount, r.currency)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => void decide(r.id, "APPROVED")}
                        disabled={busyId === r.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-50"
                      >
                        {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {t("float.approve")}
                      </button>
                      <button
                        onClick={() => void decide(r.id, "REJECTED")}
                        disabled={busyId === r.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        {t("float.reject")}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setNoteFor(noteFor === r.id ? null : r.id);
                        setNoteText("");
                      }}
                      className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] underline"
                    >
                      {t("float.decisionNote")}
                    </button>
                  </div>
                </div>
                {noteFor === r.id && (
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    className="mt-3 w-full px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder={t("float.decisionNote")}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {decided.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className="bg-[var(--surface)] text-left text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-3 py-2.5 font-semibold">{t("float.requestCol.agent")}</th>
                  <th className="px-3 py-2.5 font-semibold text-right">{t("float.requestCol.amount")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("float.requestCol.status")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("float.requestCol.requested")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("common.lastUpdated")}</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2.5">
                      {r.agentName} <span className="font-mono text-[10px] text-[var(--muted)]">{r.agentCode}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(r.amount, r.currency)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === "APPROVED" ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "bg-rose-500/10 text-rose-500"}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">{formatDate(r.requestedAt)}</td>
                    <td className="px-3 py-2.5 text-[var(--muted)]">{r.reviewedAt ? formatDate(r.reviewedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Float accounts */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
          {t("float.accounts")} · {accounts?.length ?? 0}
        </h2>
        {accounts === null ? (
          <div className="h-20 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
        ) : accounts.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
            <Wallet className="w-8 h-8 mx-auto text-[var(--muted)] mb-3" />
            <div className="text-sm font-semibold">{t("float.emptyAccounts")}</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3 font-semibold">{t("float.col.agent")}</th>
                  <th className="px-4 py-3 font-semibold">{t("float.col.state")}</th>
                  <th className="px-4 py-3 font-semibold">{t("float.col.kind")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("float.col.balance")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("float.col.threshold")}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{a.agentName}</div>
                      <div className="text-[11px] font-mono text-[var(--muted)]">{a.agentCode}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{a.stateOrRegion}</td>
                    <td className="px-4 py-3 text-xs font-mono">{a.kind}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {a.balance === null ? "—" : formatCurrency(a.balance, a.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--muted)] font-mono">
                      {a.thresholdMin === null ? "—" : formatCurrency(a.thresholdMin, a.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
