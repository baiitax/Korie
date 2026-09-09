"use client";

// =============================================================================
// ExperienceHealthPulse — LIVE engine pulse for the admin Command Center.
// Every number is fetched at render/refresh from the engine-backed recovery &
// consumer-protection APIs (complaints, disputes, chargebacks, refunds) —
// nothing here is static. Static demo panels elsewhere in the console are the
// simulation layer; this strip is the real-time service-health rail.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "./AdminContext";
import { Activity, RefreshCw, ShieldAlert, Timer, Repeat2, RotateCcw, Landmark, ArrowRight } from "lucide-react";

interface ComplaintLite {
  id: string;
  complaintReference: string;
  customerName: string;
  customerPhone?: string;
  category: string;
  priority: string;
  status: string;
  disputedAmount: number;
  currency: "NGN" | "XOF";
  slaDueAt: string;
  isSlaBreached: boolean;
  createdAt: string;
}

interface PulseData {
  complaints: { complaints: ComplaintLite[]; total: number; open: number; resolved: number; p0Critical: number } | null;
  disputes: { total: number; open: number } | null;
  chargebacks: { total: number } | null;
  refunds: { total: number } | null;
}

const PRIORITY_TONE: Record<string, string> = {
  P0: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  P1: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  P2: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  P3: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function currencySymbol(ccy: string): string {
  return ccy === "NGN" ? "₦" : "CFA ";
}

export const ExperienceHealthPulse: React.FC = () => {
  const { countryFilter } = useAdmin();
  const [data, setData] = useState<PulseData>({ complaints: null, disputes: null, chargebacks: null, refunds: null });
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setPhase("loading");
    setRefreshing(true);
    try {
      const country = countryFilter === "GLOBAL" ? "" : `?country=${countryFilter}`;
      const [complaintsRes, disputesRes, chargebacksRes, refundsRes] = await Promise.all([
        fetch(`/api/complaints${country}`, { cache: "no-store" }),
        fetch(`/api/disputes${country}`, { cache: "no-store" }),
        fetch(`/api/chargebacks${country}`, { cache: "no-store" }),
        fetch(`/api/refunds${country}`, { cache: "no-store" }),
      ]);
      const [complaints, disputes, chargebacks, refunds] = await Promise.all([
        complaintsRes.json().then((j) => j.data || null),
        disputesRes.json().then((j) => j.data || null),
        chargebacksRes.json().then((j) => j.data || null),
        refundsRes.json().then((j) => j.data || null),
      ]);
      setData({ complaints, disputes, chargebacks, refunds });
      setRefreshedAt(new Date().toISOString());
      setPhase("ready");
    } catch (err: any) {
      setError(err?.message || "Pulse request failed");
      setPhase("error");
    } finally {
      setRefreshing(false);
    }
  }, [countryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openComplaints = (data.complaints?.complaints || []).filter(
    (c) => c.status !== "RESOLVED" && c.status !== "CLOSED",
  );
  const slaBreached = openComplaints.filter((c) => c.isSlaBreached);
  const exposureOpen = openComplaints.reduce((s, c) => s + (c.disputedAmount || 0), 0);
  const urgent = [...openComplaints]
    .sort((a, b) => (b.isSlaBreached ? 1 : 0) - (a.isSlaBreached ? 1 : 0) || a.priority.localeCompare(b.priority))
    .slice(0, 3);

  return (
    <section
      aria-label="Live service and customer health pulse"
      className="rounded-3xl border border-emerald-500/20 bg-[#0b1324] p-4 sm:p-5 shadow-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
              Live engine pulse · Service & customer health
            </p>
            <p className="text-[10px] text-slate-500">
              {countryFilter === "GLOBAL" ? "All markets" : countryFilter} · fetched from complaint / dispute / chargeback / refund engines
              {refreshedAt ? ` · ${new Date(refreshedAt).toLocaleTimeString()}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/support"
            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition-colors inline-flex items-center gap-1.5"
          >
            Service & recovery desk <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            aria-label="Refresh live pulse"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {phase === "error" ? (
        <p className="mt-3 text-xs text-rose-400 font-semibold">
          Pulse could not reach the engines ({error}) — refresh to retry.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
            <p className="text-[10px] font-mono uppercase text-slate-500">Open complaints</p>
            <p className="mt-1 text-2xl font-bold font-mono text-white">{data.complaints?.open ?? "—"}</p>
            <p className="text-[10px] text-slate-500">{data.complaints?.resolved ?? 0} resolved</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
            <p className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" /> P0 critical
            </p>
            <p className="mt-1 text-2xl font-bold font-mono text-rose-300">{data.complaints?.p0Critical ?? "—"}</p>
            <p className="text-[10px] text-slate-500">within book</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
            <p className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Timer className="w-3 h-3 text-amber-400" /> SLA breached
            </p>
            <p className="mt-1 text-2xl font-bold font-mono text-amber-300">{slaBreached.length}</p>
            <p className="text-[10px] text-slate-500">of {openComplaints.length} open</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
            <p className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Repeat2 className="w-3 h-3 text-sky-400" /> Open disputes
            </p>
            <p className="mt-1 text-2xl font-bold font-mono text-sky-300">{data.disputes?.open ?? "—"}</p>
            <p className="text-[10px] text-slate-500">
              {data.chargebacks ? `${data.chargebacks.total} chargeback${data.chargebacks.total === 1 ? "" : "s"} · ${data.refunds?.total ?? 0} refunds` : ""}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-amber-500/20">
            <p className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Landmark className="w-3 h-3 text-amber-400" /> Open complaint exposure
            </p>
            <p className="mt-1 text-xl font-bold font-mono text-white">{currencySymbol(data.complaints?.complaints?.[0]?.currency || "NGN")}{(exposureOpen || 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">disputed amounts, unresolved</p>
          </div>
        </div>
      )}

      {phase !== "error" && urgent.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {urgent.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-950/60 border border-white/5 px-3 py-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${PRIORITY_TONE[c.priority] || PRIORITY_TONE.P3}`}>
                {c.priority}
              </span>
              <span className="text-xs font-bold text-white font-mono">{c.complaintReference}</span>
              <span className="text-xs text-slate-300">{c.customerName}</span>
              <span className="text-[10px] text-slate-500">{c.category.replace(/_/g, " ").toLowerCase()}</span>
              {c.isSlaBreached ? (
                <span className="text-[10px] font-bold text-rose-400 uppercase">SLA breached</span>
              ) : (
                <span className="text-[10px] text-slate-500">
                  due {new Date(c.slaDueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </span>
              )}
              <Link href="/admin/support" className="ml-auto text-[11px] text-emerald-400 hover:text-emerald-300 font-bold">
                Triage →
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {phase === "ready" && openComplaints.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-emerald-400/90 font-semibold">
          <RotateCcw className="w-3.5 h-3.5" /> No open complaints in the engine book — clean service posture.
        </p>
      ) : null}
    </section>
  );
};

export default ExperienceHealthPulse;
