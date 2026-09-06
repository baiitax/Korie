"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Network,
  Zap,
  SlidersHorizontal,
  ScrollText,
  LayoutGrid,
  RefreshCw,
} from "lucide-react";
import { apiGet } from "./api";
import { HubCard, HubError, HubLoading } from "./bits";
import { ConnectionsPanel } from "./ConnectionsPanel";
import { AutomationPanel } from "./AutomationPanel";
import { ParametersPanel } from "./ParametersPanel";
import { AuditPanel } from "./AuditPanel";
import { OverviewPanel } from "./OverviewPanel";
import type { AdminConfigOverview } from "@/types/adminConfiguration";

type TabKey = "overview" | "connections" | "automation" | "parameters" | "audit";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "connections", label: "Connections", icon: Network },
  { key: "automation", label: "Automation", icon: Zap },
  { key: "parameters", label: "Parameters", icon: SlidersHorizontal },
  { key: "audit", label: "Audit trail", icon: ScrollText },
];

export default function AdminConfigHub() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<AdminConfigOverview | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const data = await apiGet<AdminConfigOverview>("/api/admin/config/overview");
      setOverview(data);
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Failed to load configuration");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bump = useCallback(() => {
    setRefreshKey(k => k + 1);
    void refresh();
  }, [refresh]);

  const connected = overview?.connectors.byStatus.CONNECTED ?? 0;
  const liveRules = overview?.automationRules.enabled ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Configuration & Automation Hub
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-400 border border-white/10">
              SERVER-OWNED · DEMO RUNTIME
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5">
            Platform Configuration, Connections & Workflow Automation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
            Register external fintech APIs (payment gateways, settlement rails, bank nodes, liquidity pools,
            WhatsApp support agents and more) — the system probes them, discovers their capabilities and uses
            them for routing. Automation rules simplify repeated approvals; every decision is audited.
          </p>
        </div>
        {phase === "ready" && overview && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-[#0b1324] border border-white/10 text-center">
              <p className="text-lg font-extrabold font-mono text-emerald-400">{connected}</p>
              <p className="text-[9px] font-mono uppercase text-slate-500">Connected</p>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#0b1324] border border-white/10 text-center">
              <p className="text-lg font-extrabold font-mono text-sky-400">{liveRules}</p>
              <p className="text-[9px] font-mono uppercase text-slate-500">Live rules</p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:border-white/25 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Configuration sections">
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
              tab === t.key
                ? "bg-emerald-500 text-slate-950"
                : "bg-[#0b1324] border border-white/10 text-slate-400 hover:text-white hover:border-white/25"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {phase === "error" ? (
        <HubError title="Could not reach the configuration service" message={error ?? undefined} onRetry={() => void refresh()} />
      ) : phase !== "ready" || !overview ? (
        <HubCard>
          <HubLoading rows={5} />
        </HubCard>
      ) : (
        <>
          {tab === "overview" && (
            <OverviewPanel overview={overview} onNavigate={setTab} onRefresh={() => void refresh()} />
          )}
          {tab === "connections" && <ConnectionsPanel refreshKey={refreshKey} onMutated={bump} />}
          {tab === "automation" && <AutomationPanel refreshKey={refreshKey} onMutated={bump} />}
          {tab === "parameters" && <ParametersPanel refreshKey={refreshKey} onMutated={bump} />}
          {tab === "audit" && <AuditPanel refreshKey={refreshKey} />}
        </>
      )}
    </div>
  );
}
