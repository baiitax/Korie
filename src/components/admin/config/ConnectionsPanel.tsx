"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Network,
  Plus,
  Activity,
  Radar,
  Layers,
  Play,
  Pause,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { apiGet, apiSend } from "./api";
import {
  HubCard,
  HubSectionTitle,
  HubLoading,
  HubError,
  HubEmpty,
  StatusPill,
  CategoryChip,
  ActionButton,
  TextField,
  ModalShell,
} from "./bits";
import type { ConnectorCategorySpec, ConnectorRecord } from "@/types/adminConfiguration";

const CATEGORY_TABS = ["ALL", "PAYMENT_GATEWAY", "SETTLEMENT_RAIL", "BANK_NODE", "BANK_LIQUIDITY_POOL", "WHATSAPP_AGENT", "KYC_SOURCE", "FX_SOURCE", "CIT_COURIER", "NOTIFICATION_PROVIDER", "AI_DECISION_SERVICE", "CUSTOM_REST"];

export function ConnectionsPanel({ refreshKey, onMutated }: { refreshKey: number; onMutated: () => void }) {
  const [connectors, setConnectors] = useState<ConnectorRecord[] | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const data = await apiGet<ConnectorRecord[]>(
        `/api/admin/config/connectors${filter === "ALL" ? "" : `?category=${filter}`}`,
      );
      setConnectors(data);
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Failed to load connectors");
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      flash(label);
      onMutated();
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : label);
      flash(`${label} failed`);
    }
  };

  const runProbe = (id: string) => {
    setBusyId(`probe-${id}`);
    void run("Probe completed", () => apiSend(`/api/admin/config/connectors/${id}/probe`, "POST", { actor: "System Administrator" })).finally(() =>
      setBusyId(null),
    );
  };

  const runDiscover = (id: string) => {
    setBusyId(`disc-${id}`);
    void run("Capability discovery finished", () =>
      apiSend(`/api/admin/config/connectors/${id}/discover`, "POST", { actor: "System Administrator" }),
    ).finally(() => setBusyId(null));
  };

  const setRole = (id: string, role: string) =>
    run("Routing role updated", () => apiSend(`/api/admin/config/connectors/${id}/role`, "POST", { role, actor: "System Administrator" }));

  const togglePause = (c: ConnectorRecord) =>
    run(c.status === "PAUSED" ? "Connector resumed" : "Connector paused", () =>
      apiSend(`/api/admin/config/connectors/${c.id}`, "PATCH", { status: c.status === "PAUSED" ? "CONFIGURED" : "PAUSED", actor: "System Administrator" }),
    );

  const remove = (c: ConnectorRecord) => {
    if (!window.confirm(`Remove connector "${c.name}"? This cannot be undone.`)) return;
    void run("Connector removed", () => apiSend(`/api/admin/config/connectors/${c.id}`, "DELETE"));
  };

  const visible = useMemo(
    () => connectors ?? [],
    [connectors],
  );

  return (
    <div className="space-y-4">
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Filter + add */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter connectors by category">
          {CATEGORY_TABS.map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={filter === cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wide transition-colors ${
                filter === cat ? "bg-emerald-500 text-slate-950" : "bg-[#0b1324] border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {cat === "ALL" ? "All categories" : cat.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <ActionButton variant="primary" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Add connector / API
        </ActionButton>
      </div>

      {phase === "error" ? (
        <HubError title="Could not load connectors" message={error ?? undefined} onRetry={() => void load()} />
      ) : phase === "loading" || phase === "idle" ? (
        <HubCard>
          <HubLoading rows={5} />
        </HubCard>
      ) : visible.length === 0 ? (
        <HubCard>
          <HubEmpty
            title="No connectors registered yet"
            description="Register a payment gateway, settlement rail, bank node, liquidity pool, WhatsApp support agent or any other fintech API. The system probes it, discovers its capabilities and uses it for routing."
            action={
              <ActionButton variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Register the first connector
              </ActionButton>
            }
          />
        </HubCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visible.map(c => (
            <ConnectorCard
              key={c.id}
              connector={c}
              busyId={busyId}
              expanded={expanded === c.id}
              onToggleExpand={() => setExpanded(expanded === c.id ? null : c.id)}
              onProbe={() => runProbe(c.id)}
              onDiscover={() => runDiscover(c.id)}
              onSetRole={(role: string) => void setRole(c.id, role)}
              onTogglePause={() => void togglePause(c)}
              onRemove={() => remove(c)}
            />
          ))}
        </div>
      )}

      {addOpen && <ConnectorModal onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); flash("Connector registered"); onMutated(); }} />}
    </div>
  );
}

/* -------------------------------------------------- single card */

function ConnectorCard({
  connector: c,
  busyId,
  expanded,
  onToggleExpand,
  onProbe,
  onDiscover,
  onSetRole,
  onTogglePause,
  onRemove,
}: {
  connector: ConnectorRecord;
  busyId: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onProbe: () => void;
  onDiscover: () => void;
  onSetRole: (role: string) => void;
  onTogglePause: () => void;
  onRemove: () => void;
}) {
  const probe = c.lastProbe;
  return (
    <HubCard className="flex flex-col overflow-hidden">
      <div className="flex items-start gap-3 border-b border-white/5 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300">
          <Network className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-bold text-white">{c.name}</p>
            <CategoryChip category={c.category} />
            <StatusPill status={c.status} />
            {c.role !== "NONE" && <StatusPill status={c.role} />}
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
            {c.code} · {c.vendor} · {c.country}/{c.currency} · {c.environment}
          </p>
        </div>
        <button type="button" onClick={onToggleExpand} aria-label={expanded ? "Collapse" : "Expand"} className="p-1 text-slate-500 hover:text-white">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 space-y-1.5 px-4 py-3 text-[10px]">
        <div className="flex items-center justify-between gap-2 font-mono text-slate-400">
          <span className="truncate">{c.baseUrl || "no base URL configured"}</span>
          <span className="shrink-0 text-slate-500">{c.authType || "NONE"} · {c.secretMasked || (c.hasSecretConfigured ? "••••" : "no secret")}</span>
        </div>
        {probe ? (
          <div className={`flex items-center gap-1.5 ${probe.ok ? "text-emerald-400" : "text-rose-400"}`}>
            {probe.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            <span>
              Last probe {probe.ok ? `OK · HTTP ${probe.httpStatus}` : `failed · ${probe.error}`}
              {probe.latencyMs ? ` · ${probe.latencyMs}ms` : ""} · {new Date(probe.at).toLocaleString()}
            </span>
          </div>
        ) : (
          <p className="text-slate-600">Not probed yet — run a connectivity probe when a base URL is configured.</p>
        )}
        <p className="text-slate-500">
          {c.capabilities.length === 0
            ? "No capabilities mapped yet — run discovery (OpenAPI/Swagger) or map manually."
            : `${c.capabilities.length} capabilities (${c.capabilities.filter(x => x.discovered).length} discovered · ${c.capabilities.filter(x => !x.discovered).length} manual)`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 px-4 py-2.5">
        <ActionButton onClick={onProbe} disabled={busyId === `probe-${c.id}` || !c.baseUrl || c.status === "PAUSED"} title={c.baseUrl ? "Live health probe" : "Add a base URL first"}>
          <Activity className={`w-3.5 h-3.5 ${busyId === `probe-${c.id}` ? "animate-pulse" : ""}`} /> {busyId === `probe-${c.id}` ? "Probing…" : "Probe"}
        </ActionButton>
        <ActionButton variant="success" onClick={onDiscover} disabled={busyId === `disc-${c.id}` || !c.baseUrl} title={c.baseUrl ? "Fetch OpenAPI/Swagger doc to map capabilities" : "Add a base URL first"}>
          <Radar className={`w-3.5 h-3.5 ${busyId === `disc-${c.id}` ? "animate-pulse" : ""}`} /> {busyId === `disc-${c.id}` ? "Discovering…" : "Discover"}
        </ActionButton>
        <div className="flex-1" />
        <select
          aria-label="Routing role"
          value={c.role}
          onChange={e => onSetRole(e.target.value)}
          className="rounded-lg bg-slate-950 border border-white/10 px-2 py-1.5 text-[10px] font-mono text-slate-300 focus:outline-none"
        >
          {["NONE", "OBSERVE", "PRIMARY", "FAILOVER"].map(r => (
            <option key={r} value={r}>{r === "NONE" ? "No routing role" : r}</option>
          ))}
        </select>
        <ActionButton variant={c.status === "PAUSED" ? "success" : "ghost"} onClick={onTogglePause}>
          {c.status === "PAUSED" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </ActionButton>
        <ActionButton variant="danger" onClick={onRemove}><Trash2 className="w-3.5 h-3.5" /></ActionButton>
      </div>

      {expanded && <CapabilitiesStrip connector={c} onChanged={onDiscover} />}
    </HubCard>
  );
}

function CapabilitiesStrip({ connector: c, onChanged }: { connector: ConnectorRecord; onChanged: () => void }) {
  const [draftPath, setDraftPath] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftMethod, setDraftMethod] = useState("POST");
  const addManual = async () => {
    if (!draftPath.trim()) return;
    try {
      await apiSend(`/api/admin/config/connectors/${c.id}/capabilities`, "POST", {
        path: draftPath.trim(),
        method: draftMethod,
        label: draftLabel.trim() || undefined,
        actor: "System Administrator",
      });
      setDraftPath("");
      setDraftLabel("");
      onChanged();
    } catch {
      /* surfaced via parent reload */
    }
  };
  return (
    <div className="border-t border-white/5 bg-slate-950/40 px-4 py-3 space-y-2.5">
      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Layers className="w-3 h-3" /> Capability catalogue {c.capabilities.length > 0 && `(${c.capabilities.length})`}
      </p>
      {c.capabilities.length === 0 ? (
        <p className="text-[10px] text-slate-500">None mapped. Run <span className="text-sky-400">Discover</span> against an OpenAPI/Swagger endpoint or add one manually below.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {c.capabilities.map(k => (
            <li key={k.key} className="flex items-center gap-2 rounded-lg bg-[#0b1324] border border-white/5 px-2 py-1.5">
              <span className={`w-11 shrink-0 rounded px-1 py-0.5 text-center font-mono text-[9px] font-bold ${
                k.method === "GET" ? "bg-sky-500/15 text-sky-300" : k.method === "POST" ? "bg-emerald-500/15 text-emerald-300" : k.method === "DELETE" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"
              }`}>
                {k.method}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-semibold text-slate-300">{k.label}</span>
                <span className="block truncate font-mono text-[9px] text-slate-600">{k.path}</span>
              </span>
              {k.discovered ? (
                <span className="shrink-0 rounded bg-sky-500/10 px-1 py-0.5 text-[8px] font-mono font-bold text-sky-400">AUTO</span>
              ) : (
                <span className="shrink-0 rounded bg-slate-800 px-1 py-0.5 text-[8px] font-mono font-bold text-slate-400">MANUAL</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <select value={draftMethod} onChange={e => setDraftMethod(e.target.value)} className="rounded-lg bg-slate-950 border border-white/10 px-1.5 py-1.5 font-mono text-[10px] text-slate-300">
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map(m => <option key={m}>{m}</option>)}
        </select>
        <input
          value={draftPath}
          onChange={e => setDraftPath(e.target.value)}
          placeholder="/v1/payouts"
          className="min-w-32 flex-1 rounded-lg bg-slate-950 border border-white/10 px-2 py-1.5 font-mono text-[10px] text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <input
          value={draftLabel}
          onChange={e => setDraftLabel(e.target.value)}
          placeholder="Label (optional)"
          className="w-40 rounded-lg bg-slate-950 border border-white/10 px-2 py-1.5 text-[10px] text-white placeholder-slate-600 focus:outline-none"
        />
        <ActionButton onClick={() => void addManual()} disabled={!draftPath.trim()}>Map capability</ActionButton>
      </div>
    </div>
  );
}

/* -------------------------------------------------- add modal */

function ConnectorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [specs, setSpecs] = useState<ConnectorCategorySpec[] | null>(null);
  const [category, setCategory] = useState("PAYMENT_GATEWAY");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [vendor, setVendor] = useState("");
  const [country, setCountry] = useState("NG");
  const [currency, setCurrency] = useState("NGN");
  const [environment, setEnvironment] = useState("SANDBOX");
  const [baseUrl, setBaseUrl] = useState("");
  const [healthPath, setHealthPath] = useState("");
  const [authType, setAuthType] = useState("BEARER");
  const [secret, setSecret] = useState("");
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    apiGet<ConnectorCategorySpec[]>("/api/admin/config/categories")
      .then(setSpecs)
      .catch(() => setSpecs([]));
  }, []);

  const spec = specs?.find(s => s.key === category);
  const defaultHealth = spec?.healthPathDefault ?? "/health";

  useEffect(() => {
    setHealthPath(hp => (hp === "/health" ? defaultHealth : hp === "" ? defaultHealth : hp));
    setMeta({});
    if (category === "BANK_LIQUIDITY_POOL" || category === "SETTLEMENT_RAIL") setCurrency(c => (c === "NGN" ? "XOF" : c));
    if (category === "PAYMENT_GATEWAY" || category === "BANK_NODE" || category === "KYC_SOURCE") setCurrency(c => (c === "XOF" ? "NGN" : c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(meta)) if (String(v).trim()) cleaned[k] = String(v).trim();
      await apiSend("/api/admin/config/connectors", "POST", {
        category, name, code: code || undefined, vendor, country, currency, environment,
        baseUrl: baseUrl || undefined, healthPath: healthPath || undefined, authType: secret ? authType : "NONE",
        secret: secret || undefined, metadata: cleaned, actor: "System Administrator",
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register connector");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} label="Register a fintech API / connector" wide>
      <form onSubmit={submit} className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Register a provider / fintech API</h3>
            <p className="text-[11px] text-slate-400">
              The system will probe the endpoint, discover its capabilities (OpenAPI/Swagger when reachable) and
              offer it as a routing provider. Raw secrets are never stored.
            </p>
          </div>
          <ActionButton variant="ghost" onClick={onClose}>Close</ActionButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Category *</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {specs?.map(s => (
                  <option key={s.key} value={s.key}>{s.label} — {s.key.replace(/_/g, " ")}</option>
                ))}
              </select>
              {spec && <span className="mt-1 block text-[10px] text-slate-500">{spec.description}</span>}
            </label>
            <TextField label="Connector name *" value={name} onChange={setName} placeholder="e.g. Paystack NG gateway" />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Code (optional)" value={code} onChange={setCode} placeholder="AUTO" mono />
              <TextField label="Vendor" value={vendor} onChange={setVendor} placeholder="Vendor / brand" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Country</span>
                <select value={country} onChange={e => setCountry(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white">
                  {["NG", "NE", "GLOBAL"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Currency</span>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white">
                  {["NGN", "XOF", "USD", "EUR"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Environment</span>
              <select value={environment} onChange={e => setEnvironment(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white">
                <option value="SANDBOX">SANDBOX</option>
                <option value="PRODUCTION">PRODUCTION</option>
              </select>
            </label>
            <TextField label="Base URL (health probe target)" value={baseUrl} onChange={setBaseUrl} placeholder="https://api.vendor.com" mono />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Health path" value={healthPath} onChange={setHealthPath} placeholder="/health" mono />
              <label className="block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Auth type</span>
                <select value={authType} onChange={e => setAuthType(e.target.value)} disabled={!secret} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white disabled:opacity-50">
                  {["BEARER", "API_KEY", "BASIC", "OAUTH2", "NONE"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Secret (optional — masked after save, never stored raw)</span>
              <div className="relative mt-1">
                <input
                  type={showSecret ? "text" : "password"}
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  placeholder="sk_live_… or KORIE_CONNECTOR_<CODE>_SECRET env"
                  className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 pr-16 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase text-slate-500 hover:text-slate-300">
                  {showSecret ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          </div>
        </div>

        {/* Category-specific fields */}
        {spec && spec.fields.length > 0 && (
          <div className="rounded-2xl bg-slate-950/50 border border-white/5 p-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">{spec.label} settings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {spec.fields.map(f => (
                <TextField
                  key={f.key}
                  label={f.label}
                  value={meta[f.key] ?? ""}
                  onChange={v => setMeta(m => ({ ...m, [f.key]: v }))}
                  placeholder={f.placeholder}
                />
              ))}
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-[11px] font-semibold text-rose-400">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
          <button type="submit" disabled={busy || !name.trim()} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-40 inline-flex items-center gap-1.5">
            {busy ? "Registering…" : "Register & probe"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
