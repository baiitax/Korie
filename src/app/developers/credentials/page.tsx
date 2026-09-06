"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, KeyRound, Plus, RefreshCw, ShieldAlert, X } from "lucide-react";
import { useDeveloper } from "@/components/developer/DeveloperContext";
import type { ApiCredential, DeveloperEnvironment, ProductionRequestStatus } from "@/types/developer";
import {
  Card,
  CardHeader,
  EnvChip,
  ErrorState,
  StatusChip,
  LoadingRows,
  EmptyState,
  ghostLink,
  primaryLink,
} from "@/components/developer/WorkspaceBits";

const POST = async (url: string, body?: unknown) => {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !json.success) {
    throw new Error(json?.error?.message ?? `API ${res.status}`);
  }
  return json.data;
};

interface RevealPayload {
  credential: ApiCredential;
  secretKeyRaw: string;
}

const PROD_LABEL: Record<ProductionRequestStatus, string> = {
  NOT_REQUESTED: "Not requested",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DRAFT: "Draft",
};

export default function CredentialsPage() {
  const {
    workspace,
    workspacePhase,
    workspaceError,
    refreshWorkspace,
    organization,
    activeApplication,
  } = useDeveloper();

  const credentials = workspace?.credentialPreviews ?? [];
  const [filter, setFilter] = useState<DeveloperEnvironment | "ALL">("SANDBOX");

  const [addOpen, setAddOpen] = useState(false);
  const [credName, setCredName] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [rotateTarget, setRotateTarget] = useState<ApiCredential | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiCredential | null>(null);
  const [mutating, setMutating] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqBusy, setReqBusy] = useState(false);

  const visible = useMemo(
    () => (filter === "ALL" ? credentials : credentials.filter(c => c.environment === filter)),
    [credentials, filter],
  );

  const openCreate = () => {
    setActionError(null);
    setCredName("");
    setAddOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      const data = await POST("/api/developers/credentials", {
        appId: activeApplication.id,
        name: credName,
        environment: filter === "ALL" ? "SANDBOX" : filter,
      });
      setAddOpen(false);
      await refreshWorkspace();
      setReveal(data as RevealPayload);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create credential");
    } finally {
      setBusy(false);
    }
  };

  const handleRotate = async () => {
    if (!rotateTarget) return;
    setMutating(true);
    setActionError(null);
    try {
      const data = await POST(`/api/developers/credentials/${rotateTarget.id}/rotate`, { actor: "Ibrahim Abubakar" });
      setRotateTarget(null);
      await refreshWorkspace();
      setReveal(data as RevealPayload);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to rotate credential");
    } finally {
      setMutating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setMutating(true);
    setActionError(null);
    try {
      await POST(`/api/developers/credentials/${revokeTarget.id}/revoke`, { actor: "Ibrahim Abubakar" });
      setRevokeTarget(null);
      await refreshWorkspace();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to revoke credential");
    } finally {
      setMutating(false);
    }
  };

  const handleProdRequest = async () => {
    setReqBusy(true);
    setActionError(null);
    try {
      await POST("/api/developers/production-access", { actor: "Ibrahim Abubakar" });
      setReqOpen(false);
      await refreshWorkspace();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to submit production request");
    } finally {
      setReqBusy(false);
    }
  };

  const copyRaw = async () => {
    if (!reveal) return;
    try {
      await navigator.clipboard.writeText(reveal.secretKeyRaw);
    } catch {
      /* noop */
    }
    setCopiedRaw(true);
  };

  const prodStatus: ProductionRequestStatus = workspace?.productionAccessStatus ?? "NOT_REQUESTED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">API Credentials</h1>
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
            Keys for {organization.name} — raw secret keys are shown once at generation and never stored.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={primaryLink} disabled={workspacePhase !== "ready"}>
          <Plus className="w-3.5 h-3.5" /> Generate key
        </button>
      </div>

      {actionError && (
        <div role="alert" className="rounded-xl border border-[var(--danger-soft)] bg-rose-500/5 px-4 py-2.5 text-xs font-semibold text-[var(--danger)] flex items-start justify-between gap-3">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss" className="hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {workspacePhase === "error" ? (
        <ErrorState title="Could not load credentials" message={workspaceError ?? undefined} onRetry={() => void refreshWorkspace()} />
      ) : workspacePhase === "loading" || workspacePhase === "idle" ? (
        <Card>
          <LoadingRows rows={4} />
        </Card>
      ) : (
        <>
          {/* Environment filter */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter by environment">
            {(["SANDBOX", "PRODUCTION", "ALL"] as const).map(env => (
              <button
                key={env}
                role="tab"
                aria-selected={filter === env}
                onClick={() => setFilter(env)}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors ${
                  filter === env
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {env === "ALL" ? "All environments" : env.charAt(0) + env.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                title={filter === "PRODUCTION" ? "No production keys" : "No sandbox keys yet"}
                description={
                  filter === "PRODUCTION"
                    ? "Production keys become available after your production access request is approved."
                    : "Generate a sandbox secret key and publishable key pair to start testing against the Sandbox API."
                }
                actionHref={undefined}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {visible.map(cred => (
                <Card key={cred.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                        <KeyRound className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--foreground)]">{cred.name}</p>
                        <p className="truncate font-mono text-[10px] text-[var(--foreground-muted)]">{cred.id}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <EnvChip env={cred.environment} />
                      <StatusChip status={cred.status} />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 px-4 py-3">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Secret key</p>
                        <button
                          type="button"
                          className="text-[9px] font-bold text-[var(--brand-primary)] hover:underline"
                          onClick={() => {
                            setActionError("Raw secret keys are only shown once at generation for security.");
                            window.setTimeout(() => setActionError(null), 3500);
                          }}
                        >
                          Show full key
                        </button>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-[var(--foreground)]">{cred.secretKeyMasked}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                      <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Publishable key</p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--foreground)]">{cred.publicKey}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] text-[var(--foreground-muted)]">
                      <span>
                        Created {new Date(cred.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span>Last used {cred.lastUsedAt === "Never" ? "Never" : cred.lastUsedAt}</span>
                      {cred.gracePeriodExpiresAt && cred.status === "ROTATING" && (
                        <span className="text-amber-600">Grace until {new Date(cred.gracePeriodExpiresAt).toLocaleDateString()}</span>
                      )}
                      <span className="font-mono">{cred.scopes.length} scopes</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2.5">
                    <Link href="/developers/testing" className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1">
                      Test in sandbox <ArrowRight className="w-3 h-3" />
                    </Link>
                    <div className="flex items-center gap-1.5">
                      {cred.status === "ACTIVE" && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setActionError(null); setRotateTarget(cred); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                          >
                            <RefreshCw className="w-3 h-3" /> Rotate
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActionError(null); setRevokeTarget(cred); }}
                            className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-500/10"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                      {cred.status === "ROTATING" && (
                        <button type="button" onClick={() => setActionError("This key is in its grace period. Revoke it to disable access immediately.")} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--foreground-muted)]">
                          Grace period
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Production access */}
          <Card id="production" className="scroll-mt-24">
            <CardHeader title="Production access" />
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    prodStatus === "APPROVED"
                      ? "bg-emerald-500/10 text-[var(--brand-primary)]"
                      : prodStatus === "REJECTED"
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[var(--foreground)]">Status: {PROD_LABEL[prodStatus]}</p>
                  <p className="text-[10px] text-[var(--foreground-muted)]">
                    {prodStatus === "APPROVED"
                      ? "You can generate live keys. Handle them with production-grade care."
                      : prodStatus === "UNDER_REVIEW" || prodStatus === "SUBMITTED"
                        ? "Our compliance team is reviewing your production request."
                        : prodStatus === "REJECTED"
                          ? "Your request was declined — contact support to understand why."
                          : "Submit a request to receive live keys after settlement verification."}
                  </p>
                </div>
              </div>
              {prodStatus !== "APPROVED" && prodStatus !== "UNDER_REVIEW" && prodStatus !== "SUBMITTED" && (
                <button type="button" onClick={() => { setActionError(null); setReqOpen(true); }} className={ghostLink}>
                  Request production access
                </button>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Generate key modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Generate API key">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">Generate API key</h2>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  For {activeApplication.name} in {(filter === "ALL" ? "SANDBOX" : filter).charAt(0) + (filter === "ALL" ? "SANDBOX" : filter).slice(1).toLowerCase()}.
                </p>
              </div>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="Close" className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Key name *</span>
              <input
                required
                minLength={3}
                value={credName}
                onChange={e => setCredName(e.target.value)}
                placeholder="e.g. CI pipeline key"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-border)]"
              />
            </label>
            {actionError && <p className="text-[11px] font-semibold text-[var(--danger)]">{actionError}</p>}
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px] leading-relaxed text-amber-600">
              The full secret key is shown exactly once — copy it now. KoriePay never stores raw secret keys.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={() => setAddOpen(false)} className={ghostLink}>Cancel</button>
              <button type="submit" disabled={busy} className={primaryLink}>
                {busy ? "Generating…" : "Generate key pair"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rotate confirmation */}
      {rotateTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label="Confirm key rotation">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
                <RefreshCw className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">Rotate {rotateTarget.name}?</h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-muted)]">
                  The current key enters a grace period while a new secret key is issued. The new key is shown once — copy it
                  and update your integration before the grace period ends.
                </p>
              </div>
            </div>
            {actionError && <p className="text-[11px] font-semibold text-[var(--danger)]">{actionError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setRotateTarget(null)} className={ghostLink}>Cancel</button>
              <button type="button" onClick={() => void handleRotate()} disabled={mutating} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-amber-600">
                {mutating ? "Rotating…" : "Confirm rotation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirmation */}
      {revokeTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label="Confirm key revocation">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-600">
                <X className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">Revoke {revokeTarget.name}?</h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-muted)]">
                  Requests signed with this key stop working immediately. This action cannot be undone — a revoked key
                  cannot be rotated or restored.
                </p>
              </div>
            </div>
            {actionError && <p className="text-[11px] font-semibold text-[var(--danger)]">{actionError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setRevokeTarget(null)} className={ghostLink}>Cancel</button>
              <button type="button" onClick={() => void handleRevoke()} disabled={mutating} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-rose-700">
                {mutating ? "Revoking…" : "Confirm revocation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal-once modal (create / rotate) */}
      {reveal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Your new secret key">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--brand-border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-[var(--brand-primary)]">
                  <KeyRound className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[var(--foreground)]">Key generated</h2>
                  <p className="text-[11px] text-[var(--foreground-muted)]">{reveal.credential.name} · shown once</p>
                </div>
              </div>
              <button type="button" onClick={() => { setReveal(null); setCopiedRaw(false); }} aria-label="Close" className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600">Secret key — copy now</p>
                  <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-600">not stored again</span>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2.5">
                  <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-emerald-300" title={reveal.secretKeyRaw}>
                    {reveal.secretKeyRaw}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyRaw()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                  >
                    {copiedRaw ? <Check className="w-3 h-3 text-[var(--brand-primary)]" /> : <Copy className="w-3 h-3" />}
                    {copiedRaw ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="grid gap-2 text-[11px]">
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                  <span className="text-[var(--foreground-muted)]">Publishable key</span>
                  <span className="font-mono text-[var(--foreground)]">{reveal.credential.publicKey}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                  <span className="text-[var(--foreground-muted)]">Environment</span>
                  <EnvChip env={reveal.credential.environment} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                  <span className="text-[var(--foreground-muted)]">Application</span>
                  <span className="truncate font-bold text-[var(--foreground)]">{reveal.credential.appId}</span>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => { setReveal(null); setCopiedRaw(false); }} className={primaryLink + " w-full justify-center"}>
              I saved my key — done
            </button>
          </div>
        </div>
      )}

      {/* Production access request modal */}
      {reqOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Request production access">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">Request production access</h2>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Our compliance team reviews each request before live keys can be generated.
                </p>
              </div>
              <button type="button" onClick={() => setReqOpen(false)} aria-label="Close" className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            {actionError && <p className="text-[11px] font-semibold text-[var(--danger)]">{actionError}</p>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={() => setReqOpen(false)} className={ghostLink}>Cancel</button>
              <button type="button" onClick={() => void handleProdRequest()} disabled={reqBusy} className={primaryLink}>
                {reqBusy ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
