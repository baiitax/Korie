"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiGet } from "./api";
import { HubCard, HubSectionTitle, HubLoading, HubError, HubEmpty, StatusPill } from "./bits";
import type { AutomationAuditEntry } from "@/types/adminConfiguration";

const KIND_TABS = ["ALL", "AUTO_EXECUTED", "AUTO_EXECUTE_FAILED", "CONNECTOR_ADDED", "CONNECTOR_UPDATED", "CONNECTOR_REMOVED", "CONNECTOR_PROBED", "CONNECTOR_CAPABILITIES", "RULE_CREATED", "RULE_UPDATED", "RULE_REMOVED", "PARAMETERS_UPDATED"];

const timeFmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function AuditPanel({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<AutomationAuditEntry[] | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState("ALL");

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const data = await apiGet<AutomationAuditEntry[]>(
        `/api/admin/config/automation/audit${kind === "ALL" ? "" : `?kind=${kind}`}`,
      );
      setEntries(data);
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Failed to load audit trail");
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter audit kinds">
        {KIND_TABS.map(k => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wide transition-colors ${
              kind === k ? "bg-emerald-500 text-slate-950" : "bg-[#0b1324] border border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {k.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {phase === "error" ? (
        <HubError title="Could not load the audit trail" message={error ?? undefined} onRetry={() => void load()} />
      ) : phase === "loading" || phase === "idle" ? (
        <HubCard><HubLoading rows={6} /></HubCard>
      ) : (entries ?? []).length === 0 ? (
        <HubCard>
          <HubEmpty title="No audit entries" description="Automation decisions, connector lifecycle and parameter changes all land here." />
        </HubCard>
      ) : (
        <HubCard>
          <HubSectionTitle title={`Immutable activity trail${kind !== "ALL" ? ` · ${kind.replace(/_/g, " ")}` : ""}`} aside={<span className="font-mono text-[10px] text-slate-500">{entries?.length} shown</span>} />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Kind</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(entries ?? []).map(e => (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[10px] text-slate-400">{timeFmt(e.at)}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={e.outcome === "FAILED" ? "FAILED" : e.kind.replace(/_/g, "-")} mono={false} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[10px] text-slate-400">{e.actor}</td>
                    <td className="px-4 py-2.5 text-[10px] text-slate-300 max-w-xl">
                      <span className="block">{e.detail}</span>
                      {e.ruleName && <span className="block font-mono text-[9px] text-sky-400/80">rule: {e.ruleName}</span>}
                      {e.decisionId && <span className="block font-mono text-[9px] text-slate-500">decision: {e.decisionId}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HubCard>
      )}
    </div>
  );
}
