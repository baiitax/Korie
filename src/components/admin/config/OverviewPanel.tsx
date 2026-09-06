"use client";

import React from "react";
import {
  Network,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Landmark,
  FlaskConical,
} from "lucide-react";
import { HubCard, HubSectionTitle, StatusPill } from "./bits";
import type { AdminConfigOverview } from "@/types/adminConfiguration";

const CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: "PAYMENT_GATEWAY", label: "Payment gateway" },
  { key: "SETTLEMENT_RAIL", label: "Settlement rail" },
  { key: "BANK_NODE", label: "Bank node connection" },
  { key: "BANK_LIQUIDITY_POOL", label: "Bank liquidity pool" },
  { key: "WHATSAPP_AGENT", label: "WhatsApp support agent" },
  { key: "KYC_SOURCE", label: "KYC / verification source" },
];

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

export function OverviewPanel({
  overview,
  onNavigate,
  onRefresh,
}: {
  overview: AdminConfigOverview;
  onNavigate: (tab: "connections" | "automation") => void;
  onRefresh: () => void;
}) {
  const s = overview.connectors.byStatus;
  const demo = overview.demoProviders;
  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Connectors registered", value: overview.connectors.total, tone: "text-white" },
          { label: "Connected", value: s.CONNECTED ?? 0, tone: "text-emerald-400" },
          { label: "Failed / degraded", value: (s.FAILED ?? 0) + (s.DEGRADED ?? 0), tone: "text-rose-400" },
          { label: "Live automation rules", value: overview.automationRules.enabled, tone: "text-sky-400" },
          { label: "Dry-run rules", value: overview.automationRules.dryRun, tone: "text-amber-400" },
        ].map(k => (
          <HubCard key={k.label} className="p-4">
            <p className={`text-2xl font-extrabold font-mono ${k.tone}`}>{k.value}</p>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">{k.label}</p>
          </HubCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Routing map — what the system actually uses */}
        <HubCard>
          <HubSectionTitle
            title="Active provider routing"
            aside={
              <button type="button" onClick={() => onNavigate("connections")} className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:underline">
                Manage connections <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="divide-y divide-white/5">
            {CATEGORY_ORDER.map(cat => {
              const total = overview.connectors.byCategory[cat.key] ?? 0;
              const active = total === 0 ? null : { name: "—", status: "CONFIGURED" };
              return (
                <div key={cat.key} className="flex items-center gap-3 px-4 py-2.5">
                  <Landmark className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-200">{cat.label}</p>
                    <p className="text-[10px] text-slate-500">
                      {total === 0 ? "No connector registered — built-in demo provider active" : `${total} connector(s) registered`}
                    </p>
                  </div>
                  {total === 0 ? (
                    <span className="shrink-0">
                      <StatusPill status="DEMO" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">{cat.key.replace(/_/g, " ")} → see list</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-white/5 text-[10px] text-slate-500">
            Built-in demo providers: {demo.map(d => `${d.name} (${d.country})`).join(" · ")} — labelled DEMO until a real
            connector of that category is probed CONNECTED and set PRIMARY.
          </div>
        </HubCard>

        <div className="space-y-4">
          {/* Quick actions */}
          <HubCard>
            <HubSectionTitle title="Quick actions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
              <button type="button" onClick={() => onNavigate("connections")} className="flex items-center gap-2 rounded-xl bg-slate-900 border border-white/10 px-3 py-3 text-left hover:border-emerald-500/40 transition-colors">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400"><Network className="w-4 h-4" /></span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-200">Add a provider / API</span>
                  <span className="block text-[10px] text-slate-500">Gateway, rail, bank node, pool, WhatsApp…</span>
                </span>
              </button>
              <button type="button" onClick={() => onNavigate("automation")} className="flex items-center gap-2 rounded-xl bg-slate-900 border border-white/10 px-3 py-3 text-left hover:border-sky-500/40 transition-colors">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/10 text-sky-400"><Zap className="w-4 h-4" /></span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-200">Automate a workflow</span>
                  <span className="block text-[10px] text-slate-500">Rules for approvals, batches, triage…</span>
                </span>
              </button>
            </div>
          </HubCard>

          {/* Automation posture */}
          <HubCard>
            <HubSectionTitle title="Automation posture" />
            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-slate-900/60 border border-white/5 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Auto-approvals available
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">{overview.automationRules.enabled}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-900/60 border border-white/5 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                  <FlaskConical className="w-3.5 h-3.5 text-amber-400" /> Dry-run (simulate only)
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">{overview.automationRules.dryRun}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-900/60 border border-white/5 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Maker–checker default
                </span>
                <span className="font-mono text-xs font-bold text-rose-400">ON below caps</span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                No automation runs until you enable a rule in the Automation tab. Dry-run rules audit a would-be
                execution and still require review — nothing is faked.
              </p>
            </div>
          </HubCard>
        </div>
      </div>

      {/* Recent activity */}
      <HubCard>
        <HubSectionTitle
          title="Recent configuration & automation activity"
          aside={
            <button type="button" onClick={() => onNavigate("automation")} className="text-[10px] font-bold text-emerald-400 hover:underline">
              Full audit trail
            </button>
          }
        />
        <div className="divide-y divide-white/5">
          {overview.recentAudit.length === 0 ? (
            <p className="px-4 py-6 text-xs text-slate-500">No activity yet — register a connector or create a rule.</p>
          ) : (
            overview.recentAudit.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                  a.outcome === "FAILED" ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-400"
                }`}>
                  {a.outcome === "FAILED" ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-slate-200">{a.detail}</p>
                  <p className="text-[10px] text-slate-500">
                    {a.kind.replace(/_/g, " ")} · {a.actor} · {timeAgo(a.at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </HubCard>
    </div>
  );
}
