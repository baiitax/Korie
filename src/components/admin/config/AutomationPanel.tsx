"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Zap, Plus, Pencil, Trash2, FlaskConical, ShieldCheck, Ban } from "lucide-react";
import { apiGet, apiSend } from "./api";
import {
  HubCard,
  HubSectionTitle,
  HubLoading,
  HubError,
  HubEmpty,
  StatusPill,
  ActionButton,
  Toggle,
  TextField,
  ModalShell,
} from "./bits";
import type { AutomationRule } from "@/types/adminConfiguration";

interface ActionSpec {
  key: string;
  label: string;
  module: string;
  description: string;
  defaultMaxAmount?: number;
  defaultCurrency?: string;
}

export function AutomationPanel({ refreshKey, onMutated }: { refreshKey: number; onMutated: () => void }) {
  const [rules, setRules] = useState<AutomationRule[] | null>(null);
  const [actions, setActions] = useState<ActionSpec[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [simResult, setSimResult] = useState<{ ruleId: string; message: string; ok: boolean } | null>(null);
  const [preselect, setPreselect] = useState<string | undefined>(undefined);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const [r, a] = await Promise.all([
        apiGet<AutomationRule[]>("/api/admin/config/automation/rules"),
        apiGet<ActionSpec[]>("/api/admin/config/automation/actions"),
      ]);
      setRules(r);
      setActions(a);
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Failed to load automation rules");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const simulateRule = async (r: AutomationRule) => {
    setError(null);
    setSimResult(null);
    try {
      const res = await apiSend<{ decision: string; reason: string; ruleName?: string; decisionId?: string; dryRun?: boolean }>(
        "/api/admin/config/automation/decide",
        "POST",
        {
          actionKey: r.actionKey,
          context: {
            country: r.countries?.[0] ?? "NG",
            riskLevel: r.riskLevels?.[0] ?? "LOW",
            amount: r.maxAmount ?? 1000,
            currency: r.currency,
          },
          actor: "System Administrator",
        },
      );
      setSimResult({
        ruleId: r.id,
        ok: res.decision === "AUTO_EXECUTE",
        message: `${res.decision === "AUTO_EXECUTE" ? "AUTO-EXECUTE" : "REQUIRE_REVIEW"} — ${res.reason}${res.dryRun ? " (dry-run)" : ""}`,
      });
      if (res.decision === "AUTO_EXECUTE" && res.decisionId) {
        void apiSend("/api/admin/config/automation/complete", "POST", {
          decisionId: res.decisionId,
          outcome: "SUCCESS",
          actor: "System Administrator",
        });
      }
      flash(`Decision test → ${res.decision}`);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision test failed");
    }
  };

  const byModule = useMemo(() => {
    const map = new Map<string, ActionSpec[]>();
    for (const a of actions) {
      const list = map.get(a.module) ?? [];
      list.push(a);
      map.set(a.module, list);
    }
    return Array.from(map.entries());
  }, [actions]);

  const patchRule = async (id: string, patch: Partial<AutomationRule>) => {
    try {
      await apiSend(`/api/admin/config/automation/rules/${id}`, "PATCH", { ...patch, actor: "System Administrator" });
      onMutated();
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    }
  };

  const removeRule = async (r: AutomationRule) => {
    if (!window.confirm(`Delete automation rule "${r.name}"?`)) return;
    await apiSend(`/api/admin/config/automation/rules/${r.id}`, "DELETE");
    flash("Rule deleted");
    onMutated();
    void load();
  };

  const openCreate = (actionKey?: string) => {
    setPreselect(actionKey);
    setEditingRule(null);
    setModalOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setPreselect(rule.actionKey);
    setEditingRule(rule);
    setModalOpen(true);
  };

  const enabledLive = (rules ?? []).filter(r => r.enabled && !r.dryRun).length;

  return (
    <div className="space-y-4">
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300">{notice}</div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Automation rules</h3>
          <p className="text-[11px] text-slate-400">
            Rules are consulted before privileged actions. A matching <span className="text-emerald-400">live</span> rule auto-executes;
            <span className="text-amber-400"> dry-run</span> rules only simulate + audit; otherwise maker–checker review is required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono font-bold text-emerald-400">
            {enabledLive} live · {(rules ?? []).filter(r => r.enabled && r.dryRun).length} dry-run
          </span>
          <ActionButton variant="primary" onClick={() => openCreate()}>
            <Plus className="w-3.5 h-3.5" /> New automation rule
          </ActionButton>
        </div>
      </div>

      {phase === "error" ? (
        <HubError title="Could not load automation rules" message={error ?? undefined} onRetry={() => void load()} />
      ) : phase === "loading" || phase === "idle" ? (
        <HubCard><HubLoading rows={4} /></HubCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Action catalogue (left, 2/5) */}
          <div className="xl:col-span-2 space-y-3">
            <HubCard>
              <HubSectionTitle title="Automatable workflows" aside={<span className="text-[10px] font-mono text-slate-500">{actions.length} actions</span>} />
              <div className="max-h-[560px] overflow-y-auto divide-y divide-white/5">
                {byModule.map(([module, list]) => (
                  <div key={module} className="px-3 py-2.5">
                    <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1.5">{module}</p>
                    <ul className="space-y-1">
                      {list.map(a => (
                        <li key={a.key} className="flex items-start justify-between gap-2 rounded-xl bg-slate-950/60 border border-white/5 px-2.5 py-2 hover:border-white/15 transition-colors">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-200">{a.label}</p>
                            <p className="text-[10px] leading-snug text-slate-500">{a.description}</p>
                          </div>
                          <button
                            type="button"
                            title={`Create a rule for ${a.label}`}
                            onClick={() => openCreate(a.key)}
                            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20"
                          >
                            <Zap className="w-3 h-3" /> Automate
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </HubCard>
          </div>

          {/* Rules (right, 3/5) */}
          <div className="xl:col-span-3 space-y-2.5">
            {(rules ?? []).length === 0 ? (
              <HubCard>
                <HubEmpty
                  title="No automation rules yet"
                  description="Pick a workflow from the catalogue and choose “Automate” — rules default to dry-run so you can validate before going live."
                  action={
                    <ActionButton variant="primary" onClick={() => openCreate()}>
                      <Plus className="w-3.5 h-3.5" /> Create the first rule
                    </ActionButton>
                  }
                />
              </HubCard>
            ) : (
              (rules ?? []).map(r => {
                const spec = actions.find(a => a.key === r.actionKey);
                return (
                  <HubCard key={r.id} className={`p-4 ${r.enabled && !r.dryRun ? "border-emerald-500/25" : ""}`}>
                    <div className="flex flex-wrap items-start gap-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        r.enabled && !r.dryRun ? "bg-emerald-500/10 text-emerald-400" : r.dryRun ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-500"
                      }`}>
                        {r.dryRun ? <FlaskConical className="w-4 h-4" /> : r.enabled ? <Zap className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[13px] font-bold text-white">{r.name}</p>
                          <StatusPill status={r.enabled ? (r.dryRun ? "DRY-RUN" : "LIVE") : "OFF"} />
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {spec ? spec.label : r.actionKey} · scope:&nbsp;
                          {r.countries?.length ? `countries ${r.countries.join("/")} · ` : "all countries · "}
                          {r.riskLevels?.length ? `risk ${r.riskLevels.join("/")} · ` : "any risk · "}
                          {r.maxAmount ? `≤ ${r.currency ?? ""} ${Number(r.maxAmount).toLocaleString()}` : "any amount"}
                        </p>
                      </div>
                      {simResult?.ruleId === r.id && (
                        <p role="status" className={`w-full rounded-lg px-2.5 py-1.5 text-[10px] font-semibold mt-1 ${simResult.ok ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-amber-500/10 text-amber-300 border border-amber-500/20"}`}>
                          {simResult.message}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ActionButton variant="success" title="Run a test decision against the service" onClick={() => void simulateRule(r)}>
                          <FlaskConical className="w-3.5 h-3.5" /> Test
                        </ActionButton>
                        <Toggle checked={r.enabled} onChange={v => void patchRule(r.id, { enabled: v })} label={r.enabled ? "On" : "Off"} />
                        <ActionButton title="Edit rule" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></ActionButton>
                        <ActionButton variant="danger" title="Delete rule" onClick={() => void removeRule(r)}><Trash2 className="w-3.5 h-3.5" /></ActionButton>
                      </div>
                    </div>
                    {r.dryRun && (
                      <p className="mt-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-2.5 py-1.5 text-[10px] text-amber-300/90 flex items-center gap-1.5">
                        <FlaskConical className="w-3 h-3" /> Dry-run: matches are audited as “would auto-approve”, but review is still required.
                      </p>
                    )}
                  </HubCard>
                );
              })
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <RuleModal
          preselect={preselect}
          initial={editingRule}
          actions={actions}
          onClose={() => { setModalOpen(false); setPreselect(undefined); setEditingRule(null); }}
          onSaved={() => { setModalOpen(false); setPreselect(undefined); setEditingRule(null); flash("Rule saved"); onMutated(); void load(); }}
        />
      )}
    </div>
  );
}



function RuleModal({
  preselect,
  initial,
  actions,
  onClose,
  onSaved,
}: {
  preselect?: string;
  initial?: AutomationRule | null;
  actions: ActionSpec[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [actionKey, setActionKey] = useState(initial?.actionKey ?? preselect ?? actions[0]?.key ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [dryRun, setDryRun] = useState(initial?.dryRun ?? true);
  const [maxAmount, setMaxAmount] = useState(initial?.maxAmount ? String(initial.maxAmount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "NGN");
  const [countries, setCountries] = useState<string[]>(initial?.countries ?? []);
  const [riskLevels, setRiskLevels] = useState<string[]>(initial?.riskLevels ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spec = actions.find(a => a.key === actionKey);

  const selectAction = (key: string) => {
    setActionKey(key);
    const s = actions.find(a => a.key === key);
    if (s) {
      setName(s.label);
      if (s.defaultCurrency) setCurrency(s.defaultCurrency);
      if (s.defaultMaxAmount) setMaxAmount(String(s.defaultMaxAmount));
    }
  };

  const toggleIn = (arr: string[], set: (v: string[]) => void, value: string) =>
    set(arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        actionKey,
        name,
        enabled,
        dryRun,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        currency,
        countries: countries.length ? countries : undefined,
        riskLevels: riskLevels.length ? riskLevels : undefined,
        actor: "System Administrator",
      };
      if (initial) {
        await apiSend(`/api/admin/config/automation/rules/${initial.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/admin/config/automation/rules", "POST", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} label="Create automation rule">
      <form onSubmit={submit} className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-400" /> {initial ? "Edit automation rule" : "New automation rule"}</h3>
            <p className="text-[11px] text-slate-400">Scope the workflow, set guardrails, then enable. New rules default to dry-run.</p>
          </div>
          <ActionButton variant="ghost" onClick={onClose}>Close</ActionButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block md:col-span-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Workflow *</span>
            <select
              value={actionKey}
              onChange={e => selectAction(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {actions.map(a => (
                <option key={a.key} value={a.key}>{a.module} — {a.label}</option>
              ))}
            </select>
            {spec && <span className="mt-1 block text-[10px] text-slate-500">{spec.description}</span>}
          </label>
          <div className="md:col-span-2">
            <TextField label="Rule name *" value={name} onChange={setName} placeholder="e.g. Auto-run settlement batches ≤ ₦50M" />
          </div>
          <TextField label="Max amount (auto-execute ceiling)" value={maxAmount} onChange={setMaxAmount} placeholder={spec?.defaultMaxAmount ? String(spec.defaultMaxAmount) : "unlimited"} type="number" />
          <label className="block">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Currency</span>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white">
              {["NGN", "XOF", "USD", "ANY"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Countries (empty = all)</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {["NG", "NE"].map(c => (
                <button key={c} type="button" onClick={() => toggleIn(countries, setCountries, c)} className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${countries.includes(c) ? "bg-emerald-500 text-slate-950" : "bg-slate-900 border border-white/10 text-slate-400"}`}>
                  {c}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Risk levels (empty = any)</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(r => (
                <button key={r} type="button" onClick={() => toggleIn(riskLevels, setRiskLevels, r)} className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${riskLevels.includes(r) ? "bg-sky-500 text-slate-950" : "bg-slate-900 border border-white/10 text-slate-400"}`}>
                  {r}
                </button>
              ))}
            </div>
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-5 pt-1">
            <Toggle checked={dryRun} onChange={v => setDryRun(v)} label="Dry-run (simulate + audit only)" />
            <Toggle checked={enabled} onChange={v => setEnabled(v)} label="Enable (live auto-execute)" disabled={dryRun && !enabled} />
          </div>
        </div>

        {error && <p role="alert" className="text-[11px] font-semibold text-rose-400">{error}</p>}
        <p className="rounded-xl bg-slate-950/60 border border-white/5 px-3 py-2 text-[10px] leading-relaxed text-slate-500 flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
          Every auto-execution writes an audit entry with the rule reference. Operations outside this rule's scope
          still open the maker–checker review. Set ceilings conservatively — they are the control.
        </p>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
          <button type="submit" disabled={busy || !actionKey || name.trim().length < 3} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-40">
            {busy ? "Saving…" : "Save rule"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
