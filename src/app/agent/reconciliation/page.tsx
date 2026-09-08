"use client";

// =============================================================================
// Daily cash reconciliation — submits a denomination count to the
// CashReconciliationEngine (variance + MATCHED/SHORT/OVER) instead of a local
// toast. Variance vs the engine-tracked expected till.
// =============================================================================

import React, { useMemo, useState } from "react";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  statusTone,
  AgentFreshnessBar,
  AgentModal,
} from "@/components/agent/ui/AgentUi";
import { Plus, X, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { formatMoney } from "@/lib/money";

const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5];

export default function AgentReconciliationPage() {
  const { phase, errorMessage, summary, refresh, refreshedAt, submitDailyCashCount } = useAgentPortal();
  const [modalOpen, setModalOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const recon = summary?.reconciliations || [];

  const expected = summary?.till.expectedPhysicalCash ?? 0;

  const totalCounted = useMemo(
    () =>
      Object.entries(counts).reduce((sum, [denom, count]) => sum + Number(denom) * (Number(count) || 0), 0),
    [counts],
  );

  if (phase === "loading") return <AgentPageSkeleton rows={4} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your reconciliation history" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const openModal = () => {
    setCounts({});
    setResult(null);
    setModalOpen(true);
  };

  const submit = async () => {
    const denoms: Record<string, number> = {};
    for (const [denom, count] of Object.entries(counts)) {
      if (Number(count) > 0) denoms[denom] = Number(count);
    }
    if (Object.keys(denoms).length === 0) {
      setResult({ ok: false, message: "Enter at least one denomination count." });
      return;
    }
    setBusy(true);
    setResult(null);
    const res = await submitDailyCashCount(denoms);
    setBusy(false);
    if (res.success) {
      setResult({ ok: true, message: `Cash count submitted — total ${formatMoney(totalCounted, "NGN")}.` });
      setModalOpen(false);
      setCounts({});
    } else {
      setResult({ ok: false, message: res.message || "Submission failed." });
    }
  };

  const latest = recon[0];

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Cash Reconciliation"
        subtitle="End-of-day physical vault balancing against the engine till position — MATCHED, SHORT or OVER is decided by the engine."
        actions={
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New daily reconciliation
          </button>
        }
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void refresh({ silent: true })} />

      {/* Latest posture */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Expected till cash</p>
          <p className="mt-1 text-xl font-bold text-stone-900">{formatMoney(expected, "NGN")}</p>
          <p className="text-[11px] text-stone-500">Engine-tracked running position</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Last counted</p>
          <p className="mt-1 text-xl font-bold text-stone-900">
            {latest ? formatMoney(latest.totalCounted, "NGN") : "—"}
          </p>
          <p className="text-[11px] text-stone-500">
            {latest ? new Date(latest.submittedAt).toLocaleString("en-GB") : "No count submitted yet"}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Last variance</p>
          <p className="mt-1 text-xl font-bold text-stone-900">
            {latest
              ? `${latest.varianceAmount >= 0 ? "+" : "−"}${formatMoney(Math.abs(latest.varianceAmount), "NGN")}`
              : "—"}
          </p>
          {latest ? <AgentChip label={latest.status} tone={statusTone(latest.status)} /> : null}
        </div>
      </div>

      {/* History */}
      {recon.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <FileSpreadsheet aria-hidden="true" className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">No cash counts yet</p>
          <p className="mt-1 text-xs text-stone-500">
            Count your till by denomination and submit — the engine records variance against the expected position.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {recon.map((r) => (
            <li key={r.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-sm font-bold text-stone-900">{formatMoney(r.totalCounted, "NGN")}</p>
                  <p className="text-[11px] text-stone-500">
                    {new Date(r.submittedAt).toLocaleString("en-GB")} · expected {formatMoney(r.expectedCash, "NGN")}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold ${r.varianceAmount === 0 ? "text-emerald-700" : r.varianceAmount < 0 ? "text-rose-600" : "text-amber-600"}`}
                >
                  {r.varianceAmount >= 0 ? "+" : "−"}
                  {formatMoney(Math.abs(r.varianceAmount), "NGN")}
                </span>
                <div className="ml-auto">
                  <AgentChip label={r.status} tone={statusTone(r.status)} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {Object.entries(r.denominationBreakdown).map(([d, c]) => (
                  <span key={d} className="font-mono text-[10px] text-stone-400">
                    ₦{d} × {c}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Count modal */}
      <AgentModal open={modalOpen} onClose={() => setModalOpen(false)} labelledBy="recon-modal-title">
        <div className="flex items-start justify-between">
          <h2 id="recon-modal-title" className="text-base font-bold text-stone-900">
            Daily cash count
          </h2>
          <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-stone-500">
          Expected till cash: <span className="font-bold text-stone-800">{formatMoney(expected, "NGN")}</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DENOMS.map((d) => (
            <label key={d} className="block">
              <span className="text-xs font-semibold text-stone-600">₦{d}</span>
              <input
                value={counts[String(d)] ?? ""}
                onChange={(e) => setCounts((prev) => ({ ...prev, [String(d)]: e.target.value.replace(/[^\d]/g, "") }))}
                inputMode="numeric"
                placeholder="0"
                aria-label={`Count of ₦${d} notes`}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-2 text-center font-mono text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
          <span className="text-xs font-semibold text-stone-600">Total counted</span>
          <span className="text-base font-bold text-stone-900">{formatMoney(totalCounted, "NGN")}</span>
        </div>
        {totalCounted !== expected && totalCounted > 0 ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            Variance of {totalCounted > expected ? "+" : "−"}
            {formatMoney(Math.abs(totalCounted - expected), "NGN")} — the engine will record this as{" "}
            {totalCounted > expected ? "OVER" : "SHORT"}.
          </p>
        ) : null}
        {result && !result.ok ? (
          <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {result.message}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || totalCounted <= 0}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit count"}
          </button>
        </div>
        {result && result.ok ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {result.message}
          </p>
        ) : null}
      </AgentModal>
    </div>
  );
}
