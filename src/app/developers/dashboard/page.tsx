"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Circle, Copy, Layers, Radio, Terminal, Zap } from "lucide-react";
import { useDeveloper } from "@/components/developer/DeveloperContext";
import type { ApiRequestLog } from "@/types/developer";
import {
  Card,
  CardHeader,
  CopyButton,
  EmptyState,
  EnvChip,
  ErrorState,
  LoadingRows,
  MethodBadge,
  StatusChip,
  ghostLink,
  primaryLink,
} from "@/components/developer/WorkspaceBits";

/** Row action targets per onboarding step. */
const STEP_CTA: Record<string, { label: string; href: string }> = {
  account: { label: "Organization settings", href: "/developers/settings" },
  application: { label: "Create application", href: "/developers/applications" },
  sandbox_key: { label: "Generate key", href: "/developers/credentials" },
  first_request: { label: "Open explorer", href: "/developers/explorer" },
  webhook: { label: "Configure webhook", href: "/developers/webhooks" },
  production_ready: { label: "Production readiness", href: "/developers/credentials#production" },
};

export default function DeveloperDashboardPage() {
  const {
    workspace,
    workspacePhase,
    workspaceError,
    refreshWorkspace,
    organization,
    activeApplication,
    environment,
  } = useDeveloper();

  const [requests, setRequests] = useState<ApiRequestLog[] | null>(null);
  const [requestsPhase, setRequestsPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [copiedReqId, setCopiedReqId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setRequestsPhase("loading");
    setRequestsError(null);
    try {
      const res = await fetch("/api/developers/requests", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || !json.success) {
        throw new Error(json?.error?.message ?? `Requests API ${res.status}`);
      }
      setRequests((json.data as ApiRequestLog[]).slice(0, 8));
      setRequestsPhase("ready");
    } catch (err) {
      setRequestsPhase("error");
      setRequestsError(err instanceof Error ? err.message : "Failed to load request logs");
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const copyRequestId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      /* noop */
    }
    setCopiedReqId(id);
    window.setTimeout(() => setCopiedReqId(null), 1600);
  };

  const ready = workspacePhase === "ready" && workspace;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Developer Dashboard</h1>
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
            {organization.name} · {organization.jurisdiction} ·{" "}
            <span className="font-mono">{organization.id}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/developers/explorer" className={primaryLink}>
            <Terminal className="w-3.5 h-3.5" /> Open API Explorer
          </Link>
          <Link href="/developers/applications" className={ghostLink}>
            <Layers className="w-3.5 h-3.5" /> Applications
          </Link>
        </div>
      </div>

      {/* Workspace status strip */}
      {workspacePhase === "error" ? (
        <ErrorState
          title="Could not reach the workspace service"
          message={workspaceError ?? undefined}
          onRetry={() => void refreshWorkspace()}
        />
      ) : !ready ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-3 w-20 rounded bg-[var(--surface-elevated)]" />
              <div className="mt-3 h-7 w-16 rounded bg-[var(--surface-elevated)]" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI row — server-computed counts only */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Requests today
              </p>
              <p className="mt-2 text-2xl font-black font-mono tabular-nums text-[var(--foreground)]">
                {workspace.counts.requestsToday}
              </p>
              <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">Live sandbox traffic</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Requests this month
              </p>
              <p className="mt-2 text-2xl font-black font-mono tabular-nums text-[var(--foreground)]">
                {workspace.counts.requestsMonth}
              </p>
              <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">Across all applications</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Active sandbox keys
              </p>
              <p className="mt-2 text-2xl font-black font-mono tabular-nums text-[var(--foreground)]">
                {workspace.counts.credentials}
              </p>
              <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">Never stored raw</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Webhook endpoints
              </p>
              <p className="mt-2 text-2xl font-black font-mono tabular-nums text-[var(--foreground)]">
                {workspace.counts.webhookEndpoints}
              </p>
              <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">Delivery telemetry lands with the Webhook Center</p>
            </Card>
          </div>

          {/* Onboarding checklist — ticks come from server-confirmed state only */}
          <Card>
            <CardHeader
              title="Integration onboarding"
              aside={
                <span className="text-[10px] font-mono font-bold text-[var(--foreground-muted)]">
                  {workspace.onboarding.filter(s => s.done).length}/{workspace.onboarding.length} complete
                </span>
              }
            />
            <ol className="divide-y divide-[var(--border)]">
              {workspace.onboarding.map(step => {
                const cta = STEP_CTA[step.key];
                return (
                  <li key={step.key} className="flex items-center gap-3 px-4 py-2.5">
                    {step.done ? (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-[var(--brand-primary)]" aria-label="Complete">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--foreground-muted)]" aria-label="Pending">
                        <Circle className="w-3 h-3" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${step.done ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
                        {step.key.replace(/_/g, " ")}
                      </p>
                      <p className="truncate text-[11px] text-[var(--foreground-muted)]">{step.detail}</p>
                    </div>
                    {!step.done && cta && (
                      <Link href={cta.href} className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-primary)] hover:opacity-85">
                        {cta.label} <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* Active workspace + credentials/webhooks summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader title="Active workspace" />
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Application</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
                    <span className="truncate">{activeApplication.name}</span>
                    <EnvChip env={activeApplication.environment} />
                  </p>
                  <p className="font-mono text-[10px] text-[var(--foreground-muted)]">{activeApplication.id}</p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                  <div>
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Portal API</p>
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
                    </p>
                  </div>
                  <p className="text-[9px] font-mono text-[var(--foreground-muted)] text-right">server-confirmed</p>
                </div>
                <Link href="/developers/status" className={ghostLink + " w-full justify-center"}>
                  System status
                </Link>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Sandbox credentials"
                aside={
                  <Link href="/developers/credentials" className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline">
                    Manage
                  </Link>
                }
              />
              <div className="p-4">
                {workspace.credentialPreviews.length === 0 ? (
                  <p className="text-xs text-[var(--foreground-muted)]">No active credentials — generate a sandbox key.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {workspace.credentialPreviews.slice(0, 2).map(cred => (
                      <li key={cred.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[11px] font-bold text-[var(--foreground)]">{cred.name}</p>
                          <EnvChip env={cred.environment} />
                        </div>
                        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--foreground-muted)]">
                          <span className="truncate" title={cred.secretKeyMasked}>{cred.secretKeyMasked}</span>
                          <span className="shrink-0 font-bold uppercase text-[9px] tracking-wide text-[var(--foreground-muted)]">secret</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--foreground-muted)]">
                          <span className="truncate" title={cred.publicKey}>{cred.publicKey}</span>
                          <span className="shrink-0 font-bold uppercase text-[9px] tracking-wide text-[var(--foreground-muted)]">publishable</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Webhook endpoints"
                aside={
                  <Link href="/developers/webhooks" className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline">
                    Manage
                  </Link>
                }
              />
              <div className="p-4">
                {workspace.webhooks.length === 0 ? (
                  <p className="text-xs text-[var(--foreground-muted)]">No endpoints — configure one to receive events.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {workspace.webhooks.map(wh => (
                      <li key={wh.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <Radio className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                          <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--foreground)]">{wh.url}</p>
                          <StatusChip status={wh.status} />
                        </div>
                        <p className="pl-5.5 font-mono text-[9px] text-[var(--foreground-muted)]">
                          {wh.events.length} events · signing secret {wh.signingSecretMasked}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Recent API requests — real engine request logs */}
      <Card>
        <CardHeader
          title="Recent API requests"
          aside={
            <Link href="/developers/logs" className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline">
              All logs
            </Link>
          }
        />
        {requestsPhase === "loading" || requestsPhase === "idle" ? (
          <LoadingRows rows={5} />
        ) : requestsPhase === "error" ? (
          <div className="p-3">
            <ErrorState title="Could not load request logs" message={requestsError ?? undefined} onRetry={() => void loadRequests()} />
          </div>
        ) : !requests || requests.length === 0 ? (
          <EmptyState
            title="No sandbox requests yet"
            description="Execute your first request from the API Explorer — it will appear here with its request ID, status and latency."
            actionHref="/developers/explorer"
            actionLabel="Open API Explorer"
          />
        ) : (
          requests.length > 0 && (
          <ul className="divide-y divide-[var(--border)]">
            {requests.map(r => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <MethodBadge method={r.method} />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[var(--foreground)]">{r.endpoint}</span>
                <StatusChip status={String(r.statusCode)} />
                <span className="font-mono text-[10px] text-[var(--foreground-muted)]">{r.latencyMs}ms</span>
                <span className="hidden sm:inline font-mono text-[10px] text-[var(--foreground-muted)]">
                  {new Date(r.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  type="button"
                  onClick={() => void copyRequestId(r.requestId)}
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--brand-primary)] hover:underline"
                  aria-label={`Copy request ID ${r.requestId}`}
                >
                  {copiedReqId === r.requestId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {r.requestId}
                </button>
              </li>
            ))}
          </ul>
          )
        )}
      </Card>

      {/* Demo honesty note */}
      <p className="text-[10px] text-[var(--foreground-muted)]">
        DEMO runtime — counts reflect real engine traffic in this sandbox instance and reset when the host restarts.
      </p>
    </div>
  );
}
