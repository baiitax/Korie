"use client";

import React, { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCw, ShieldAlert, Trash2, Copy, Check, X, MonitorSmartphone } from "lucide-react";
import {
  adminFetch,
  getAdminKey,
  clearAdminKey,
  maskConsoleKey,
  isAdminBootstrapKey,
} from "@/lib/consoleKeys";

interface OperatorKey {
  id: string;
  name: string;
  environment: string;
  secretKeyMasked: string;
  scopes: string[];
  status: string;
  createdAt: string;
  lastUsedAt?: string;
  createdByName?: string;
  ownerUserId?: string;
  operatorRole?: string;
  gracePeriodExpiresAt?: string;
}

interface SessionInfo {
  credentialId?: string;
  ownerUserId?: string;
  operatorRole?: string;
  scopes?: string[];
  environment?: string;
}

type Role = "OPERATOR" | "ADMIN" | "SYSTEM";

const ROLE_SCOPES: Record<Role, string[]> = {
  OPERATOR: ["admin:read"],
  ADMIN: ["admin:read", "admin:write"],
  SYSTEM: ["admin:read", "admin:write"],
};

async function readJson(res: Response) {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message ?? `API ${res.status}`);
  }
  return json.data;
}

export default function AdminApiCredentialsPage() {
  const [keys, setKeys] = useState<OperatorKey[]>([]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consoleFingerprint, setConsoleFingerprint] = useState("none stored");
  const [consoleIsBootstrap, setConsoleIsBootstrap] = useState(false);

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueName, setIssueName] = useState("");
  const [issueRole, setIssueRole] = useState<Role>("OPERATOR");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<{ id: string; name: string; raw: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<OperatorKey | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sess, list] = await Promise.all([
        readJson(await adminFetch("/api/admin/session", { cache: "no-store" })),
        readJson(await adminFetch("/api/admin/operator-keys", { cache: "no-store" })),
      ]);
      setSession(sess as SessionInfo);
      setKeys((list || []) as OperatorKey[]);
      const stored = getAdminKey();
      setConsoleFingerprint(maskConsoleKey(stored));
      setConsoleIsBootstrap(isAdminBootstrapKey(stored));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load operator keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleIssue = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await readJson(
        await adminFetch("/api/admin/operator-keys", {
          method: "POST",
          body: JSON.stringify({
            name: issueName.trim() || undefined,
            operatorRole: issueRole,
            scopes: ROLE_SCOPES[issueRole],
          }),
        })
      );
      setIssueOpen(false);
      setIssueName("");
      setReveal({ id: data.credential.id, name: data.credential.name, raw: data.secretKeyRaw });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Issuance failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRotate = async (key: OperatorKey) => {
    setBusy(true);
    setError(null);
    try {
      const data = await readJson(
        await adminFetch(`/api/admin/operator-keys/${key.id}/rotate`, { method: "POST" })
      );
      setReveal({ id: data.credential.id, name: data.credential.name, raw: data.secretKeyRaw });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rotation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    setBusy(true);
    setError(null);
    try {
      await readJson(
        await adminFetch(`/api/admin/operator-keys/${confirmRevoke.id}/revoke`, { method: "POST" })
      );
      setConfirmRevoke(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revocation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleForgetConsoleKey = () => {
    clearAdminKey();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)]">
            <KeyRound className="h-5 w-5 text-[var(--brand-primary)]" /> API Credentials
          </h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Operator keys for this console. Raw secrets are shown once at issue/rotate and never again.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setIssueOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" /> Issue operator key
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* This console's key */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
          <MonitorSmartphone className="h-4 w-4 text-[var(--brand-primary)]" /> This console&apos;s key
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-[var(--foreground-muted)]">Fingerprint</dt>
            <dd className="font-mono font-semibold text-[var(--foreground)]">{consoleFingerprint}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--foreground-muted)]">Credential</dt>
            <dd className="font-mono text-[var(--foreground)]">{session?.credentialId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--foreground-muted)]">Role</dt>
            <dd className="font-semibold text-[var(--foreground)]">{session?.operatorRole ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--foreground-muted)]">Scopes</dt>
            <dd className="font-mono text-xs text-[var(--foreground)]">{(session?.scopes || []).join(", ") || "—"}</dd>
          </div>
        </dl>
        {consoleIsBootstrap && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-300">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This console is connected with the public sandbox bootstrap key. Issue a named operator
            key below, copy it once, then forget this key and reconnect with the new one.
          </p>
        )}
        <button
          type="button"
          onClick={handleForgetConsoleKey}
          className="mt-3 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
        >
          Forget this key &amp; reconnect
        </button>
      </section>

      {/* Key inventory */}
      <section className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-elevated)] text-xs uppercase tracking-wide text-[var(--foreground-muted)]">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Masked</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Last used</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--foreground-muted)]">
                  Loading operator keys…
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--foreground-muted)]">
                  No operator keys. Issue one to replace shared access.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-[var(--foreground)]">{k.name}</div>
                    <div className="font-mono text-xs text-[var(--foreground-muted)]">
                      {k.id} · {k.environment}
                    </div>
                    {k.id === "cred_seed_admin" && (
                      <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                        <ShieldAlert className="h-3 w-3" /> PUBLIC BOOTSTRAP — REVOKE AFTER ROTATION
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--foreground)]">
                    {k.secretKeyMasked}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--foreground)]">{k.operatorRole ?? "—"}</td>
                  <td className="px-4 py-2.5 text-[var(--foreground)]">
                    {k.status}
                    {k.status === "ROTATING" && k.gracePeriodExpiresAt && (
                      <div className="text-xs text-[var(--foreground-muted)]">
                        grace until {new Date(k.gracePeriodExpiresAt).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--foreground)]">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      {(k.status === "ACTIVE" || k.status === "ROTATING") && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRotate(k)}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-40"
                        >
                          <RefreshCw className="h-3 w-3" /> Rotate
                        </button>
                      )}
                      {k.status !== "REVOKED" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmRevoke(k)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" /> Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Issue modal */}
      {issueOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Issue operator key">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
            <h2 className="text-base font-bold text-[var(--foreground)]">Issue operator key</h2>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--foreground-muted)]">Name</span>
              <input
                value={issueName}
                onChange={(e) => setIssueName(e.target.value)}
                placeholder="e.g. Zainab — night desk"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand-primary)]"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--foreground-muted)]">Role</span>
              <select
                value={issueRole}
                onChange={(e) => setIssueRole(e.target.value as Role)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand-primary)]"
              >
                <option value="OPERATOR">OPERATOR — read-only ({ROLE_SCOPES.OPERATOR.join(", ")})</option>
                <option value="ADMIN">ADMIN — read + write ({ROLE_SCOPES.ADMIN.join(", ")})</option>
                <option value="SYSTEM">SYSTEM — read + write (services)</option>
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIssueOpen(false)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleIssue()}
                className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-bold text-slate-950 disabled:opacity-40"
              >
                {busy ? "Issuing…" : "Issue key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw-once reveal modal */}
      {reveal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="New secret key">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[var(--surface-elevated)] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <ShieldAlert className="h-4 w-4 text-amber-400" /> Copy it now — shown once
            </h2>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              {reveal.name} ({reveal.id}). The server stores only a salted hash; this value can
              never be displayed again.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--foreground)]">
                {reveal.raw}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(reveal.raw);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setReveal(null)}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-bold text-slate-950"
              >
                <X className="h-4 w-4" /> I saved it — close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirm */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Confirm revocation">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[var(--surface-elevated)] p-5">
            <h2 className="text-base font-bold text-[var(--foreground)]">Revoke {confirmRevoke.name}?</h2>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              Revocation is immediate — the key fails closed on its next use. Consoles connected
              with it will be returned to the key prompt. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRevoke(null)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRevoke()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy ? "Revoking…" : "Revoke now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
