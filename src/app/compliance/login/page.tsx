"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn, Zap, RotateCw } from "lucide-react";
import { signInCompliance } from "@/lib/compliancePortalClient";
import { getComplianceQuickAccess } from "@/lib/complianceQuickAccess";
import { KorieLogo } from "@/components/brand/KorieLogo";

/**
 * Compliance portal sign-in — real Supabase credentials
 * (supabase.auth.signInWithPassword), mirroring the admin and support-officer
 * flows. The server re-verifies the session and the compliance role on every
 * /api/compliance/* call (complianceAuth.ts); this page only establishes the
 * session. The previous build shipped a hardcoded sandbox token here — that
 * credential is gone and nothing client-side decides access anymore.
 *
 * AUTOMATED ACCESS: the provisioned officer's credentials are pre-filled on
 * load and a one-click "automatic sign-in" submits them directly, per the
 * portal owner's request. They are seeded demonstration credentials — the
 * helper text says so, and rotating the password disables the automation.
 */
export default function ComplianceLoginPage() {
  const router = useRouter();
  const quick = getComplianceQuickAccess();
  const [email, setEmail] = useState(quick?.email ?? "");
  const [password, setPassword] = useState(quick?.password ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(Boolean(quick));

  // Keep the automated path honest: if the officer edits either field, the
  // "pre-filled" hint goes away — the screen never claims automation it did
  // not perform.
  useEffect(() => {
    if (quick && email === quick.email && password === quick.password) setPrefilled(true);
    else setPrefilled(false);
  }, [email, password, quick]);

  const signIn = async (mail: string, pass: string, quickPath = false) => {
    setError(null);
    if (quickPath) setQuickBusy(true);
    else setBusy(true);
    try {
      const result = await signInCompliance(mail.trim(), pass);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // The shell re-checks the session + role server-side on load.
      router.push("/compliance");
    } finally {
      if (quickPath) setQuickBusy(false);
      else setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void signIn(email, password);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)]">
            <KorieLogo className="h-9 w-9" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[var(--foreground)]">KoriePay Compliance</h1>
            <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
              Financial crime &amp; regulatory portal — authorized officers only
            </p>
          </div>
        </div>

        {quick ? (
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
            <div className="flex items-start gap-2.5">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-[var(--foreground)]">Automated officer access</p>
                <p className="mt-0.5 break-all text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                  {quick.label} · {quick.email}
                </p>
                <button
                  type="button"
                  disabled={quickBusy || busy}
                  onClick={() => void signIn(quick.email, quick.password, true)}
                  className="cmp-btn mt-2.5 inline-flex w-full justify-center"
                >
                  {quickBusy ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                      Automatic sign-in
                    </>
                  )}
                </button>
                <p className="mt-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">{quick.note}</p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="compliance-email" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Officer email
            </label>
            <input
              id="compliance-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>
          <div>
            <label htmlFor="compliance-password" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Password
            </label>
            <input
              id="compliance-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
            {prefilled ? (
              <p className="mt-1.5 text-[10px] text-[var(--foreground-muted)]">
                Pre-filled with the provisioned officer credentials — edit them to sign in as someone else.
              </p>
            ) : null}
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || quickBusy}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-primary-hover)] disabled:opacity-60"
          >
            {busy ? (
              "Signing in…"
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign in to the compliance portal
              </>
            )}
          </button>
        </form>

        <p className="mt-5 flex items-start gap-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
          Access requires an active compliance role (COMPLIANCE_OFFICER, SUPER_ADMIN, ORGANIZATION_OWNER or
          ORGANIZATION_ADMIN), verified against the database on every request. Every write is dual-recorded in the
          audit trail.
        </p>
      </div>
    </div>
  );
}
