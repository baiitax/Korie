"use client";

// =============================================================================
// Customer Experience console — the loop, instrumented.
//
// GAP-2: complaint priorities, SLA clocks, dispute/chargeback/refund lifecycles
// and the double-entry redress journal all existed in engines, and nothing
// admin-facing read them as one loop; `csat|nps|satisfaction|survey` matched
// zero files, so any satisfaction figure shown anywhere would have been fiction.
//
// This page reads ONE engine-backed snapshot (`/api/admin/cx/overview`) and
// renders the five stages of the loop:
//   CAPTURE  complaint book            (ComplaintDisputeEngine)
//   RESOLVE  SLA clocks + cycle time   (computed from the records, not fields)
//   REDRESS  double-entry postings     (GeneralLedgerEngine 5010, refunds, disputes)
//   MEASURE  customers' own ratings    (captureCsat → /api/customer/portal/csat)
//   PREVENT  repeats → harm incidents  (CustomerHarmIncidentEngine)
//
// Every mutation on this page is an engine call: triage and compensation go
// through /api/complaints/[id], prevention incidents through /api/admin/cx/incidents.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import type { CxCaseRow, CxSnapshot } from "@/lib/admin/CxTruthService";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  Clock,
  Gauge,
  Landmark,
  LifeBuoy,
  Loader2,
  RefreshCw,
  Repeat2,
  ShieldAlert,
  Siren,
  Star,
  Timer,
  TrendingDown,
  X,
} from "lucide-react";

const PRIORITY_CHIP: Record<string, string> = {
  P0: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  P1: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  P2: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  P3: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const SLA_TONE: Record<CxCaseRow["slaState"], string> = {
  BREACHED: "text-rose-300",
  AT_RISK: "text-amber-300",
  ON_TRACK: "text-slate-300",
  MET: "text-emerald-300",
  MISSED: "text-rose-300",
};

const SLA_LABEL: Record<CxCaseRow["slaState"], string> = {
  BREACHED: "past deadline",
  AT_RISK: "closing in",
  ON_TRACK: "on track",
  MET: "met at resolution",
  MISSED: "missed at resolution",
};

function money(amount: number, currency: string): string {
  const symbol = currency === "NGN" ? "₦" : currency === "XOF" ? "CFA " : `${currency} `;
  return `${symbol}${amount.toLocaleString()}`;
}

function totals(list: { currency: string; amount: number }[] | undefined): string {
  if (!list || list.length === 0) return "—";
  return list.map((t) => money(t.amount, t.currency)).join(" · ");
}

function countdown(row: CxCaseRow): string {
  if (row.hoursToDue === null) return "no clock";
  const abs = Math.abs(row.hoursToDue);
  const label = abs < 1 ? `${Math.round(abs * 60)}m` : abs < 48 ? `${abs.toFixed(1)}h` : `${(abs / 24).toFixed(1)}d`;
  return row.hoursToDue < 0 ? `${label} overdue` : `${label} left`;
}

export default function CustomerExperiencePage() {
  const { countryFilter } = useAdmin();
  const [snapshot, setSnapshot] = useState<CxSnapshot | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // compensation modal
  const [compensateFor, setCompensateFor] = useState<CxCaseRow | null>(null);
  const [compAmount, setCompAmount] = useState("");
  const [compReason, setCompReason] = useState("");
  const [compAuthorizer, setCompAuthorizer] = useState("support.lead@koriepay.ng");

  // prevention incident modal
  const [incidentFor, setIncidentFor] = useState<CxSnapshot["prevention"]["clusters"][number] | null>(null);
  const [incidentSeverity, setIncidentSeverity] = useState<"SEV_1_CRITICAL" | "SEV_2_HIGH" | "SEV_3_MODERATE">("SEV_3_MODERATE");
  const [incidentCause, setIncidentCause] = useState("");
  const [incidentPlan, setIncidentPlan] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setPhase("loading");
      setRefreshing(true);
      try {
        const qs = countryFilter === "GLOBAL" ? "" : `?country=${countryFilter}`;
        const res = await fetch(`/api/admin/cx/overview${qs}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json?.success === false) {
          throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`);
        }
        setSnapshot(json.data as CxSnapshot);
        setRefreshedAt(new Date().toISOString());
        setPhase("ready");
      } catch (err: any) {
        setError(err?.message || "CX snapshot request failed");
        setPhase("error");
      } finally {
        setRefreshing(false);
      }
    },
    [countryFilter],
  );

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(true), 30_000);
    return () => clearInterval(poll);
  }, [load]);

  // Re-render clocks every 30s so countdowns stay honest between refetches.
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const transition = useCallback(
    async (row: CxCaseRow, status: string, note: string) => {
      setBusy(`${row.id}:${status}`);
      try {
        const res = await fetch(`/api/complaints/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes: note, assignedToEmail: "support.lead@koriepay.ng" }),
        });
        const json = await res.json();
        if (!res.ok || json?.success === false) throw new Error(json?.error || "Transition failed");
        setNotice({ ok: true, message: `${row.reference} → ${status.replace(/_/g, " ").toLowerCase()}.` });
        await load(true);
      } catch (err: any) {
        setNotice({ ok: false, message: err?.message || "Transition failed" });
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const submitCompensation = useCallback(async () => {
    if (!compensateFor) return;
    const amount = Number(compAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({ ok: false, message: "Enter a compensation amount greater than zero." });
      return;
    }
    setBusy(`${compensateFor.id}:COMPENSATE`);
    try {
      const res = await fetch(`/api/complaints/${compensateFor.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COMPENSATE",
          amount,
          reason: compReason,
          authorizedByEmail: compAuthorizer,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.error || "Compensation failed");
      setNotice({
        ok: true,
        message: `${money(amount, compensateFor.currency)} redress journaled (${json.journalNumber}) — ${compensateFor.reference} resolved.`,
      });
      setCompensateFor(null);
      setCompAmount("");
      setCompReason("");
      await load(true);
    } catch (err: any) {
      setNotice({ ok: false, message: err?.message || "Compensation failed" });
    } finally {
      setBusy(null);
    }
  }, [compensateFor, compAmount, compReason, compAuthorizer, load]);

  const raiseIncident = useCallback(async () => {
    if (!incidentFor) return;
    setBusy(`${incidentFor.key}:INCIDENT`);
    try {
      const res = await fetch("/api/admin/cx/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusterKey: incidentFor.key,
          severity: incidentSeverity,
          rootCause: incidentCause,
          remediationPlan: incidentPlan,
          actor: compAuthorizer,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.error?.message || json?.error || "Incident creation failed");
      setNotice({
        ok: true,
        message: `Prevention incident ${json.data?.incident?.incidentReference} raised from ${incidentFor.cases} case(s) — ${incidentFor.category}.`,
      });
      setIncidentFor(null);
      setIncidentCause("");
      setIncidentPlan("");
      await load(true);
    } catch (err: any) {
      setNotice({ ok: false, message: err?.message || "Incident creation failed" });
    } finally {
      setBusy(null);
    }
  }, [incidentFor, incidentSeverity, incidentCause, incidentPlan, compAuthorizer, load]);

  const updateIncident = useCallback(
    async (incidentId: string, status: string, reference: string) => {
      setBusy(`${incidentId}:${status}`);
      try {
        const res = await fetch("/api/admin/cx/incidents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incidentId, status, actor: compAuthorizer }),
        });
        const json = await res.json();
        if (!res.ok || json?.success === false) throw new Error(json?.error?.message || json?.error || "Update failed");
        setNotice({ ok: true, message: `${reference} → ${status.replace(/_/g, " ").toLowerCase()}.` });
        await load(true);
      } catch (err: any) {
        setNotice({ ok: false, message: err?.message || "Update failed" });
      } finally {
        setBusy(null);
      }
    },
    [compAuthorizer, load],
  );

  const loopStages = useMemo(() => {
    if (!snapshot) return [];
    return [
      {
        key: "CAPTURE",
        label: "Capture",
        value: snapshot.loop.captured,
        detail: `${snapshot.headline.liveCases} live · ${snapshot.headline.seedCases} seed fixture(s)`,
        source: "ComplaintDisputeEngine",
        instrumented: true,
        icon: LifeBuoy,
        tone: "text-sky-300",
      },
      {
        key: "RESOLVE",
        label: "Resolve",
        value: snapshot.loop.resolved + snapshot.loop.closed,
        detail:
          snapshot.cycleTime.medianResolveHours !== null
            ? `median ${snapshot.cycleTime.medianResolveHours}h · ${snapshot.sla.breached} past SLA now`
            : "no resolution recorded yet",
        source: "SLA clocks + case history",
        instrumented: true,
        icon: Timer,
        tone: "text-emerald-300",
      },
      {
        key: "REDRESS",
        label: "Redress",
        value: snapshot.loop.resolvedWithRedress,
        detail: snapshot.redress.complaintCompensation.cases
          ? `${totals(snapshot.redress.complaintCompensation.total)} posted via 5010`
          : "no compensation journaled",
        source: "GeneralLedgerEngine · 5010",
        instrumented: true,
        icon: Landmark,
        tone: "text-amber-300",
      },
      {
        key: "MEASURE",
        label: "Measure",
        value: snapshot.csat.responses,
        detail:
          snapshot.csat.status === "MEASURED"
            ? `CSAT ${snapshot.csat.average}/5 · NPS ${snapshot.csat.nps} · ${snapshot.csat.coveragePct}% coverage`
            : `not measurable — 0 of ${snapshot.csat.eligibleCases} resolved case(s) rated`,
        source: "captureCsat (customer-submitted)",
        instrumented: snapshot.csat.status === "MEASURED",
        icon: Star,
        tone: snapshot.csat.status === "MEASURED" ? "text-violet-300" : "text-slate-400",
      },
      {
        key: "PREVENT",
        label: "Prevent",
        value: snapshot.prevention.clusters.length,
        detail:
          snapshot.prevention.unresolvedIncidents > 0
            ? `${snapshot.prevention.activeIncidents} active · ${snapshot.prevention.mitigatedIncidents} mitigated (awaiting closure) · ${snapshot.prevention.affectedCustomers} customer(s) in active incidents`
            : "no unresolved harm incident",
        source: "recurrence clusters + CustomerHarmIncidentEngine",
        instrumented: true,
        icon: Siren,
        tone: "text-rose-300",
      },
    ];
  }, [snapshot]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-violet-500/10 text-violet-300 border border-violet-500/20">
            CUSTOMER EXPERIENCE · CLOSED LOOP
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Experience Instrumentation</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture → resolve → redress → measure → prevent. Every figure is read from the engine that records it;
            nothing here is estimated or back-filled.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">
            {refreshedAt ? `Synced ${new Date(refreshedAt).toLocaleTimeString()}` : "syncing…"}
          </span>
          <button
            type="button"
            onClick={() => void load(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/5 transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-xs font-semibold border ${
            notice.ok ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" : "bg-rose-500/10 text-rose-300 border-rose-500/25"
          }`}
        >
          {notice.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1">{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}

      {phase === "loading" && !snapshot ? (
        <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-10 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-violet-300 mx-auto" />
          <p className="mt-3 text-xs text-slate-400">Reading the complaint, SLA, ledger, refund and incident engines…</p>
        </div>
      ) : phase === "error" && !snapshot ? (
        <div className="rounded-3xl bg-[#0b1324] border border-rose-500/20 p-10 text-center">
          <p className="text-sm font-bold text-rose-300">The experience engines could not be read</p>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : snapshot ? (
        <>
          {/* Engine-written headline + provenance band */}
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-xl bg-violet-500/10 text-violet-300 border border-violet-500/20 shrink-0">
                <Gauge className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-violet-300 font-bold">
                  What the engines report · {snapshot.country === "GLOBAL" ? "all markets" : snapshot.country}
                </p>
                <p className="mt-1 text-sm text-slate-200 leading-relaxed">{snapshot.headline.statement}</p>
                <p className="mt-2 text-[10px] text-slate-500 font-mono">
                  {snapshot.headline.casesConsidered} case(s) in scope · generated {new Date(snapshot.generatedAt).toLocaleTimeString()}
                  {tick >= 0 ? "" : ""}
                </p>
              </div>
            </div>

            {snapshot.warnings.length > 0 ? (
              <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                {snapshot.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-[11px] text-amber-300/90">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* The loop */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {loopStages.map((stage, idx) => (
              <div
                key={stage.key}
                className={`relative rounded-2xl border p-4 space-y-1 ${
                  stage.instrumented ? "bg-[#0b1324] border-white/10" : "bg-slate-900/60 border-dashed border-slate-600/50"
                }`}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400">
                  <stage.icon className={`w-3.5 h-3.5 ${stage.tone}`} /> {idx + 1}. {stage.label}
                </p>
                <p className={`text-2xl font-bold font-mono ${stage.instrumented ? "text-white" : "text-slate-400"}`}>
                  {stage.value}
                </p>
                <p className="text-[10px] text-slate-400 leading-snug">{stage.detail}</p>
                <p className="text-[9px] text-slate-600 font-mono leading-snug pt-1">{stage.source}</p>
                {!stage.instrumented ? (
                  <span className="absolute top-3 right-3 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-700/40 text-slate-300 border border-slate-500/30">
                    not yet measurable
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* SLA board */}
            <div className="lg:col-span-2 rounded-3xl bg-[#0b1324] border border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Timer className="w-4 h-4" /> SLA clocks — {snapshot.sla.breached} breached · {snapshot.sla.atRisk} closing in ·{" "}
                  {snapshot.sla.onTrack} on track
                </p>
                <span className="text-[10px] font-mono text-slate-500">
                  {snapshot.sla.nextDeadline
                    ? `next deadline ${new Date(snapshot.sla.nextDeadline).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                    : "no live deadline"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {snapshot.sla.rows.map((r) => (
                  <div
                    key={r.priority}
                    className={`p-3 rounded-2xl border ${
                      r.breached > 0 ? "border-rose-500/30 bg-rose-500/5" : "border-white/10 bg-slate-950/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${PRIORITY_CHIP[r.priority]}`}>
                        {r.priority}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">{r.slaHours}h clock</span>
                    </div>
                    <p className="mt-2 text-lg font-bold font-mono text-white">{r.open}</p>
                    <p className="text-[10px] text-slate-400">
                      open ·{" "}
                      <span className={r.breached > 0 ? "text-rose-300 font-bold" : "text-slate-400"}>{r.breached} breached</span>
                      {r.atRisk > 0 ? <span className="text-amber-300"> · {r.atRisk} closing in</span> : null}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-500 leading-snug">{snapshot.sla.note}</p>
              {snapshot.sla.storedFlagStale > 0 ? (
                <p className="mt-1 text-[10px] text-amber-300/90 leading-snug">
                  {snapshot.sla.storedFlagStale} stored <span className="font-mono">isSlaBreached</span> value(s) disagreed with the clock at
                  read time — breach state above is computed from <span className="font-mono">slaDueAt</span>. Closed cases: {snapshot.sla.metClocks}{" "}
                  clock(s) met, {snapshot.sla.missedClocks} missed at resolution.
                </p>
              ) : null}
            </div>

            {/* Cycle time */}
            <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-4 space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Clock className="w-4 h-4" /> Resolution cycle time
              </p>
              {snapshot.cycleTime.sampleSize === 0 ? (
                <p className="text-[11px] text-slate-400 leading-snug">
                  No case has reached a terminal state, so there is no cycle time to report. This tile stays empty rather than
                  showing a target or an average.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Median", value: snapshot.cycleTime.medianResolveHours, tone: "text-white" },
                    { label: "90th pct", value: snapshot.cycleTime.p90ResolveHours, tone: "text-amber-300" },
                    { label: "Fastest", value: snapshot.cycleTime.fastestResolveHours, tone: "text-emerald-300" },
                    { label: "Slowest", value: snapshot.cycleTime.slowestResolveHours, tone: "text-rose-300" },
                  ].map((m) => (
                    <div key={m.label} className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                      <p className="text-[9px] font-mono uppercase text-slate-500">{m.label}</p>
                      <p className={`text-sm font-bold font-mono ${m.tone}`}>{m.value === null ? "—" : `${m.value}h`}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                <span>Opened 7d: {snapshot.cycleTime.openedLast7d}</span>
                <span>Resolved 7d: {snapshot.cycleTime.resolvedLast7d}</span>
                <span className={snapshot.cycleTime.reopens > 0 ? "text-rose-300" : ""}>Reopened: {snapshot.cycleTime.reopens}</span>
                <span className={snapshot.cycleTime.resolvedWithoutResolutionType > 0 ? "text-amber-300" : ""}>
                  No resolution type: {snapshot.cycleTime.resolvedWithoutResolutionType}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">
                Measured from the case history the engine now records on every transition (sample {snapshot.cycleTime.sampleSize}).
              </p>
            </div>
          </div>

          {/* Queue */}
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-white/5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-white">
                <LifeBuoy className="w-4 h-4 text-sky-400" /> Open cases — {snapshot.queue.length} in view
              </p>
              <span className="text-[10px] text-slate-500 font-mono">clock shown live · actions call ComplaintDisputeEngine</span>
            </div>
            {snapshot.queue.length === 0 ? (
              <p className="p-6 text-xs text-slate-400">
                No open case in the engine book. A clean posture is the honest empty state here — this panel never shows a sample queue.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] text-[10px] font-mono uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Case</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Value</th>
                      <th className="p-3">Clock</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {snapshot.queue.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.02]">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${PRIORITY_CHIP[row.priority]}`}>
                              {row.priority}
                            </span>
                            <span className="font-mono text-[11px] text-white">{row.reference}</span>
                            {row.isSeed ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-700/40 text-slate-300 border border-slate-500/30">
                                seed
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[9px] text-slate-500 font-mono">
                            {row.transitions} transition(s) recorded · {row.country}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-slate-200">{row.customer}</p>
                          <p className="text-[9px] text-slate-500 font-mono">{row.phoneMasked}</p>
                        </td>
                        <td className="p-3 text-[11px] text-slate-300">
                          {row.category.replace(/_/g, " ").toLowerCase()}
                          {row.assignedTo ? (
                            <p className="text-[9px] text-slate-500 font-mono">→ {row.assignedTo}</p>
                          ) : (
                            <p className="text-[9px] text-rose-300/80 font-mono">unassigned</p>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-200">{money(row.disputedAmount, row.currency)}</td>
                        <td className="p-3">
                          <p className={`text-[11px] font-bold font-mono ${SLA_TONE[row.slaState]}`}>{countdown(row)}</p>
                          <p className="text-[9px] text-slate-500">{SLA_LABEL[row.slaState]}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white/5 text-slate-300 border border-white/10">
                            {row.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              disabled={busy === `${row.id}:INVESTIGATING`}
                              onClick={() => void transition(row, "INVESTIGATING", "Assigned to experience desk for investigation")}
                              className="px-2 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold hover:bg-sky-500/25 disabled:opacity-50"
                            >
                              Investigate
                            </button>
                            <button
                              type="button"
                              disabled={busy === `${row.id}:RESOLVED`}
                              onClick={() => void transition(row, "RESOLVED", "Resolved after experience-desk review")}
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/25 disabled:opacity-50"
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCompensateFor(row);
                                setCompAmount(String(row.disputedAmount || ""));
                                setCompReason("");
                              }}
                              className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold hover:bg-amber-500/25"
                            >
                              Compensate
                            </button>
                            {busy?.startsWith(row.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 self-center" /> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Measure */}
            <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-bold text-violet-300">
                  <Star className="w-4 h-4" /> Customer satisfaction — {snapshot.csat.responses} rating(s)
                </p>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                    snapshot.csat.status === "MEASURED"
                      ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                      : "bg-slate-700/40 text-slate-300 border-slate-500/30"
                  }`}
                >
                  {snapshot.csat.status === "MEASURED" ? "measured" : "awaiting first response"}
                </span>
              </div>

              {snapshot.csat.status === "MEASURED" ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                      <p className="text-[9px] font-mono uppercase text-slate-500">CSAT</p>
                      <p className="text-lg font-bold font-mono text-white">{snapshot.csat.average}/5</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                      <p className="text-[9px] font-mono uppercase text-slate-500">NPS</p>
                      <p className={`text-lg font-bold font-mono ${(snapshot.csat.nps ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {snapshot.csat.nps}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                      <p className="text-[9px] font-mono uppercase text-slate-500">Coverage</p>
                      <p className="text-lg font-bold font-mono text-amber-300">{snapshot.csat.coveragePct}%</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {[5, 4, 3, 2, 1].map((score) => {
                      const bucket = snapshot.csat.distribution.find((d) => d.score === score);
                      const responses = bucket?.responses ?? 0;
                      const pct = snapshot.csat.responses > 0 ? (responses / snapshot.csat.responses) * 100 : 0;
                      return (
                        <div key={score} className="flex items-center gap-2">
                          <span className="w-8 text-[10px] font-mono text-slate-400">{score}★</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full ${score >= 4 ? "bg-emerald-500" : score === 3 ? "bg-amber-500" : "bg-rose-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[10px] font-mono text-slate-400">{responses}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    promoters {snapshot.csat.promoters} · passives {snapshot.csat.passives} · detractors {snapshot.csat.detractors} ·
                    last {snapshot.csat.lastCapturedAt ? new Date(snapshot.csat.lastCapturedAt).toLocaleString() : "—"}
                  </p>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-600/50 p-4 space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                    <CircleDashed className="w-3.5 h-3.5" /> Not measurable yet — and deliberately blank
                  </p>
                  <p className="text-[11px] text-slate-400 leading-snug">{snapshot.csat.note}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Eligible cases: {snapshot.csat.eligibleCases} · responses: 0 · coverage: unmeasurable
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-snug">
                Capture path: <span className="font-mono">{snapshot.csat.capturePath}</span>
                {snapshot.csat.channels.length > 0 ? (
                  <>
                    {" · channels: "}
                    {snapshot.csat.channels.map((c) => `${c.channel} ${c.responses}`).join(", ")}
                  </>
                ) : null}
              </p>
              <p className="text-[10px] text-slate-500 leading-snug">
                Only the customer a case belongs to can rate it, only once, and only after resolution — an operator cannot enter a score
                on a customer&apos;s behalf, so this number cannot be manufactured from the console.
              </p>
            </div>

            {/* Redress */}
            <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-4 space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Landmark className="w-4 h-4" /> Financial redress — as posted
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <p className="text-[9px] font-mono uppercase text-slate-500">Compensated cases</p>
                  <p className="text-lg font-bold font-mono text-white">{snapshot.redress.complaintCompensation.cases}</p>
                  <p className="text-[10px] text-slate-400">{totals(snapshot.redress.complaintCompensation.total)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <p className="text-[9px] font-mono uppercase text-slate-500">GL 5010 postings</p>
                  <p className="text-lg font-bold font-mono text-white">{snapshot.redress.glRedressExpense.postings}</p>
                  <p className="text-[10px] text-slate-400">{totals(snapshot.redress.glRedressExpense.total)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <p className="text-[9px] font-mono uppercase text-slate-500">Refunds (engine)</p>
                  <p className="text-lg font-bold font-mono text-white">{snapshot.redress.refunds?.successful ?? "—"}</p>
                  <p className="text-[10px] text-slate-400">{totals(snapshot.redress.refunds?.totalByCurrency)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <p className="text-[9px] font-mono uppercase text-slate-500">Held dispute reserve</p>
                  <p className="text-lg font-bold font-mono text-white">{totals(snapshot.redress.disputes?.heldReserve)}</p>
                  <p className="text-[10px] text-slate-400">
                    {snapshot.redress.disputes?.open ?? 0} open · {snapshot.redress.disputes?.breachedSla ?? 0} past SLA
                  </p>
                </div>
              </div>

              {snapshot.redress.glRedressExpense.journals.length > 0 ? (
                <ul className="space-y-1.5">
                  {snapshot.redress.glRedressExpense.journals.map((j) => (
                    <li key={j.journalNumber} className="rounded-xl bg-slate-950/50 border border-white/5 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-emerald-300">{j.journalNumber}</span>
                        <span className="text-[10px] font-mono text-amber-300">{money(j.amount, j.currency)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{j.narration}</p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        {j.postedBy || "—"} · {new Date(j.createdAt).toLocaleString()}
                        {j.sourceReference ? ` · ${j.sourceReference}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-400">
                  No journal has posted to account 5010 (consumer redress expense) yet. Compensation entered on this console writes one
                  balanced journal: 5010 DR → customer wallet CR, plus the subledger credit.
                </p>
              )}

              <div className="text-[10px] text-slate-500 space-y-1 leading-snug">
                <p>{snapshot.redress.note}</p>
                <p>{snapshot.redress.glRedressExpense.note}</p>
                <p className="text-slate-600">
                  Reversals: {snapshot.redress.reversals.note}
                </p>
              </div>
            </div>
          </div>

          {/* Prevent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-4 space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                <Repeat2 className="w-4 h-4" /> Recurring harm patterns
              </p>
              <p className="text-[10px] text-slate-500 leading-snug">{snapshot.prevention.note}</p>
              {snapshot.prevention.clusters.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  No category repeats against the same agent, terminal or market in this book — nothing to escalate yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.prevention.clusters.map((cluster) => (
                    <li key={cluster.key} className="rounded-2xl bg-slate-950/50 border border-white/5 p-3 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-white">{cluster.category.replace(/_/g, " ")}</span>
                        <span className="text-[10px] font-mono text-rose-300">{cluster.cases} case(s)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {cluster.agentId ? `agent ${cluster.agentId}` : cluster.terminalId ? `terminal ${cluster.terminalId}` : cluster.country}
                        {` · ${cluster.openCases} still open · ${cluster.affectedCustomers} customer(s)`}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Exposure {totals(cluster.exposure)} · latest {new Date(cluster.latestAt).toLocaleDateString()}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono truncate">{cluster.references.join(", ")}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIncidentFor(cluster);
                          setIncidentCause("");
                          setIncidentPlan("");
                        }}
                        className="mt-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold hover:bg-rose-500/25 inline-flex items-center gap-1"
                      >
                        <Siren className="w-3 h-3" /> Raise prevention incident
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {snapshot.prevention.repeatAgents.length > 0 ? (
                <div className="border-t border-white/5 pt-3">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Agents appearing in the book</p>
                  <ul className="mt-1 space-y-1">
                    {snapshot.prevention.repeatAgents.map((a) => (
                      <li key={a.agentId} className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-300">{a.agentId}</span>
                        <span className="text-slate-500">
                          {a.cases} case(s) · {a.categories.length} categor{a.categories.length === 1 ? "y" : "ies"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-bold text-orange-300">
                  <Siren className="w-4 h-4" /> Systemic harm incidents
                </p>
                <span className="text-[10px] font-mono text-slate-500">
                  {snapshot.prevention.activeIncidents} active · {snapshot.prevention.mitigatedIncidents} mitigated ·{" "}
                  {snapshot.prevention.closedIncidents} closed · {snapshot.prevention.regulatoryNotified} regulator-notified
                </span>
              </div>
              {snapshot.prevention.incidents.length === 0 ? (
                <p className="text-[11px] text-slate-400">No systemic incident record exists.</p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.prevention.incidents.map((incident) => (
                    <li key={incident.id} className="rounded-2xl bg-slate-950/50 border border-white/5 p-3 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-orange-300">{incident.reference}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-white/5 text-slate-300 border border-white/10">
                          {incident.severity.replace(/_/g, " ")}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-white/5 text-slate-300 border border-white/10">
                          {incident.status.replace(/_/g, " ")}
                        </span>
                        {incident.isSeed ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-700/40 text-slate-300 border border-slate-500/30">
                            seed
                          </span>
                        ) : null}
                        {incident.regulatoryNotified ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                            filed
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-200">{incident.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {incident.affectedCustomersCount} customer(s) · {incident.affectedAgentsCount} agent(s) · exposure{" "}
                        {money(incident.exposure, incident.currency)}
                        {incident.affectedProvider ? ` · ${incident.affectedProvider}` : ""}
                        {incident.affectedCorridor ? ` · ${incident.affectedCorridor}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {["INVESTIGATING", "MITIGATED", "RESOLVED", "POSTMORTEM_PUBLISHED"].map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={busy === `${incident.id}:${status}` || incident.status === status}
                            onClick={() => void updateIncident(incident.id, status, incident.reference)}
                            className="px-2 py-0.5 rounded-lg border border-white/10 text-slate-300 text-[9px] font-bold hover:bg-white/5 disabled:opacity-40"
                          >
                            {status.replace(/_/g, " ").toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-white/5 pt-3 text-[10px] text-slate-400 space-y-1">
                <p className="font-mono">
                  Active-incident exposure: {totals(snapshot.prevention.exposure)} · customers in active incidents{" "}
                  {snapshot.prevention.affectedCustomers}
                  {snapshot.prevention.affectedCustomersMitigated > 0
                    ? ` · ${snapshot.prevention.affectedCustomersMitigated} in mitigated incidents (not currently exposed)`
                    : ""}
                </p>
                <p className="text-slate-500">
                  Raising an incident writes a real record in CustomerHarmIncidentEngine with the cluster&apos;s own counts and exposure —
                  the engine does the arithmetic, not this page.
                </p>
              </div>
            </div>
          </div>

          {/* Provenance */}
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-4 space-y-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <BadgeCheck className="w-4 h-4 text-emerald-400" /> Provenance — what this page reads
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {snapshot.sources.map((source) => (
                <div
                  key={source.key}
                  className={`rounded-2xl border p-3 ${source.available ? "bg-slate-950/50 border-white/5" : "bg-slate-900/40 border-dashed border-slate-600/40"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase text-slate-300 font-bold">{source.key}</span>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase ${
                        source.available ? "text-emerald-300" : "text-slate-400"
                      }`}
                    >
                      {source.available ? "available" : "not available"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 font-mono break-words">{source.engine}</p>
                  <p className="text-[10px] text-slate-300 font-mono">
                    records {source.records ?? "—"}
                    {source.seedRecords !== null ? ` · seed ${source.seedRecords} · live ${source.liveRecords ?? "—"}` : ""}
                  </p>
                  {source.note ? <p className="text-[9px] text-slate-500 leading-snug">{source.note}</p> : null}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 leading-snug flex items-start gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Seeded fixtures are labelled wherever they appear. Any panel that cannot answer from an engine says so, rather than showing a
              sample number. Dispute and refund series are reported per engine and never added to complaint redress.
            </p>
          </div>
        </>
      ) : null}

      {/* Compensation modal */}
      {compensateFor ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#0b1324] border border-amber-500/25 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase text-amber-300 font-bold">Financial redress · double-entry</p>
                <h2 className="text-sm font-bold text-white mt-0.5">
                  {compensateFor.reference} — {compensateFor.customer}
                </h2>
                <p className="text-[10px] text-slate-400 font-mono">
                  {compensateFor.category.replace(/_/g, " ").toLowerCase()} · disputed {money(compensateFor.disputedAmount, compensateFor.currency)}
                </p>
              </div>
              <button type="button" onClick={() => setCompensateFor(null)} aria-label="Close" className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block text-[10px] font-mono uppercase text-slate-400">
              Amount ({compensateFor.currency}, whole units — posted 1:1 to the ledger)
              <input
                type="number"
                min="1"
                value={compAmount}
                onChange={(e) => setCompAmount(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="block text-[10px] font-mono uppercase text-slate-400">
              Reason (journaled in the narration)
              <textarea
                value={compReason}
                onChange={(e) => setCompReason(e.target.value)}
                rows={2}
                placeholder="What harm is being redressed, and on what evidence"
                className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="block text-[10px] font-mono uppercase text-slate-400">
              Authoriser email (recorded as postedBy on the journal)
              <input
                value={compAuthorizer}
                onChange={(e) => setCompAuthorizer(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500/50"
              />
            </label>

            <div className="rounded-2xl bg-slate-950/60 border border-white/5 p-3 text-[10px] text-slate-400 leading-snug">
              Posting this writes one balanced journal — <span className="font-mono text-slate-300">5010 consumer redress expense DR</span> →{" "}
              <span className="font-mono text-slate-300">{compensateFor.currency === "NGN" ? "2010" : "2020"} customer wallet CR</span> — credits
              the customer subledger, resolves the case and stamps it into the case history. A reason and an authoriser are required; a
              ledger that cannot fail is not a ledger.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompensateFor(null)}
                className="px-3 py-2 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy === `${compensateFor.id}:COMPENSATE`}
                onClick={() => void submitCompensation()}
                className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy === `${compensateFor.id}:COMPENSATE` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />}
                Post redress journal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Prevention incident modal */}
      {incidentFor ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#0b1324] border border-rose-500/25 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase text-rose-300 font-bold">Prevention loop · systemic harm incident</p>
                <h2 className="text-sm font-bold text-white mt-0.5">{incidentFor.category.replace(/_/g, " ")}</h2>
                <p className="text-[10px] text-slate-400 font-mono">
                  {incidentFor.cases} case(s) · {incidentFor.affectedCustomers} customer(s) · {totals(incidentFor.exposure)}
                </p>
              </div>
              <button type="button" onClick={() => setIncidentFor(null)} aria-label="Close" className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block text-[10px] font-mono uppercase text-slate-400">
              Severity
              <select
                value={incidentSeverity}
                onChange={(e) => setIncidentSeverity(e.target.value as typeof incidentSeverity)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500/50"
              >
                <option value="SEV_3_MODERATE">SEV 3 · moderate</option>
                <option value="SEV_2_HIGH">SEV 2 · high</option>
                <option value="SEV_1_CRITICAL">SEV 1 · critical</option>
              </select>
            </label>
            <label className="block text-[10px] font-mono uppercase text-slate-400">
              Suspected root cause
              <textarea
                value={incidentCause}
                onChange={(e) => setIncidentCause(e.target.value)}
                rows={2}
                placeholder="Leave blank if it is not yet known — the field stays empty rather than guessing"
                className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50"
              />
            </label>
            <label className="block text-[10px] font-mono uppercase text-slate-400">
              Remediation plan
              <textarea
                value={incidentPlan}
                onChange={(e) => setIncidentPlan(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50"
              />
            </label>
            <p className="text-[10px] text-slate-500 leading-snug">
              Customer counts, exposure and the incident title are recomputed from the complaint book server-side; this dialog cannot
              inflate them. Regulatory notification is not set here — a filing reference is a separate, auditable step.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIncidentFor(null)}
                className="px-3 py-2 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy === `${incidentFor.key}:INCIDENT`}
                onClick={() => void raiseIncident()}
                className="px-3 py-2 rounded-xl bg-rose-500 text-slate-950 text-xs font-bold hover:bg-rose-400 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy === `${incidentFor.key}:INCIDENT` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Siren className="w-3.5 h-3.5" />}
                Raise incident
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
