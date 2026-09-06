"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, Layers, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { useDeveloper } from "@/components/developer/DeveloperContext";
import type { DeveloperApplication } from "@/types/developer";
import {
  Card,
  CardHeader,
  EnvChip,
  ErrorState,
  EmptyState,
  StatusChip,
  LoadingRows,
  ghostLink,
  primaryLink,
} from "@/components/developer/WorkspaceBits";

type AppStatus = DeveloperApplication["status"];

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !json.success) {
    throw new Error(json?.error?.message ?? `API ${res.status}`);
  }
  return json.data;
}

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !json.success) {
    throw new Error(json?.error?.message ?? `API ${res.status}`);
  }
  return json.data;
}

const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export default function ApplicationsPage() {
  const { applications, organization, workspacePhase, workspaceError, refreshWorkspace } = useDeveloper();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ipEditAppId, setIpEditAppId] = useState<string | null>(null);
  const [ipDraft, setIpDraft] = useState("");
  const [ipBusy, setIpBusy] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{ app: DeveloperApplication; status: Extract<AppStatus, "DEPRECATED" | "REVOKED"> } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setError(null);
    setName("");
    setDescription("");
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/developers/applications", { name, description, actor: "Ibrahim Abubakar" });
      setCreateOpen(false);
      await refreshWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await patchJson(`/api/developers/applications/${confirmAction.app.id}`, {
        status: confirmAction.status,
        actor: "Ibrahim Abubakar",
      });
      setConfirmAction(null);
      await refreshWorkspace();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update application");
    } finally {
      setActionBusy(false);
    }
  };

  const startIpEdit = (app: DeveloperApplication) => {
    setIpEditAppId(app.id);
    setIpDraft(app.ipWhitelist.join(", "));
    setError(null);
  };

  const saveIps = async () => {
    if (!ipEditAppId) return;
    setIpBusy(true);
    setError(null);
    try {
      const ips = ipDraft.split(",").map(i => i.trim()).filter(Boolean);
      const bad = ips.find(i => !ipv4.test(i));
      if (bad) throw new Error(`Invalid IP address: ${bad}`);
      await patchJson(`/api/developers/applications/${ipEditAppId}`, {
        ipWhitelist: ips,
        actor: "Ibrahim Abubakar",
      });
      setIpEditAppId(null);
      await refreshWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save IP whitelist");
    } finally {
      setIpBusy(false);
    }
  };

  const reactivate = async (app: DeveloperApplication) => {
    setError(null);
    try {
      await patchJson(`/api/developers/applications/${app.id}`, { status: "ACTIVE", actor: "Ibrahim Abubakar" });
      await refreshWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reactivate application");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Applications</h1>
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
            Sandbox applications for {organization.name} — each application owns its credentials, webhooks and logs.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={primaryLink} disabled={workspacePhase !== "ready"}>
          <Plus className="w-3.5 h-3.5" /> New application
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-[var(--danger-soft)] bg-rose-500/5 px-4 py-2.5 text-xs font-semibold text-[var(--danger)] flex items-start justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {workspacePhase === "error" ? (
        <ErrorState title="Could not load applications" message={workspaceError ?? undefined} onRetry={() => void refreshWorkspace()} />
      ) : workspacePhase === "loading" || workspacePhase === "idle" ? (
        <Card>
          <LoadingRows rows={4} />
        </Card>
      ) : applications.length === 0 ? (
        <Card>
          <EmptyState
            title="No applications yet"
            description="Create your first sandbox application to generate credentials and start integrating."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {applications.map(app => (
            <Card key={app.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                    <Layers className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--foreground)]">{app.name}</p>
                    <p className="truncate font-mono text-[10px] text-[var(--foreground-muted)]">{app.id}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <EnvChip env={app.environment} />
                  <StatusChip status={app.status} />
                </div>
              </div>

              <div className="flex-1 px-4 py-3 space-y-3">
                {app.description && (
                  <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">{app.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-2">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">APIs</p>
                    <p className="mt-0.5 font-bold text-[var(--foreground)]">{app.enabledApis.length} enabled</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-2">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">Scopes</p>
                    <p className="mt-0.5 font-bold text-[var(--foreground)]">{app.scopes.length} granted</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-2">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">Created</p>
                    <p className="mt-0.5 font-bold text-[var(--foreground)]">
                      {new Date(app.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-2">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">Rate limit</p>
                    <p className="mt-0.5 font-bold text-[var(--foreground)]">{app.rateLimitPerMinute}/min</p>
                  </div>
                </div>

                {/* IP whitelist */}
                <div className="rounded-xl border border-[var(--border)] p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3" /> IP whitelist
                    </p>
                    {ipEditAppId !== app.id ? (
                      <button type="button" onClick={() => startIpEdit(app)} className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline">
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={saveIps} disabled={ipBusy} className="rounded-lg bg-[var(--brand-primary)] px-2 py-0.5 text-[10px] font-bold text-white disabled:opacity-50">
                          Save
                        </button>
                        <button type="button" onClick={() => setIpEditAppId(null)} className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold text-[var(--foreground-muted)]">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  {ipEditAppId === app.id ? (
                    <input
                      value={ipDraft}
                      onChange={e => setIpDraft(e.target.value)}
                      placeholder="197.210.84.12, 102.89.34.190"
                      aria-label="IP whitelist"
                      className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-border)]"
                    />
                  ) : app.ipWhitelist.length === 0 ? (
                    <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">No restriction — all IPs allowed.</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {app.ipWhitelist.map(ip => (
                        <span key={ip} className="rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--foreground-muted)]">
                          {ip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2.5">
                <Link
                  href={`/developers/credentials`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                >
                  <KeyRound className="w-3 h-3" /> Credentials
                </Link>
                <div className="flex items-center gap-1.5">
                  {app.status === "DEPRECATED" && (
                    <button
                      type="button"
                      onClick={() => void reactivate(app)}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                    >
                      Reactivate
                    </button>
                  )}
                  {app.status === "ACTIVE" && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setActionError(null); setConfirmAction({ app, status: "DEPRECATED" }); }}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)]"
                      >
                        Deprecate
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActionError(null); setConfirmAction({ app, status: "REVOKED" }); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3 h-3" /> Revoke
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create application modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Create application">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">New sandbox application</h2>
                <p className="text-[11px] text-[var(--foreground-muted)]">Applications start in the SANDBOX environment.</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close" className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Application name *</span>
                <input
                  required
                  minLength={3}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. KoriShop Checkout Sandbox"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-border)]"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Description</span>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What does this application do?"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-border)]"
                />
              </label>
              {error && <p className="text-[11px] font-semibold text-[var(--danger)]">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={() => setCreateOpen(false)} className={ghostLink}>Cancel</button>
              <button type="submit" disabled={busy} className={primaryLink}>
                {busy ? "Creating…" : "Create application"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deprecate / revoke confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label={`Confirm ${confirmAction.status.toLowerCase()}`}>
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${confirmAction.status === "REVOKED" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>
                <Trash2 className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">
                  {confirmAction.status === "REVOKED" ? "Revoke application?" : "Deprecate application?"}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-muted)]">
                  {confirmAction.status === "REVOKED"
                    ? `${confirmAction.app.name} will be permanently disabled. Its credentials and webhook endpoints stop working and cannot be rotated. This action is logged.`
                    : `${confirmAction.app.name} will be marked deprecated — existing credentials keep working but no new keys can be issued.`}
                </p>
              </div>
            </div>
            {actionError && <p className="text-[11px] font-semibold text-[var(--danger)]">{actionError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setConfirmAction(null)} className={ghostLink}>Cancel</button>
              <button
                type="button"
                onClick={() => void handleStatusChange()}
                disabled={actionBusy}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${confirmAction.status === "REVOKED" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-500 hover:bg-amber-600"}`}
              >
                {actionBusy ? "Updating…" : `Confirm ${confirmAction.status.toLowerCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
