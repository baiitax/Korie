"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Save, Check, Lock } from "lucide-react";
import { apiGet, apiSend } from "./api";
import { HubCard, HubSectionTitle, HubLoading, HubError, ActionButton } from "./bits";
import type { SystemParameter } from "@/types/adminConfiguration";

const GROUP_ORDER = ["NIGERIA", "NIGER_REPUBLIC", "FEE_ENGINE", "REGULATORY_REPORTING"] as const;
const GROUP_LABEL: Record<string, { title: string; flag?: string; desc: string }> = {
  NIGERIA: { title: "Nigeria market parameters", flag: "🇳🇬", desc: "CBN-aligned limits and gateway defaults — gateway fields unlock when a BANK_NODE connector is PRIMARY." },
  NIGER_REPUBLIC: { title: "Niger Republic market parameters", flag: "🇳🇪", desc: "BCEAO-aligned limits and gateway defaults — gateway fields unlock when a BANK_NODE connector is PRIMARY." },
  FEE_ENGINE: { title: "Fee engine parameters", desc: "MDR and channel caps applied by the fee engine." },
  REGULATORY_REPORTING: { title: "Regulatory reporting thresholds", desc: "CTR/STR and reporting cutoffs submitted to regulators." },
};

export function ParametersPanel({ refreshKey, onMutated }: { refreshKey: number; onMutated: () => void }) {
  const [params, setParams] = useState<SystemParameter[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const data = await apiGet<SystemParameter[]>("/api/admin/config/parameters");
      setParams(data);
      setDraft(Object.fromEntries(data.map(p => [p.key, p.value])));
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Failed to load parameters");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const dirty = (params ?? []).some(p => !p.locked && draft[p.key] !== p.value);

  const save = async () => {
    setError(null);
    try {
      const changed: Record<string, string> = {};
      for (const p of params ?? []) {
        if (p.locked) continue;
        if (draft[p.key] !== p.value) changed[p.key] = draft[p.key];
      }
      if (Object.keys(changed).length === 0) return;
      const updated = await apiSend<SystemParameter[]>("/api/admin/config/parameters", "PATCH", {
        values: changed,
        actor: "System Administrator",
      });
      setParams(updated);
      setDraft(Object.fromEntries(updated.map(p => [p.key, p.value])));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save parameters");
    }
  };

  const fmt = (p: SystemParameter, raw: string) => {
    if (p.type === "number" && raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) return `${p.currency ?? ""} ${n.toLocaleString()}`;
    }
    return raw;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400 max-w-2xl">
          Transaction limits, fee parameters and regulatory thresholds are server-owned. Locked gateway fields are
          driven by the Connections registry — register a BANK_NODE connector, probe it CONNECTED and set it PRIMARY
          to change the default banking gateway.
        </p>
        <div className="flex items-center gap-2">
          {error && <span role="alert" className="text-[11px] font-semibold text-rose-400">{error}</span>}
          <ActionButton variant="primary" onClick={() => void save()} disabled={!dirty}>
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} {saved ? "Saved & synced" : "Save changes"}
          </ActionButton>
        </div>
      </div>

      {phase === "error" ? (
        <HubError title="Could not load parameters" message={error ?? undefined} onRetry={() => void load()} />
      ) : phase === "loading" || phase === "idle" ? (
        <HubCard><HubLoading rows={4} /></HubCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {GROUP_ORDER.map(group => {
            const items = (params ?? []).filter(p => p.group === group);
            const g = GROUP_LABEL[group];
            return (
              <HubCard key={group}>
                <HubSectionTitle
                  title={`${g.flag ?? ""} ${g.title}`.trim()}
                />
                <div className="p-4 space-y-3">
                  <p className="text-[10px] text-slate-500">{g.desc}</p>
                  {items.map(p => (
                    <label key={p.key} className="block">
                      <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {p.label}
                        {p.locked && <Lock className="w-3 h-3 text-amber-400" />}
                      </span>
                      <input
                        type={p.type === "number" ? "text" : "text"}
                        value={draft[p.key] ?? ""}
                        disabled={p.locked}
                        onChange={e => setDraft(d => ({ ...d, [p.key]: e.target.value }))}
                        className={`mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                          p.locked ? "text-emerald-400/80" : "font-mono"
                        }`}
                      />
                      <span className="mt-0.5 block text-[9px] text-slate-500">
                        {p.locked ? p.lockedHint ?? "Locked parameter" : `Current: ${fmt(p, draft[p.key] ?? "")}`}
                      </span>
                    </label>
                  ))}
                </div>
              </HubCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
