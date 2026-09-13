"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import {
  getAdminKey,
  getDevKey,
  setAdminKey,
  setDevKey,
  clearAdminKey,
  clearDevKey,
  maskConsoleKey,
  type ConsoleKind,
} from "@/lib/consoleKeys";

export interface ConsoleSession {
  credentialId?: string;
  ownerUserId?: string;
  operatorRole?: string;
  scopes?: string[];
  environment?: string;
  orgId?: string;
}

interface ConsoleKeyGateProps {
  kind: ConsoleKind;
  /** e.g. "Super Admin console" / "Developer console". */
  title: string;
  /** Whoami route that verifies the stored key. */
  sessionPath: string;
  /** Public sandbox bootstrap value offered as the one-click default. */
  bootstrapKey: string;
  /** Where keys are issued/rotated (shown alongside the bootstrap warning). */
  credentialsHref: string;
  credentialsLabel: string;
  children: React.ReactNode;
}

type GateState = "checking" | "prompt" | "verifying" | "ready";

const readStored = (kind: ConsoleKind) => (kind === "admin" ? getAdminKey() : getDevKey());
const writeStored = (kind: ConsoleKind, key: string) =>
  kind === "admin" ? setAdminKey(key) : setDevKey(key);
const forgetStored = (kind: ConsoleKind) =>
  kind === "admin" ? clearAdminKey() : clearDevKey();

/**
 * Key bootstrap gate for the privileged consoles. The first time a console
 * opens, no key is stored, so this renders a blocking prompt: paste a key or
 * take the documented sandbox bootstrap key with one click. Every stored key
 * is verified against the server whoami before the console renders — a
 * revoked, expired or unknown key returns the user here with the server's
 * reason, never into a half-broken console.
 *
 * While a bootstrap seed is the active key, a persistent banner says so and
 * links to rotation. Non-seed keys render no chrome: the credentials page
 * shows the active fingerprint instead.
 */
export const ConsoleKeyGate: React.FC<ConsoleKeyGateProps> = ({
  kind,
  title,
  sessionPath,
  bootstrapKey,
  credentialsHref,
  credentialsLabel,
  children,
}) => {
  const [state, setState] = useState<GateState>("checking");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ConsoleSession | null>(null);
  const [usingBootstrap, setUsingBootstrap] = useState(false);

  const verify = useCallback(
    async (key: string) => {
      setState("verifying");
      setError(null);
      try {
        const res = await fetch(sessionPath, {
          headers: { Authorization: `Bearer ${key}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          forgetStored(kind);
          setInput(key);
          setError(
            json?.error?.message ||
              `That key was rejected (${json?.error?.code || `HTTP ${res.status}`}). Paste a valid key or use the sandbox bootstrap.`
          );
          setState("prompt");
          return;
        }
        writeStored(kind, key);
        setSession((json.data || {}) as ConsoleSession);
        setUsingBootstrap(key === bootstrapKey);
        setState("ready");
      } catch {
        setInput(key);
        setError("The console could not reach the server. Check the connection and try again.");
        setState("prompt");
      }
    },
    [kind, sessionPath, bootstrapKey]
  );

  useEffect(() => {
    const stored = readStored(kind);
    if (!stored) {
      setState("prompt");
      return;
    }
    void verify(stored);
  }, [kind, verify]);

  const handleForget = useCallback(() => {
    forgetStored(kind);
    setSession(null);
    setUsingBootstrap(false);
    setInput("");
    setError(null);
    setState("prompt");
  }, [kind]);

  if (state === "ready") {
    return (
      <>
        {usingBootstrap && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200"
          >
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="h-3.5 w-3.5" />
              Sandbox bootstrap key in use
              {session?.credentialId ? (
                <span className="font-mono font-normal opacity-80">({session.credentialId})</span>
              ) : null}
            </span>
            <span className="opacity-80">
              Anyone with the docs knows this value. Rotate it in{" "}
              <Link href={credentialsHref} className="font-semibold underline underline-offset-2">
                {credentialsLabel}
              </Link>{" "}
              and reconnect.
            </span>
            <button
              type="button"
              onClick={handleForget}
              className="ml-auto rounded-md border border-amber-500/40 px-2 py-0.5 font-semibold hover:bg-amber-500/20"
            >
              Forget key
            </button>
          </div>
        )}
        {children}
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4 py-16">
      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]">
            <KeyRound className="h-4.5 w-4.5" />
          </span>
          <div>
            <h1 className="text-base font-bold text-[var(--foreground)]">{title} key</h1>
            <p className="text-xs text-[var(--foreground-muted)]">
              {state === "checking" || state === "verifying"
                ? "Verifying your console key…"
                : "Connect a key to continue"}
            </p>
          </div>
        </div>

        {state === "checking" || state === "verifying" ? (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--foreground-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Contacting the credential registry…
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--foreground-muted)]">
                API key
              </span>
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) void verify(input.trim());
                }}
                placeholder="kp_test_… / kp_live_…"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--brand-primary)]"
              />
            </label>
            {error && (
              <p role="alert" className="text-xs leading-relaxed text-red-400">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={!input.trim()}
              onClick={() => void verify(input.trim())}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShieldCheck className="h-4 w-4" /> Connect key
            </button>
            <button
              type="button"
              onClick={() => void verify(bootstrapKey)}
              className="w-full rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--foreground)]"
            >
              Use the sandbox bootstrap key ({maskConsoleKey(bootstrapKey)}) — rotate me
            </button>
            <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)]">
              Keys are verified against the credential registry; unknown, revoked or
              expired keys are rejected. Issue and rotate real operator keys in{" "}
              <Link href={credentialsHref} className="font-semibold text-[var(--brand-primary)] hover:underline">
                {credentialsLabel}
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsoleKeyGate;
