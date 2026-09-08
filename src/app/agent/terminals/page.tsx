"use client";

// =============================================================================
// POS terminal — engine truth: registry terminal record + device trust record.
// Heartbeat freshness is derived from the engine's lastHeartbeatAt.
// =============================================================================

import React from "react";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  AgentFreshnessBar,
} from "@/components/agent/ui/AgentUi";
import { Smartphone, Radio, ShieldCheck, Fingerprint, Wifi, Layers } from "lucide-react";

function minutesSince(iso: string): number {
  try {
    return Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  } catch {
    return Infinity;
  }
}

export default function AgentTerminalsPage() {
  const { phase, errorMessage, summary, refresh, refreshedAt } = useAgentPortal();

  if (phase === "loading") return <AgentPageSkeleton rows={3} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your terminal" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const terminal = summary.terminal;
  const mins = minutesSince(terminal.lastHeartbeatAt);
  const heartbeatOk = terminal.status === "ACTIVE" && mins < 10;

  const facts = [
    {
      label: "Serial number",
      value: terminal.serialNumber || "—",
      icon: <Layers className="h-4 w-4 text-stone-400" aria-hidden="true" />,
    },
    {
      label: "Terminal type",
      value: terminal.terminalType.replace(/_/g, " "),
      icon: <Smartphone className="h-4 w-4 text-stone-400" aria-hidden="true" />,
    },
    {
      label: "Device id",
      value: terminal.deviceId || "—",
      icon: <Fingerprint className="h-4 w-4 text-stone-400" aria-hidden="true" />,
    },
    {
      label: "Last heartbeat",
      value: `${new Date(terminal.lastHeartbeatAt).toLocaleString("en-GB")} (${mins < 1 ? "<1" : Math.round(mins)} min ago)`,
      icon: <Radio className="h-4 w-4 text-stone-400" aria-hidden="true" />,
    },
  ];

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="POS Terminal"
        subtitle="Registry-level terminal record — status, heartbeat and capabilities from the terminal management engine."
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void refresh({ silent: true })} />

      {/* Terminal identity */}
      <section aria-label="Terminal identity" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
              <Smartphone className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-bold text-stone-900">{terminal.modelLabel}</p>
              <p className="font-mono text-xs text-emerald-700">TID: {terminal.terminalId}</p>
            </div>
          </div>
          <AgentChip
            label={heartbeatOk ? `Connected · heartbeat ${Math.round(mins)}m` : "Heartbeat stale"}
            tone={heartbeatOk ? "green" : "red"}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                {f.icon}
                {f.label}
              </div>
              <p className="mt-1.5 break-words font-mono text-xs font-semibold text-stone-800">{f.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section aria-labelledby="caps-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 id="caps-title" className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Wifi className="h-4 w-4 text-stone-400" aria-hidden="true" />
          Enabled capabilities
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {terminal.capabilities.length === 0 ? (
            <p className="text-xs text-stone-500">No capabilities reported by the engine for this terminal.</p>
          ) : (
            terminal.capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
              >
                {cap.replace(/_/g, " ")}
              </span>
            ))
          )}
        </div>
      </section>

      {/* Trust note */}
      <div className="flex items-start gap-2 rounded-xl bg-sky-50 p-4 text-xs leading-relaxed text-sky-800 ring-1 ring-sky-100">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Terminal status and heartbeat come from the terminal registry engine, not from simulated telemetry. If your device
          shows as stale here, report it through{" "}
          <a href="/agent/support" className="font-bold underline">
            Support & Disputes
          </a>{" "}
          with the TID above.
        </p>
      </div>
    </div>
  );
}
