"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, ShieldAlert, ServerCog } from "lucide-react";
import { useAdminData } from "./AdminDataGateway";
import { KorieLogo } from "@/components/brand/KorieLogo";
import AdminRail from "./AdminRail";
import AdminCommandBar from "./AdminCommandBar";
import AdminMobileNav from "./AdminMobileNav";
import CommandPalette from "./CommandPalette";
import EntityDrawer from "./EntityDrawer";

/**
 * AdminShell — owns the whole admin viewport and moves it between states as
 * one unit:
 *
 *   checking                → minimal splash, no admin chrome at all
 *   unauthenticated /
 *   forbidden /
 *   backend-unavailable     → full-screen gate card (audit doc 00 §2 — the
 *                             old shell had no gate; every page was public)
 *   ready                   → rail + command bar + workspace + palette
 *
 * The login route renders bare so it can present its own full-screen design
 * without the shell.
 */
export const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { phase } = useAdminData();

  if (pathname.startsWith("/admin/login")) return <>{children}</>;

  if (phase === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] p-6 font-sans">
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <span className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-[var(--brand-soft)]">
            <KorieLogo className="h-7 w-7" />
          </span>
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Verifying admin session…</p>
        </div>
      </div>
    );
  }

  if (phase === "unauthenticated") {
    return (
      <GateScreen
        icon={<LockKeyhole className="h-6 w-6" />}
        title="Admin session required"
        body="Sign in with your KoriePay staff credentials to open the command center."
        action={{ href: "/admin/login", label: "Go to sign-in" }}
      />
    );
  }

  if (phase === "forbidden") {
    return (
      <GateScreen
        icon={<ShieldAlert className="h-6 w-6" />}
        title="Role not authorized"
        body="Your account is signed in, but it does not hold an active admin role (SUPER_ADMIN, ORGANIZATION_OWNER or ORGANIZATION_ADMIN)."
        action={{ href: "/admin/login", label: "Use a different account" }}
      />
    );
  }

  if (phase === "backend-unavailable") {
    return (
      <GateScreen
        icon={<ServerCog className="h-6 w-6" />}
        title="Admin backend not configured"
        body="This deployment has no Supabase credentials configured, so there is no authoritative data source to serve. The command center refuses to render invented numbers."
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-emerald-500 selection:text-slate-950">
      <div className="p-4 lg:pl-4">
        <AdminRail />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <AdminCommandBar />
        <main className="min-h-0 flex-1 p-4 pb-28 sm:p-6 lg:pb-10">{children}</main>
        <AdminMobileNav />
        <CommandPalette />
        <EntityDrawer />
      </div>
    </div>
  );
};

function GateScreen({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] p-6 font-sans text-[var(--foreground)]">
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-primary)]">
          {icon}
        </span>
        <h2 className="mt-4 text-base font-extrabold tracking-tight">{title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--foreground-muted)]">{body}</p>
        {action && (
          <Link
            href={action.href}
            className="mt-5 inline-flex min-h-[42px] items-center rounded-xl bg-[var(--brand-primary)] px-5 text-xs font-bold text-white hover:bg-[var(--brand-primary-hover)]"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export default AdminShell;
