"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn } from "lucide-react";
import { signInAdmin } from "@/lib/admin/adminSession";
import { KorieLogo } from "@/components/brand/KorieLogo";

/**
 * Admin sign-in — real Supabase credentials (supabase.auth.signInWithPassword),
 * mirroring the support-officer flow. The server re-verifies the session and
 * the organization role on every /api/admin/* call (adminAuth.ts); this page
 * only establishes the session.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await signInAdmin(email.trim(), password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // The shell re-checks the session + role server-side on load.
      router.push("/admin");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)]">
            <KorieLogo className="h-9 w-9" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[var(--foreground)]">KoriePay Admin</h1>
            <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
              Command Center — authorized staff only
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Work email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand-border)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-primary-hover)] disabled:opacity-60"
          >
            {busy ? (
              "Signing in…"
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign in to Command Center
              </>
            )}
          </button>
        </form>

        <p className="mt-5 flex items-start gap-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
          Access requires an active organization role (SUPER_ADMIN, ORGANIZATION_OWNER or ORGANIZATION_ADMIN),
          verified against the database on every request.
        </p>
      </div>
    </div>
  );
}
