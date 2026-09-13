"use client";

/**
 * Banking Node Diagnostics — GAP-1 remediation (same truth source as the
 * executive home). Node state, latency and connectivity come exclusively from
 * AdminConfigurationEngine connector records and their recorded probe results;
 * "Health check" runs the engine's REAL probe (live HTTP fetch, 6s timeout)
 * rather than a timed animation, and failover uses the engine's real routing
 * roles (one PRIMARY + one FAILOVER per category) instead of a fabricated
 * pending approval.
 */
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminContext";
import { adminFetch } from "@/lib/consoleKeys";
import {
  Server,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ArrowRightLeft,
  CheckCircle2,
  Database,
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

interface ConnectorRow {
  id: string;
  code: string;
  name: string;
  role: string;
  category: string;
  environment: string;
  status: string;
  baseUrl: string;
  lastProbe?: { at: string; ok: boolean; httpStatus?: number; latencyMs?: number; error?: string } | null;
}

interface Snapshot {
  asOf: string;
  headline: { nodesTotal: number; nodesConnected: number; nodesProbed: number; nodesFailed: number; railMode: string; statement: string };
  nodes: NodeTruth[];
  warnings: string[];
}

const money = (major: number, currency: string) =>
  currency === "XOF" ? `${major.toLocaleString()} CFA` : `₦${major.toLocaleString()}`;

const statusTone = (status: string) =>
  status === "CONNECTED"
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : status === "FAILED"
    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
    : status === "CONNECTING"
    ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
    : status === "PAUSED"
    ? "bg-slate-500/10 text-slate-300 border-slate-500/20"
    : "bg-amber-500/10 text-amber-300 border-amber-500/20";

export default function BankingNodesPage() {
  const { openMakerChecker } = useAdmin();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setPhase("loading");
    try {
      const [snapRes, connRes] = await Promise.all([
        adminFetch("/api/admin/overview/executive?country=GLOBAL", { cache: "no-store" }),
        adminFetch("/api/admin/config/connectors", { cache: "no-store" }),
      ]);
      const snapJson = await snapRes.json();
      const connJson = await connRes.json();
      if (!snapRes.ok || !snapJson?.success) throw new Error(snapJson?.error?.message || `HTTP ${snapRes.status}`);
      setSnapshot(snapJson.data as Snapshot);
      if (connRes.ok && connJson?.success) setConnectors(connJson.data as ConnectorRow[]);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Node truth feed unavailable");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Real probe — the engine performs a live HTTP health fetch and records the result. */
  const runProbe = async (connectorId: string, label: string) => {
    setBusyId(connectorId);
    setNotice(null);
    try {
      const res = await adminFetch(`/api/admin/config/connectors/${connectorId}/probe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "System Administrator" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || `HTTP ${res.status}`);
      const probe = (json.data as ConnectorRow).lastProbe;
      setNotice({
        ok: Boolean(probe?.ok),
        text: probe?.ok
          ? `${label}: probe succeeded — HTTP ${probe.httpStatus}${probe.latencyMs ? ` in ${probe.latencyMs}ms` : ""}.`
          : `${label}: probe failed — ${probe?.error || "unreachable"}.`,
      });
      await load(true);
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Probe failed" });
    } finally {
      setBusyId(null);
    }
  };

  /** Real routing-role change (AdminConfigurationEngine enforces one PRIMARY + one FAILOVER). */
  const setRole = async (connectorId: string, role: "PRIMARY" | "FAILOVER") => {
    setBusyId(`role-${connectorId}`);
    setNotice(null);
    try {
      const res = await adminFetch(`/api/admin/config/connectors/${connectorId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, actor: "System Administrator" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || `HTTP ${res.status}`);
      setNotice({ ok: true, text: `Routing role updated: connector ${connectorId} → ${role}.` });
      await load(true);
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Role change rejected" });
    } finally {
      setBusyId(null);
    }
  };

  const bankNodeConnectors = connectors.filter((c) => c.category === "BANK_NODE");

  if (phase === "loading" && !snapshot) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
        <p className="text-xs text-slate-400 mt-2">Reading node state from the configuration engine…</p>
      </div>
    );
  }

  if (phase === "error" && !snapshot) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-6">
          <p className="text-sm font-bold text-rose-300">Node truth feed unavailable</p>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <button onClick={() => void load()} className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CORE BANKING INFRASTRUCTURE
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                snapshot.headline.railMode === "LIVE"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}
            >
              Liquidity rail: {snapshot.headline.railMode}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Financial Institution Gateway Nodes</h1>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
            Recorded connector state, cached probe results and settlement nostros for the partner-bank nodes. Numbers shown here
            are the values the engines hold — unprobed nodes show no latency, and nodes without a base URL cannot be probed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => bankNodeConnectors.forEach((c) => void runProbe(c.id, c.name))}
            disabled={busyId !== null || bankNodeConnectors.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${busyId ? "animate-spin" : ""}`} />
            <span>Probe all bank nodes</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs font-semibold border flex items-start gap-2 ${
            notice.ok ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" : "bg-amber-500/10 text-amber-200 border-amber-500/25"
          }`}
        >
          {notice.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {snapshot.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">Unverified / withheld</p>
          {snapshot.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-200/80">
              • {w}
            </p>
          ))}
        </div>
      )}

      {/* Nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {snapshot.nodes.length === 0 && (
          <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 text-xs text-slate-400">
            No BANK_NODE connectors registered.{" "}
            <Link href="/admin/settings" className="text-emerald-400 hover:underline">
              Register Providus / Coris in Configuration &amp; Automation →
            </Link>
          </div>
        )}

        {snapshot.nodes.map((node) => {
          const connector = bankNodeConnectors.find((c) => c.code === node.code);
          return (
            <div key={node.id} className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{node.country === "NG" ? "🇳🇬" : node.country === "NE" ? "🇳🇪" : "🌍"}</span>
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">{node.name}</h3>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {node.provider} · {node.code} · {node.environment}
                  </div>
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border flex items-center gap-1.5 ${statusTone(node.status)}`}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {node.status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase">Probe rt</span>
                  <span className={node.lastProbe?.latencyMs != null ? "text-emerald-400 font-bold text-sm" : "text-slate-500 font-bold text-sm"}>
                    {node.lastProbe?.latencyMs != null ? `${node.lastProbe.latencyMs}ms` : "—"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase">HTTP</span>
                  <span className={node.lastProbe?.ok ? "text-emerald-400 font-bold text-sm" : "text-slate-500 font-bold text-sm"}>
                    {node.lastProbe?.httpStatus ?? "—"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase">Currency</span>
                  <span className="text-white font-bold text-sm">{node.currency}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase">Rail</span>
                  <span className={node.railMode === "LIVE" ? "text-emerald-400 font-bold text-sm" : "text-amber-300 font-bold text-sm"}>
                    {node.railMode}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Settlement nostro</span>
                  <span className="font-mono text-white font-semibold">
                    {node.nostro ? `${money(node.nostro.balance, node.nostro.currency)} · ${node.nostro.settlementAccount}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Capabilities mapped</span>
                  <span className="font-mono text-slate-200">{node.capabilities}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last probe</span>
                  <span className="font-mono text-slate-200">
                    {node.lastProbe ? new Date(node.lastProbe.at).toLocaleString() : "never probed"}
                  </span>
                </div>
                {node.lastProbe?.error && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Probe error</span>
                    <span className="font-mono text-rose-300">{node.lastProbe.error}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-400 shrink-0">Probe target</span>
                  <span className="font-mono text-slate-500 text-[10px] break-all text-right">
                    {connector?.baseUrl ? `${connector.baseUrl}` : "no base URL configured"}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-slate-800 text-slate-300 border-white/10">
                    role: {connector?.role || "NONE"}
                  </span>
                  <button
                    onClick={() => connector && void setRole(connector.id, "PRIMARY")}
                    disabled={!connector || busyId !== null || connector.role === "PRIMARY"}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors disabled:opacity-40"
                    title="Route primary liquidity through this node (engine enforces one PRIMARY per category)"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 inline-block mr-1" />
                    Make PRIMARY
                  </button>
                  <button
                    onClick={() => connector && void setRole(connector.id, "FAILOVER")}
                    disabled={!connector || busyId !== null || connector.role === "FAILOVER"}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-40"
                    title="Keep as standby node"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 inline-block mr-1" />
                    Set FAILOVER
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => connector && void runProbe(connector.id, node.name)}
                    disabled={!connector || busyId !== null}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors disabled:opacity-50 text-xs"
                  >
                    {busyId === connector?.id ? "Probing…" : "Run live probe"}
                  </button>
                  <Link
                    href="/admin/settings"
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 font-semibold transition-colors text-xs"
                  >
                    Credentials
                  </Link>
                </div>
              </div>

              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Database className="w-3 h-3" /> {node.source}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 flex items-start gap-2">
        <Server className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Failover is a real routing-role change recorded by the configuration engine (audited). It no longer opens a demo
        approval request, because no maker–checker recorder exists in this build — supervisor sign-off must not be simulated.
      </p>
    </div>
  );
}
