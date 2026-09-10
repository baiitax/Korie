"use client";

// =============================================================================
// Admin Service & Recovery Desk (support) — ENGINE-BACKED customer care.
// The old page rendered two hand-written tickets; this desk serves the real
// consumer-protection engines:
//   · Complaint book     → /api/complaints      (ComplaintDisputeEngine)
//   · Disputes           → /api/disputes        (DisputeChargebackEngine)
//   · Chargebacks/Refunds→ /api/chargebacks, /api/refunds
// Triage actions (assign/investigate/resolve/close) and financial redress
// (compensation = real double-entry journal) call the engine through
// /api/complaints/[id]. Nothing on this page is client-side fiction.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { ComplaintRecord, ComplaintPriority } from "@/types/regulatoryConsumerEngine";
import {
  LifeBuoy,
  Search,
  RefreshCw,
  ShieldAlert,
  Timer,
  CheckCircle2,
  Repeat2,
  RotateCcw,
  Landmark,
  ArrowRight,
  Loader2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

const CATEGORY_LABEL: Record<string, string> = {
  FAILED_TRANSFER: "Failed transfer",
  DUPLICATE_DEBIT: "Duplicate debit",
  AGENT_OVERCHARGING: "Agent overcharging",
  AGENT_HARASSMENT: "Agent harassment",
  UNAUTHORIZED_TRANSACTION: "Unauthorized transaction",
  POS_TERMINAL_GLITCH: "POS terminal glitch",
  REFUND_DELAY: "Refund delay",
  FEE_DISPUTE: "Fee dispute",
  ACCOUNT_RESTRICTION: "Account restriction",
};

const PRIORITY_CHIP: Record<string, string> = {
  P0: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  P1: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  P2: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  P3: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const STATUS_CHIP: Record<string, string> = {
  RESOLVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  CLOSED: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  OPENED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  INVESTIGATING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  ASSIGNED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  ACKNOWLEDGED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  CLASSIFIED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  PENDING_CUSTOMER: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  PENDING_PROVIDER: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  RESOLUTION_PROPOSED: "bg-teal-500/15 text-teal-300 border-teal-500/30",
};

function ccy(currency: string): string {
  return currency === "NGN" ? "₦" : "CFA ";
}

function money(amount: number, currency: string): string {
  return `${ccy(currency)}${(amount || 0).toLocaleString()}`;
}

function maskPhone(phone?: string): string {
  if (!phone) return "—";
  return phone.length >= 8 ? `${phone.slice(0, 4)} ••• •${phone.slice(-2)}` : phone;
}

function slaState(c: ComplaintRecord): { label: string; tone: "green" | "amber" | "rose" } {
  if (c.isSlaBreached) return { label: "SLA breached", tone: "rose" }; // stored flag, recomputed by the CX read path
  const due = new Date(c.slaDueAt).getTime();
  const left = due - Date.now();
  if (left <= 0) return { label: "SLA breached", tone: "rose" };
  const hours = left / 3600000;
  if (hours < 6) return { label: `${Math.ceil(hours)}h left`, tone: "amber" };
  if (hours < 24) return { label: `${Math.ceil(hours)}h left`, tone: "amber" };
  return { label: `${Math.ceil(hours / 24)}d left`, tone: "green" };
}

const SLA_TONE: Record<string, string> = {
  green: "text-emerald-400",
  amber: "text-amber-300",
  rose: "text-rose-400",
};

const TERMINAL_STATUSES = ["OPENED", "ACKNOWLEDGED", "CLASSIFIED", "ASSIGNED"];
const ACTIVE_STATUSES = ["OPENED", "ACKNOWLEDGED", "CLASSIFIED", "ASSIGNED", "INVESTIGATING", "PENDING_CUSTOMER", "PENDING_PROVIDER", "RESOLUTION_PROPOSED"];

export default function SupportAdminPage() {
  const { countryFilter } = useAdmin();
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [totals, setTotals] = useState<{ total: number; open: number; resolved: number; p0Critical: number } | null>(null);
  const [recovery, setRecovery] = useState<{ disputes: any[]; chargebacks: any[]; refunds: any[] }>({ disputes: [], chargebacks: [], refunds: [] });
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | ComplaintPriority>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  // compensation modal
  const [compensateFor, setCompensateFor] = useState<ComplaintRecord | null>(null);
  const [compAmount, setCompAmount] = useState("");
  const [compReason, setCompReason] = useState("");
  const [compAuthorizer, setCompAuthorizer] = useState("support.lead@koriepay.ng");
  const [compBusy, setCompBusy] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setPhase("loading");
      try {
        const country = countryFilter === "GLOBAL" ? "" : `country=${countryFilter}`;
        const [cmpRes, disRes, cbRes, rfRes] = await Promise.all([
          fetch(`/api/complaints${country ? `?${country}` : ""}`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/disputes`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/chargebacks`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/refunds`, { cache: "no-store" }).catch(() => null),
        ]);
        if (!cmpRes || !cmpRes.ok) {
          setError("Complaint engine unreachable.");
          setPhase("error");
          return;
        }
        const [cmpJson, disJson, cbJson, rfJson] = await Promise.all([
          cmpRes.json(),
          disRes ? disRes.json() : Promise.resolve({ data: { disputes: [] } }),
          cbRes ? cbRes.json() : Promise.resolve({ data: { chargebacks: [] } }),
          rfRes ? rfRes.json() : Promise.resolve({ data: { refunds: [] } }),
        ]);
        setComplaints(cmpJson.data.complaints || []);
        setTotals({ total: cmpJson.data.total, open: cmpJson.data.open, resolved: cmpJson.data.resolved, p0Critical: cmpJson.data.p0Critical });
        setRecovery({
          disputes: disJson.data?.disputes || [],
          chargebacks: cbJson.data?.chargebacks || [],
          refunds: rfJson.data?.refunds || [],
        });
        setRefreshedAt(new Date().toISOString());
        setPhase("ready");
      } catch (err: any) {
        setError(err?.message || "Load failed");
        setPhase("error");
      }
    },
    [countryFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openSet = useMemo(
    () => complaints.filter((c) => c.status !== "RESOLVED" && c.status !== "CLOSED"),
    [complaints],
  );
  // Breach is derived from the case's own deadline, not from a stored flag:
  // `isSlaBreached` had no writer after intake, so a case that ran past its
  // clock still reported false and this counter read 0 forever.
  const breached = openSet.filter((c) => new Date(c.slaDueAt).getTime() < Date.now());

  const visible = complaints.filter((c) => {
    const matchesCountry = countryFilter === "GLOBAL" || c.country === countryFilter;
    const matchesSearch =
      !search.trim() ||
      c.complaintReference.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.transactionReference || "").toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === "ALL" || c.priority === priorityFilter;
    const matchesStatus =
      statusFilter === "ALL" ? true : statusFilter === "OPEN" ? c.status !== "RESOLVED" && c.status !== "CLOSED" : c.status === "RESOLVED" || c.status === "CLOSED";
    return matchesCountry && matchesSearch && matchesPriority && matchesStatus;
  });

  const transition = async (complaint: ComplaintRecord, status: string, notes?: string) => {
    setBusyId(`${complaint.id}:${status}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notes || `Admin triage → ${status}`,
          assignedToEmail: "support.lead@koriepay.ng",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice({ ok: false, message: json.error || "Transition failed." });
        return;
      }
      setNotice({ ok: true, message: `${complaint.complaintReference} → ${status}.` });
      await load(true);
    } catch (err: any) {
      setNotice({ ok: false, message: err?.message || "Transition failed." });
    } finally {
      setBusyId(null);
    }
  };

  const submitCompensation = async () => {
    if (!compensateFor) return;
    setCompBusy(true);
    setNotice(null);
    const amount = Number(compAmount);
    try {
      const res = await fetch(`/api/complaints/${compensateFor.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COMPENSATE",
          amount,
          reason: compReason.trim(),
          authorizedByEmail: compAuthorizer.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice({ ok: false, message: json.error || "Compensation failed." });
        return;
      }
      setNotice({
        ok: true,
        message: `${money(amount, compensateFor.currency)} redress journaled (${json.journalNumber}) — ${compensateFor.complaintReference} resolved.`,
      });
      setCompensateFor(null);
      setCompAmount("");
      setCompReason("");
      await load(true);
    } catch (err: any) {
      setNotice({ ok: false, message: err?.message || "Compensation failed." });
    } finally {
      setCompBusy(false);
    }
  };

  const openDisputes = recovery.disputes.filter((d: any) => d.status !== "RESOLVED");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
            CUSTOMER EXPERIENCE · SERVICE & RECOVERY
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Service &amp; Recovery Desk</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Complaint book, disputes, chargebacks and refunds — engine truth with live triage and double-entry financial redress.
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
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
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
          <span>{notice.message}</span>
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="rounded-3xl bg-[#0b1324] border border-rose-500/20 p-10 text-center">
          <p className="text-sm font-bold text-rose-300">The service engines could not be reached</p>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Book of work */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10 space-y-1">
              <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400">
                <LifeBuoy className="w-3.5 h-3.5 text-blue-400" /> Open complaints
              </p>
              <p className="text-2xl font-bold font-mono text-white">{totals?.open ?? "—"}</p>
              <p className="text-[10px] text-slate-500">{totals?.resolved ?? 0} resolved all-time in book</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10 space-y-1">
              <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> P0 critical
              </p>
              <p className="text-2xl font-bold font-mono text-rose-300">{totals?.p0Critical ?? "—"}</p>
              <p className="text-[10px] text-slate-500">regulatory-grade urgency</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10 space-y-1">
              <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400">
                <Timer className="w-3.5 h-3.5 text-amber-400" /> SLA breached
              </p>
              <p className="text-2xl font-bold font-mono text-amber-300">{breached.length}</p>
              <p className="text-[10px] text-slate-500">
                of {openSet.length} open · engine clocks P0 24h · P1 48h · P2 72h · P3 120h (computed from each case&apos;s slaDueAt)
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10 space-y-1">
              <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400">
                <Repeat2 className="w-3.5 h-3.5 text-sky-400" /> Open disputes
              </p>
              <p className="text-2xl font-bold font-mono text-sky-300">{openDisputes.length}</p>
              <p className="text-[10px] text-slate-500">
                {recovery.chargebacks.length} chargebacks · {recovery.refunds.length} refunds
              </p>
            </div>
          </div>

          {/* Complaint desk */}
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <LifeBuoy className="w-4 h-4 text-blue-400" />
                Complaint book (engine) · {visible.length} shown
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ref, customer, txn…"
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40 w-56"
                  />
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="ALL">All priorities</option>
                  <option value="P0">P0</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="ALL">All statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="RESOLVED">Resolved / closed</option>
                </select>
              </div>
            </div>

            {phase === "loading" && complaints.length === 0 ? (
              <div className="p-14 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
                <p className="text-xs text-slate-400 mt-2">Reading complaint engine…</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="p-14 text-center">
                <RotateCcw className="w-8 h-8 mx-auto text-slate-600" />
                <p className="mt-3 text-sm font-bold text-slate-300">No complaints match</p>
                <p className="text-xs text-slate-500 mt-1">The engine book is clean for this filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                      <th className="p-3 font-semibold">Complaint</th>
                      <th className="p-3 font-semibold">Customer</th>
                      <th className="p-3 font-semibold">Category</th>
                      <th className="p-3 font-semibold">Amount</th>
                      <th className="p-3 font-semibold">SLA</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {visible.map((c) => {
                      const sla = slaState(c);
                      const active = ACTIVE_STATUSES.includes(c.status);
                      return (
                        <tr key={c.id} className="hover:bg-white/[0.03] transition-colors align-top">
                          <td className="p-3">
                            <p className="font-mono font-bold text-white">{c.complaintReference}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 max-w-[220px] leading-snug">{c.description}</p>
                            {c.glJournalId ? <p className="text-[10px] font-mono text-emerald-400 mt-0.5">GL {c.glJournalId}</p> : null}
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-200">{c.customerName}</p>
                            <p className="text-[10px] font-mono text-slate-500">{maskPhone(c.customerPhone)}</p>
                            <p className="text-[10px] text-slate-500">
                              {c.agentId ? `Agent ${c.agentId}` : ""}
                              {c.terminalId ? ` · ${c.terminalId}` : ""}
                            </p>
                          </td>
                          <td className="p-3">
                            <p className="text-slate-300">{CATEGORY_LABEL[c.category] || c.category.replace(/_/g, " ")}</p>
                            <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${PRIORITY_CHIP[c.priority] || PRIORITY_CHIP.P3}`}>
                              {c.priority}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-white">{money(c.disputedAmount, c.currency)}</td>
                          <td className="p-3">
                            <span className={`font-mono font-bold ${SLA_TONE[sla.tone]}`}>{sla.label}</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${STATUS_CHIP[c.status] || STATUS_CHIP.OPENED}`}>
                              {c.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="p-3">
                            {active ? (
                              <div className="flex flex-col items-start gap-1">
                                {TERMINAL_STATUSES.includes(c.status) ? (
                                  <button
                                    type="button"
                                    disabled={busyId === `${c.id}:INVESTIGATING`}
                                    onClick={() => void transition(c, "INVESTIGATING", "Assigned to service desk for investigation")}
                                    className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold hover:bg-sky-500/25 disabled:opacity-50 inline-flex items-center gap-1"
                                  >
                                    <UserCheck className="w-3 h-3" /> Investigate
                                  </button>
                                ) : null}
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={busyId === `${c.id}:RESOLVED`}
                                    onClick={() => void transition(c, "RESOLVED", "Resolved after service-desk review")}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/25 disabled:opacity-50"
                                  >
                                    Resolve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCompensateFor(c);
                                      setCompAmount(String(c.disputedAmount || ""));
                                      setCompReason("");
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold hover:bg-amber-500/25"
                                  >
                                    Compensate
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void transition(c, "CLOSED", "Closed after review")}
                                className="px-2 py-1 rounded-lg border border-white/10 text-slate-400 text-[10px] font-bold hover:bg-white/5 disabled:opacity-50"
                                disabled={c.status === "CLOSED" || busyId === `${c.id}:CLOSED`}
                              >
                                Close
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recovery rail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Disputes",
                rows: openDisputes,
                ref: (d: any) => d.disputeReference || d.id,
                tone: "text-sky-300",
                empty: "No open disputes.",
              },
              {
                title: "Chargebacks",
                rows: recovery.chargebacks,
                ref: (cb: any) => cb.chargebackReference || cb.id,
                tone: "text-rose-300",
                empty: "No chargebacks in the engine book.",
              },
              {
                title: "Refunds & reversals",
                rows: recovery.refunds,
                ref: (r: any) => r.refundReference || r.id,
                tone: "text-emerald-300",
                empty: "No refunds in the engine book.",
              },
            ].map((bucket) => (
              <div key={bucket.title} className="rounded-3xl bg-[#0b1324] border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${bucket.tone}`}>{bucket.title}</p>
                  <span className="text-[10px] font-mono text-slate-500">{bucket.rows.length}</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {bucket.rows.length === 0 ? (
                    <p className="text-[11px] text-slate-500">{bucket.empty}</p>
                  ) : (
                    bucket.rows.slice(0, 4).map((r: any, i: number) => (
                      <div key={i} className="rounded-xl bg-slate-950/60 border border-white/5 px-2.5 py-1.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-slate-300 truncate">{bucket.ref(r)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${STATUS_CHIP[r.status] || "bg-slate-500/15 text-slate-300 border border-slate-500/30"}`}>
                          {r.status || "—"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Landmark className="w-3.5 h-3.5 text-slate-500" />
            Complaint triage &amp; compensation journal through ComplaintDisputeEngine (redress expense DR · customer wallet CR) — full dispute
            lifecycle lives under{" "}
            <Link href="/admin/disputes" className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5">
              Disputes <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </>
      )}

      {/* Compensation modal */}
      {compensateFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="comp-title">
          <div className="w-full max-w-md rounded-3xl bg-[#0d162a] border border-white/10 p-6 space-y-4">
            <h3 id="comp-title" className="text-sm font-bold text-white">
              Financial redress — {compensateFor.complaintReference}
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Posts a real double-entry journal (consumer redress expense DR → customer wallet CR) through the engine and marks the complaint
              RESOLVED. Amount in whole {compensateFor.currency}.
            </p>
            <label className="block">
              <span className="text-[10px] font-mono uppercase text-slate-500">Amount ({compensateFor.currency})</span>
              <input
                value={compAmount}
                onChange={(e) => setCompAmount(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono uppercase text-slate-500">Reason</span>
              <textarea
                value={compReason}
                onChange={(e) => setCompReason(e.target.value)}
                rows={2}
                placeholder="e.g. Duplicate debit confirmed — refund + 0% goodwill"
                className="mt-1 w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono uppercase text-slate-500">Authorized by (email)</span>
              <input
                value={compAuthorizer}
                onChange={(e) => setCompAuthorizer(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCompensateFor(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={compBusy || Number(compAmount) <= 0 || compReason.trim().length < 5 || !compAuthorizer.includes("@")}
                onClick={() => void submitCompensation()}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {compBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />}
                {compBusy ? "Journaling…" : `Post redress & resolve`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
