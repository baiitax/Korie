"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  Terminal,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

export default function AggregatorDevelopersPage() {
  const { aggregator, apiKeys, issueApiKey, revokeApiKey, formatDate, t } = useAggregator();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"SANDBOX" | "PRODUCTION">("SANDBOX");
  const [revealedSecret, setRevealedSecret] = useState<{ publicKey: string; secretKey: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleIssue = async () => {
    setIsIssuing(true);
    setIssueError(null);
    const result = await issueApiKey({ keyName: newKeyName.trim() || undefined, environment: newKeyEnv });
    setIsIssuing(false);
    if (result.success && result.secretKey && result.publicKey) {
      setRevealedSecret({ publicKey: result.publicKey, secretKey: result.secretKey });
      setNewKeyName("");
    } else {
      setIssueError(result.error || "Could not issue API key.");
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    await revokeApiKey(id);
    setRevokingId(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Aggregator API Gateway</h1>
          <p className="text-xs text-[var(--foreground-muted)]">
            Issue and manage real API credentials for your organization, stored hashed server-side. Secret keys are
            shown only once at creation — they cannot be retrieved again afterward.
          </p>
        </div>
        <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold self-start sm:self-auto">
          Aggregator API v1
        </span>
      </div>

      {/* PRODUCTION key gate notice */}
      {aggregator.status !== "ACTIVE" && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Your aggregator account is {aggregator.status}. PRODUCTION keys are disabled until KYB verification is
            complete; you may still issue SANDBOX keys.
          </span>
        </div>
      )}

      {/* Revealed secret (one-time) */}
      {revealedSecret && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-[var(--foreground)] text-base">New Key Issued — Copy Now</h3>
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">
            This secret key will never be shown again. Store it securely.
          </p>
          <div>
            <label className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Public Key</label>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] mt-1">
              <span className="font-mono text-xs text-[var(--foreground)] truncate">{revealedSecret.publicKey}</span>
              <button
                onClick={() => handleCopy("new-pub", revealedSecret.publicKey)}
                className="p-1 rounded bg-[var(--surface-2)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                {copiedKey === "new-pub" ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Secret Key</label>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] mt-1">
              <span className="font-mono text-xs text-teal-600 dark:text-teal-300 truncate">{revealedSecret.secretKey}</span>
              <button
                onClick={() => handleCopy("new-sec", revealedSecret.secretKey)}
                className="p-1 rounded bg-[var(--surface-2)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                {copiedKey === "new-sec" ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <button
            onClick={() => setRevealedSecret(null)}
            className="text-[11px] underline text-teal-600 dark:text-teal-400"
          >
            I've stored this key — dismiss
          </button>
        </div>
      )}

      {/* Issue New Key */}
      <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--foreground)] text-base">Issue New API Key</h3>
            <p className="text-xs text-[var(--foreground-muted)]">Never expose secret keys in client-side code.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Key name (optional)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="sm:col-span-1 px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <select
            value={newKeyEnv}
            onChange={(e) => setNewKeyEnv(e.target.value as "SANDBOX" | "PRODUCTION")}
            className="px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="SANDBOX">SANDBOX</option>
            <option value="PRODUCTION" disabled={aggregator.status !== "ACTIVE"}>
              PRODUCTION {aggregator.status !== "ACTIVE" ? "(requires ACTIVE status)" : ""}
            </option>
          </select>
          <button
            onClick={handleIssue}
            disabled={isIssuing}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isIssuing ? "Issuing…" : "Issue Key"}</span>
          </button>
        </div>

        {issueError && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{issueError}</span>
          </div>
        )}
      </div>

      {/* Existing Keys */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Your API Keys</h2>
        </div>
        {apiKeys.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--foreground-muted)]">No API keys issued yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {apiKeys.map((k) => (
              <div key={k.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--foreground)]">{k.keyName || "Unnamed Key"}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        k.environment === "PRODUCTION"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                      }`}
                    >
                      {k.environment}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        k.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-[var(--surface-2)] text-[var(--foreground-muted)] border border-[var(--border)]"
                      }`}
                    >
                      {k.status}
                    </span>
                  </div>
                  <div className="font-mono text-[var(--foreground-muted)]">{k.publicKey}</div>
                  <div className="font-mono text-[var(--foreground-muted)]">{k.secretKeyMasked}</div>
                  <div className="text-[10px] text-[var(--foreground-muted)]">
                    Created {formatDate(k.createdAt)} {k.lastUsedAt ? `• Last used ${formatDate(k.lastUsedAt)}` : "• Never used"}
                  </div>
                </div>
                {k.status === "ACTIVE" && (
                  <button
                    onClick={() => handleRevoke(k.id)}
                    disabled={revokingId === k.id}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[11px] font-bold border border-rose-500/20 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{revokingId === k.id ? "Revoking…" : "Revoke"}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* cURL Snippet */}
      <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="font-bold text-[var(--foreground)] text-base">cURL Quickstart</h3>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--background)] font-mono text-xs text-[var(--foreground)] border border-[var(--border)] overflow-x-auto space-y-1">
          <div className="text-[var(--foreground-muted)]"># Retrieve your network liquidity snapshot</div>
          <div className="text-teal-600 dark:text-teal-400">curl https://api.koriepay.com/v1/aggregator/liquidity \</div>
          <div className="pl-4 text-[var(--foreground)]">-H "Authorization: Bearer &lt;your_secret_key&gt;"</div>
        </div>
      </div>
    </div>
  );
}
