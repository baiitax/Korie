"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { loadComplianceSession, type ComplianceSessionView } from "@/services/compliance/session";
import { signOutCompliance } from "@/lib/compliancePortalClient";
import { KorieLogo } from "@/components/brand/KorieLogo";
import { LockKeyhole, ShieldAlert, LogOut } from "lucide-react";

/**
 * Compliance session gate — nothing compliance-looking renders until a real
 * officer session is proven against `/api/compliance/session`.
 *
 * Mirrors the admin shell's gateway: checking → unauthenticated (sign-in
 * screen) → forbidden (signed in, no compliance role) → children. Backend or
 * network failures do NOT block the shell: the screens themselves render
 * honest error states for those, and the officer can still see which module
 * is down. Only a definitive 401/403 gates the portal.
 */

type Phase = "checking" | "unauthenticated" | "forbidden" | "ready";

function GateScreen({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] p-6 font-sans">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-primary)]">
          {icon}
        </span>
        <h1 className="text-base font-extrabold tracking-tight text-[var(--foreground)]">{title}</h1>
        <p className="mt-2 text-xs leading-relaxed text-[var(--foreground-muted)]">{body}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function ComplianceSessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("checking");

  // The sign-in route renders bare: it must not gate (or redirect) on itself.
  const isLoginRoute = pathname?.startsWith("/compliance/login");

  useEffect(() => {
    if (isLoginRoute) return;
    let cancelled = false;
    setPhase("checking");
    loadComplianceSession()
      .then((session: ComplianceSessionView) => {
        if (cancelled) return;
        if (session.unavailableReason === "SESSION_NOT_AUTHORISED") {
          setPhase(session.unauthorizedKind === "NO_ROLE" ? "forbidden" : "unauthenticated");
        } else {
          setPhase("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setPhase("ready"); // network error: let screens report it
      });
    return () => {
      cancelled = true;
    };
  }, [isLoginRoute, pathname]);

  if (isLoginRoute) return <>{children}</>;

  if (phase === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] p-6 font-sans">
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <span className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-[var(--brand-soft)]">
            <KorieLogo className="h-7 w-7" />
          </span>
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Verifying officer session…</p>
        </div>
      </div>
    );
  }

  if (phase === "unauthenticated") {
    return (
      <GateScreen
        icon={<LockKeyhole className="h-6 w-6" />}
        title="Officer session required"
        body="Sign in with your KoriePay officer credentials to open the compliance portal. The portal no longer accepts sandbox tokens."
        action={
          <a href="/compliance/login" className="cmp-btn inline-flex">
            Go to sign-in
          </a>
        }
      />
    );
  }

  if (phase === "forbidden") {
    return (
      <GateScreen
        icon={<ShieldAlert className="h-6 w-6" />}
        title="Role not authorized"
        body="Your account is signed in, but it does not hold an active compliance role (COMPLIANCE_OFFICER, SUPER_ADMIN, ORGANIZATION_OWNER or ORGANIZATION_ADMIN)."
        action={
          <button
            type="button"
            className="cmp-btn inline-flex"
            onClick={() => {
              void signOutCompliance().finally(() => {
                window.location.href = "/compliance/login";
              });
            }}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out and use another account
          </button>
        }
      />
    );
  }

  return <>{children}</>;
}
