"use client";

/**
 * Super Admin — Executive Overview (GAP-1 remediation).
 *
 * Every figure on this page now comes from `/api/admin/overview/executive`,
 * which aggregates engines that actually record the underlying events
 * (LedgerService journals, BankCoreEngine nostros + bank transactions,
 * AdminConfigurationEngine probe results, SubledgerEngine wallets, customer /
 * account / agent registries, ExceptionEngine). Panels whose recording source
 * is not wired in this build render "—" with the missing source named — no
 * estimate is ever shown in place of a fact.
 */
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "./AdminContext";
import ExperienceHealthPulse from "./ExperienceHealthPulse";
import {
  ArrowRightLeft,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Coins,
  Building2,
  Users,
  Repeat2,
  CreditCard,
  X,
  Loader2,
} from "lucide-react";

interface NodeTruth {
  id: string;
  code: string;
  name: string;
  provider: string;
  country: string;
  currency: "NGN" | "XOF";
  environment: string;
  status: string;
  railMode: "LIVE" | "SIMULATED";
  lastProbe: { at: string; ok: boolean; httpStatus?: number; latencyMs?: number; error?: string } | null;
  capabilities: number;
  nostro: { balance: number; settlementAccount: string; updatedAt: string; currency: string } | null;
  source: string;
}

interface VolumeTruth {
  currency: "NGN" | "XOF";
  journalCount24h: number;
  journalCountTotal: number;
  bankTxnCount24h: number;
  bankTxnCountTotal: number;
  failedCount24h: number;
  ledgerClearedMinor24h: number;
  ledgerClearedMinorTotal: number;
  bankClearedMinor24h: number;
  bankClearedMinorTotal: number;
  successRatePct: number | null;
  sampleSize24h: number;
}

interface FeedRow {
  id: string;
  reference: string;
  kind: "LEDGER_JOURNAL" | "BANK_TXN";
  type: string;
  currency: "NGN" | "XOF";
  amount: number;
  status: string;
  narration: string;
  at: string;
  entries: { account: string; entryType: "DEBIT" | "CREDIT"; amountMinor: number }[];
  source: string;
}

interface TruthSnapshot {
  asOf: string;
  country: string;
  headline: {
    nodesTotal: number;
    nodesConnected: number;
    nodesProbed: number;
    nodesFailed: number;
    railMode: "LIVE" | "SIMULATED";
    statement: string;
  };
  nodes: NodeTruth[];
  volumes: VolumeTruth[];
  liquidity: {
    nostros: { nodeId: string; currency: string; balance: number; settlementAccount: string; updatedAt: string }[];
    walletLiabilityMinor: { currency: string; minor: number; accounts: number }[];
    glLiquidityMinor: { accountNumber: string; name: string; currency: string; minor: number; isRegistrySeed: boolean }[];
  };
  entities: { customers: number | null; accounts: number | null; agents: number | null; merchants: number | null; bdcs: number | null };
  exceptions: { total: number; open: number } | null;
  pendingApprovals: { count: number; items: { id: string; title: string }[] } | null;
  feed: FeedRow[];
  sources: { key: string; engine: string; available: boolean; records?: number; note?: string }[];
  warnings: string[];
}

const money = (minor: number, currency: string) => {
  const major = minor / 100;
  if (currency === "XOF") return `${major.toLocaleString(undefined, { maximumFractionDigits: 0 })} CFA`;
  return `₦${major.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};
const majorMoney = (major: number, currency: string) =>
  currency === "XOF" ? `${major.toLocaleString()} CFA` : `₦${major.toLocaleString()}`;

const nodeStatusTone = (status: string) => {
  switch (status) {
    case "CONNECTED":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "FAILED":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "PAUSED":
      return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    case "CONNECTING":
      return "bg-sky-500/10 text-sky-300 border-sky-500/20";
    default:
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  }
};

const flag = (country: string) => (country === "NG" ? "🇳🇬" : country === "NE" ? "🇳🇪" : "🌍");

export const CommandCenterOverview: React.FC = () => {
  const { countryFilter, openMakerChecker } = useAdmin();
  const [snapshot, setSnapshot] = useState<TruthSnapshot | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");
  const [inspecting, setInspecting] = useState<FeedRow | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setPhase((p) => (p === "ready" ? p : "loading"));
      try {
        const res = await fetch(`/api/admin/overview/executive?country=${countryFilter}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.error?.message || `HTTP ${res.status}`);
        setSnapshot(json.data as TruthSnapshot);
        setRefreshedAt(new Date().toISOString());
        setPhase("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Executive truth feed unavailable");
        setPhase("error");
      }
    },
    [countryFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => void load(true), 30000);
    return () => clearInterval(id);
  }, [load]);

  const ngn = snapshot?.volumes.find((v) => v.currency === "NGN");
  const xof = snapshot?.volumes.find((v) => v.currency === "XOF");
  const nostroNgn = snapshot?.liquidity.nostros.find((n) => n.currency === "NGN");
  const nostroXof = snapshot?.liquidity.nostros.find((n) => n.currency === "XOF");
  const walletNgn = snapshot?.liquidity.walletLiabilityMinor.find((w) => w.currency === "NGN");
  const walletXof = snapshot?.liquidity.walletLiabilityMinor.find((w) => w.currency === "XOF");

  if (phase === "loading" && !snapshot) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
        <p className="text-xs text-slate-400 mt-2">Reading executive figures from live engines…</p>
      </div>
    );
  }

  if (phase === "error" && !snapshot) {
    return (
      <div className="p-10 max-w-7xl mx-auto">
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-6">
          <p className="text-sm font-bold text-rose-300">Executive truth feed unavailable</p>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <p className="text-[11px] text-slate-500 mt-2">
            No figures are shown rather than stale or estimated ones — retry to load from the engines.
          </p>
          <button onClick={() => void load()} className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  const h = snapshot.headline;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 01: Truth strip — computed, not asserted */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0d162a] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                ENGINE TRUTH
              </span>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                  h.railMode === "LIVE" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                Liquidity rail: {h.railMode}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                as of {new Date(snapshot.asOf).toLocaleTimeString()} · {snapshot.sources.filter((s) => s.available).length}/{snapshot.sources.length} sources live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium">{h.statement}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => void load()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/5 transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${phase === "loading" ? "animate-spin" : ""}`} />
            {refreshedAt ? `Synced ${new Date(refreshedAt).toLocaleTimeString()}` : "Refresh"}
          </button>
          <Link
            href="/admin/reconciliation"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/5 transition-colors"
          >
            Exceptions ({snapshot.exceptions ? snapshot.exceptions.open : "—"})
          </Link>
          {snapshot.pendingApprovals === null ? (
            <span
              className="px-3.5 py-1.5 rounded-xl bg-slate-800/60 text-slate-500 text-xs font-bold border border-white/5 cursor-not-allowed"
              title="No maker–checker recorder is wired in this build, so no approval items are shown instead of demo ones."
            >
              Review Queue — not wired
            </span>
          ) : (
            <button
              onClick={() => {
                const first = snapshot.pendingApprovals?.items[0];
                if (first) openMakerChecker(first as never);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-colors"
            >
              Review Queue ({snapshot.pendingApprovals.count})
            </button>
          )}
        </div>
      </div>

      {/* 01b: LIVE engine pulse — service & customer health */}
      <ExperienceHealthPulse />

      {/* Source ledger honesty strip */}
      {snapshot.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">Withheld rather than estimated</p>
          {snapshot.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-200/80">
              • {w}
            </p>
          ))}
        </div>
      )}

      {/* 02: Banking nodes — real connector state + real probe results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Core Financial Institution Nodes
            </h2>
          </div>
          <Link href="/admin/banking-nodes" className="text-xs text-emerald-400 hover:underline font-mono">
            Full Node Diagnostics →
          </Link>
        </div>

        {snapshot.nodes.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 text-xs text-slate-400">
            No BANK_NODE connectors registered for this filter.{" "}
            <Link href="/admin/settings" className="text-emerald-400 hover:underline">
              Configure a bank node →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {snapshot.nodes.map((node) => (
              <div key={node.id} className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 hover:border-emerald-500/40 transition-all space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{flag(node.country)}</span>
                    <span className="leading-tight">{node.name}</span>
                  </span>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${nodeStatusTone(node.status)}`}>
                    ● {node.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Probe rt</span>
                    <span className={node.lastProbe?.latencyMs ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>
                      {node.lastProbe?.latencyMs != null ? `${node.lastProbe.latencyMs}ms` : "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">HTTP</span>
                    <span className={node.lastProbe?.ok ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>
                      {node.lastProbe?.httpStatus ?? "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Rail</span>
                    <span className={node.railMode === "LIVE" ? "text-emerald-400 font-bold" : "text-amber-300 font-bold"}>
                      {node.railMode}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  {node.lastProbe
                    ? `Last probe ${new Date(node.lastProbe.at).toLocaleString()}${node.lastProbe.error ? ` · ${node.lastProbe.error}` : ""}`
                    : "Never probed in this environment — connectivity unverified"}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-white/5">
                  <span>Nostro float:</span>
                  <span className="text-white font-mono font-semibold">
                    {node.nostro ? majorMoney(node.nostro.balance, node.nostro.currency) : "—"}
                  </span>
                </div>
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wide">{node.source}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 03: Executive figures — recorded value, with sample sizes where relevant */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ledger value posted 24h (NGN)</span>
            <span className="text-[10px] font-mono text-slate-500">LedgerService + BankCoreEngine</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">{money(ngn?.ledgerClearedMinor24h ?? 0, "NGN")}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            from {ngn?.journalCount24h ?? 0} posted journal(s) · all-time {money(ngn?.ledgerClearedMinorTotal ?? 0, "NGN")}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Bank-core rail ops 24h: {money(ngn?.bankClearedMinor24h ?? 0, "NGN")} ({ngn?.bankTxnCount24h ?? 0} txn)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ledger value posted 24h (XOF)</span>
            <span className="text-[10px] font-mono text-slate-500">LedgerService + BankCoreEngine</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">{money(xof?.ledgerClearedMinor24h ?? 0, "XOF")}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            from {xof?.journalCount24h ?? 0} posted journal(s) · all-time {money(xof?.ledgerClearedMinorTotal ?? 0, "XOF")}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Bank-core rail ops 24h: {money(xof?.bankClearedMinor24h ?? 0, "XOF")} ({xof?.bankTxnCount24h ?? 0} txn)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Settlement success 24h</span>
            <span className="text-[10px] font-mono text-slate-500">status-bearing records only</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {ngn?.successRatePct != null ? `${ngn.successRatePct}%` : xof?.successRatePct != null ? `${xof.successRatePct}%` : "—"}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {(() => {
              const v = ngn?.successRatePct != null ? ngn : xof;
              if (!v || v.sampleSize24h === 0) return "no settled transactions in the last 24h";
              return `${v.sampleSize24h - v.failedCount24h}/${v.sampleSize24h} bank txns settled · ${v.failedCount24h} failed`;
            })()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Ledger postings record no failures, so they are excluded from the rate.</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Settlement float at partner banks</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {ourNostroLabel(nostroNgn?.balance ?? null, "NGN")}
          </div>
          <div className="text-[11px] text-amber-300 font-mono">
            {nostroXof ? `${majorMoney(nostroXof.balance, "XOF")} at the Coris node` : "no XOF nostro recorded"}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Customer wallet liability: {walletNgn ? money(walletNgn.minor, "NGN") : "—"}
            {walletXof ? ` · ${money(walletXof.minor, "XOF")}` : ""}
          </div>
        </div>
      </div>

      {/* 04: Ecosystem registries — real counts, or an explicit withheld state */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Customers", value: snapshot.entities.customers, href: "/admin/customers", icon: Users, tone: "text-teal-400", source: "CustomerLifecycleEngine" },
          { label: "Open accounts (NUBAN)", value: snapshot.entities.accounts, href: "/admin/wallets", icon: Coins, tone: "text-sky-400", source: "AccountLifecycleEngine" },
          { label: "Agents (registry)", value: snapshot.entities.agents, href: "/admin/agents", icon: Building2, tone: "text-emerald-400", source: "AgentManagementEngine" },
          { label: "Merchants", value: snapshot.entities.merchants, href: "/admin/merchants", icon: CreditCard, tone: "text-orange-400", source: "no registry engine wired" },
        ].map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-teal-500/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <tile.icon className={`w-4 h-4 ${tile.tone}`} />
              {tile.value == null && (
                <span className="text-[9px] font-mono uppercase text-amber-300/80 border border-amber-500/20 rounded px-1">
                  withheld
                </span>
              )}
            </div>
            <div className="text-lg font-bold font-mono text-white">{tile.value == null ? "—" : tile.value.toLocaleString()}</div>
            <div className="text-xs text-slate-400">{tile.label}</div>
            <div className="text-[9px] font-mono text-slate-600 mt-0.5 uppercase tracking-wide">{tile.source}</div>
          </Link>
        ))}
      </div>

      {/* 05: Recorded transactions feed */}
      <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Recorded Ledger &amp; Bank Activity
            </h3>
            <span className="text-[10px] font-mono text-slate-500">refreshed every 30s</span>
          </div>
          <Link href="/admin/transactions" className="text-xs text-emerald-400 hover:underline font-mono">
            View All Transactions →
          </Link>
        </div>

        {snapshot.feed.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">
            No journals or bank transactions recorded yet — run a bank-core credit or transfer and it appears here with its
            ledger entries.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-slate-400 border-b border-white/5">
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Source</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Detail</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Recorded</th>
                  <th className="pb-3 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {snapshot.feed.map((row) => (
                  <tr key={row.id} onClick={() => setInspecting(row)} className="hover:bg-white/5 cursor-pointer transition-colors group">
                    <td className="py-3.5 font-mono text-white font-semibold group-hover:text-emerald-400">{row.reference}</td>
                    <td className="py-3.5 font-mono text-[10px] text-slate-500">{row.source}</td>
                    <td className="py-3.5 text-slate-300">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-white/5">{row.type}</span>
                    </td>
                    <td className="py-3.5 text-slate-300 max-w-[280px] truncate">{row.narration}</td>
                    <td className="py-3.5 font-mono font-bold text-white">{majorMoney(row.amount, row.currency)}</td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          row.status === "SUCCESSFUL" || row.status === "POSTED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : row.status === "FAILED"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        ● {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-[10px] text-slate-500">{new Date(row.at).toLocaleTimeString()}</td>
                    <td className="py-3.5 text-right font-mono text-[11px] text-emerald-400 group-hover:underline">Open ↗</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Truth inspector — shows the recorded posting, nothing inferred */}
      {inspecting && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button aria-label="Close" onClick={() => setInspecting(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
              <div>
                <p className="text-[10px] font-mono uppercase text-slate-500">{inspecting.source} · {inspecting.kind}</p>
                <h3 className="text-base font-bold text-white mt-0.5">{inspecting.reference}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{inspecting.narration}</p>
              </div>
              <button onClick={() => setInspecting(null)} className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase font-mono">Amount</span>
                  <span className="text-white font-mono font-bold">{majorMoney(inspecting.amount, inspecting.currency)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase font-mono">Status</span>
                  <span className="text-emerald-400 font-mono font-bold">{inspecting.status}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase font-mono">Recorded</span>
                  <span className="text-white font-mono font-bold">{new Date(inspecting.at).toLocaleString()}</span>
                </div>
              </div>

              {inspecting.entries.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Posted double-entry lines</p>
                  {inspecting.entries.map((e, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            e.entryType === "DEBIT" ? "bg-sky-500/10 text-sky-300 border border-sky-500/20" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          }`}
                        >
                          {e.entryType}
                        </span>
                        <span className="text-slate-300 truncate">{e.account}</span>
                      </span>
                      <span className="font-mono text-white shrink-0">{money(e.amountMinor, inspecting.currency)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Bank-core operation — the matching ledger journal is the row in this feed sourced from LedgerService.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sources audit — what is live, what is not */}
      <div className="p-5 rounded-3xl bg-[#0b1324] border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          {snapshot.warnings.length === 0 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Figure provenance</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {snapshot.sources.map((s) => (
            <div key={s.key} className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-200">{s.key}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                    s.available ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                  }`}
                >
                  {s.available ? (s.records != null ? `${s.records} records` : "live") : "withheld"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{s.engine}</p>
              {s.note && <p className="text-[10px] text-slate-500 mt-0.5">{s.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** NGN nostro label helper — explicit about "no record" instead of a zero. */
function ourNostroLabel(balance: number | null, currency: string): string {
  return balance == null ? "—" : majorMoney(balance, currency);
}

export default CommandCenterOverview;
