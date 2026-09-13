"use client";

// =============================================================================
// ExperienceHealthPulse — the executive home's view of the service book.
//
// GAP-4: complaints, disputes, chargebacks and refunds lived in four places and
// the home screen synthesised none of them — no P0 count, no SLA-breach count,
// no unresolved-exposure value for the accountable executive. This strip now
// reads ONE synthesis endpoint (/api/admin/cx/overview) instead of fanning out
// to four, so the numbers on the home screen are the same numbers the Customer
// Experience console shows, computed once by CxTruthService.
//
// Nothing here is guessed: if the engine has no measurement, the tile says so.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "./AdminContext";
import { Activity, RefreshCw, ShieldAlert, Timer, Repeat2, Star, Siren, ArrowRight, Landmark } from "lucide-react";
import type { CxSnapshot } from "@/lib/admin/CxTruthService";
import { adminFetch } from "@/lib/consoleKeys";

const PRIORITY_TONE: Record<string, string> = {
  P0: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  P1: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  P2: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  P3: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function currencySymbol(ccy: string): string {
  return ccy === "NGN" ? "₦" : ccy === "XOF" ? "CFA " : `${ccy} `;
}

function money(list: { currency: string; amount: number }[] | undefined): string {
  if (!list || list.length === 0) return "—";
  return list.map((t) => `${currencySymbol(t.currency)}${t.amount.toLocaleString()}`).join(" · ");
}

export const ExperienceHealthPulse: React.FC = () => {
  const { countryFilter } = useAdmin();
  const [snapshot, setSnapshot] = useState<CxSnapshot | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setPhase("loading");
      setRefreshing(true);
      try {
        const qs = countryFilter === "GLOBAL" ? "" : `?country=${countryFilter}`;
        const res = await adminFetch(`/api/admin/cx/overview${qs}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json?.success === false) throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`);
        setSnapshot(json.data as CxSnapshot);
        setRefreshedAt(new Date().toISOString());
        setPhase("ready");
        setError("");
      } catch (err: any) {
        setError(err?.message || "Pulse request failed");
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

  const urgent = snapshot?.queue.slice(0, 3) ?? [];
  const csat = snapshot?.csat;

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
              Live book of work · service &amp; customer health
            </p>
            <p className="text-[10px] text-slate-500">
              {countryFilter === "GLOBAL" ? "All markets" : countryFilter} · one synthesis of the complaint, dispute, chargeback,
              refund and redress engines
              {refreshedAt ? ` · ${new Date(refreshedAt).toLocaleTimeString()}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/cx"
            className="px-3 py-1.5 rounded-xl bg-violet-500 text-slate-950 text-xs font-bold shadow-md shadow-violet-500/20 hover:bg-violet-400 transition-colors inline-flex items-center gap-1.5"
          >
            Customer experience <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/support"
            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition-colors inline-flex items-center gap-1.5"
          >
            Service desk <ArrowRight className="w-3.5 h-3.5" />
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
          The service engines could not be read ({error}) — nothing is shown rather than showing stale figures. Refresh to retry.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
            <p className="text-[10px] font-mono uppercase text-slate-500">Open cases</p>
            <p className="mt-1 text-2xl font-bold font-mono text-white">{snapshot?.loop.open ?? "—"}</p>
            <p className="text-[10px] text-slate-500">
              {snapshot ? `${snapshot.loop.captured} in book · ${snapshot.loop.resolved + snapshot.loop.closed} resolved` : "reading…"}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
            <p className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" /> P0 critical
            </p>
            <p className="mt-1 text-2xl font-bold font-mono text-rose-300">{snapshot?.loop.p0Open ?? "—"}</p>
            <p className="text-[10px] text-slate-500">open, 24h clock</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
            <p className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Timer className="w-3 h-3 text-amber-400" /> Past SLA
            </p>
            <p className="mt-1 text-2xl font-bold font-mono text-amber-300">{snapshot?.sla.breached ?? "—"}</p>
            <p className="text-[10px] text-slate-500">
              {snapshot ? `${snapshot.sla.atRisk} closing in · of ${snapshot.loop.open} open` : "clock-derived"}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
            <p className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Repeat2 className="w-3 h-3 text-sky-400" /> Disputes · chargebacks · refunds
            </p>
            <p className="mt-1 text-lg font-bold font-mono text-sky-300">
              {snapshot
                ? `${snapshot.redress.disputes?.open ?? 0} · ${snapshot.redress.chargebacks?.total ?? 0} · ${snapshot.redress.refunds?.total ?? 0}`
                : "—"}
            </p>
            <p className="text-[10px] text-slate-500">open disputes · chargebacks · refunds</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-amber-500/20">
            <p className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Landmark className="w-3 h-3 text-amber-400" /> Unresolved exposure
            </p>
            <p className="mt-1 text-sm font-bold font-mono text-white">{money(snapshot?.loop.openExposure)}</p>
            <p className="text-[10px] text-slate-500">disputed value on open cases, by currency</p>
          </div>
        </div>
      )}

      {phase !== "error" && snapshot ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-white/5 px-3 py-2">
            <Star className="w-3.5 h-3.5 text-violet-300 shrink-0" />
            <span className="text-[11px] text-slate-300">
              {csat && csat.status === "MEASURED" ? (
                <>
                  CSAT <strong className="text-white">{csat.average}/5</strong> from {csat.responses} customer rating(s) ·{" "}
                  {csat.coveragePct}% coverage · NPS {csat.nps}
                </>
              ) : (
                <>
                  CSAT <strong className="text-slate-400">not measurable</strong> — 0 of {csat?.eligibleCases ?? 0} resolved case(s)
                  rated by a customer
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-white/5 px-3 py-2">
            <Siren className="w-3.5 h-3.5 text-rose-300 shrink-0" />
            <span className="text-[11px] text-slate-300">
              {snapshot.prevention.clusters.length > 0 ? (
                <>
                  {snapshot.prevention.clusters.length} recurring harm pattern(s) · {snapshot.prevention.activeIncidents} active
                  incident(s) · {snapshot.prevention.affectedCustomers} customer(s)
                </>
              ) : (
                <>No repeating category+agent pattern in the book · {snapshot.prevention.activeIncidents} active incident(s)</>
              )}
            </span>
          </div>
        </div>
      ) : null}

      {phase !== "error" && urgent.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {urgent.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-950/60 border border-white/5 px-3 py-2"
            >
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${PRIORITY_TONE[c.priority] || PRIORITY_TONE.P3}`}>
                {c.priority}
              </span>
              <span className="text-xs font-bold text-white font-mono">{c.reference}</span>
              <span className="text-xs text-slate-300">{c.customer}</span>
              <span className="text-[10px] text-slate-500">{c.category.replace(/_/g, " ").toLowerCase()}</span>
              {c.slaState === "BREACHED" ? (
                <span className="text-[10px] font-bold text-rose-400 uppercase">past SLA</span>
              ) : c.slaState === "AT_RISK" ? (
                <span className="text-[10px] font-bold text-amber-400 uppercase">closing in</span>
              ) : (
                <span className="text-[10px] text-slate-500">
                  due {new Date(c.slaDueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </span>
              )}
              <Link href="/admin/cx" className="ml-auto text-[11px] text-emerald-400 hover:text-emerald-300 font-bold">
                Triage →
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {phase === "ready" && snapshot && snapshot.loop.open === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-emerald-400/90 font-semibold">
          No open case in the engine book — clean service posture. This strip never shows a sample queue to fill the space.
        </p>
      ) : null}
    </section>
  );
};

export default ExperienceHealthPulse;
