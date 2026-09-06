"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useAdmin } from "./AdminContext";
import { useAdminData } from "./AdminDataGateway";

/**
 * AdminCommandBar — the top command bar of the command center.
 *
 * Everything displayed is real: the system-status pill reflects the live
 * overview payload (database probed on every refresh), the identity chip
 * shows the database-resolved role, and notifications open the palette
 * rather than asserting a hardcoded count.
 */

const TITLES: [prefix: string, title: string][] = [
  ["/admin/transactions", "Transactions"],
  ["/admin/transfers", "Transfers"],
  ["/admin/customers", "Customers"],
  ["/admin/kyc", "KYC / KYB Review"],
  ["/admin/agents", "Agents & POS"],
  ["/admin/merchants", "Merchants"],
  ["/admin/bdc", "BDC / FX Desks"],
  ["/admin/ledger", "Immutable Ledger"],
  ["/admin/settlements", "Settlements"],
  ["/admin/reconciliation", "Reconciliation"],
  ["/admin/treasury", "Treasury & Liquidity"],
  ["/admin/fx", "FX Rates Engine"],
  ["/admin/risk", "Risk & Fraud Monitor"],
  ["/admin/compliance", "Compliance"],
  ["/admin/disputes", "Disputes & Claims"],
  ["/admin/banking-nodes", "Banking Nodes"],
  ["/admin/system-health", "System Health"],
  ["/admin/support", "Support"],
  ["/admin/security", "Security"],
  ["/admin/audit", "Audit Log"],
  ["/admin/reports", "Reports"],
  ["/admin/settings", "Settings"],
  ["/admin/team", "Team & Roles"],
  ["/admin/wallets", "Wallets"],
];

function titleFor(pathname: string): string {
  if (pathname === "/admin") return "Command Center";
  const hit = TITLES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? hit[1] : "Admin";
}

function SystemStatusPill() {
  const { overview, phase } = useAdminData();
  if (phase !== "ready" || !overview) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
        Status unknown
      </span>
    );
  }
  const db = overview.systemHealth.database;
  const label = db === "operational" ? "Operational" : db === "unreachable" ? "Database unreachable" : "Database unknown";
  const tone =
    db === "operational"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-amber-700 bg-amber-50 border-amber-200";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${db === "operational" ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export const AdminCommandBar: React.FC = () => {
  const pathname = usePathname();
  const { setIsSearchOpen } = useAdmin();
  const { identity, overview, refresh, logout, phase } = useAdminData();

  return (
    <header className="sticky top-0 z-20 flex min-h-[60px] flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)]/80 px-3 py-2 backdrop-blur-xl sm:px-5">
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-extrabold tracking-tight text-[var(--foreground)]">
        {titleFor(pathname)}
      </h1>

      {/* Search trigger / command palette */}
      <button
        type="button"
        onClick={() => setIsSearchOpen(true)}
        className="hidden min-h-[38px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-[12px] text-[var(--foreground-muted)] transition-colors hover:border-[var(--brand-border)] hover:text-[var(--foreground)] sm:flex sm:w-64 lg:w-80"
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">Search anything…</span>
        <kbd className="hidden rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[9px] font-semibold lg:inline">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setIsSearchOpen(true)}
        aria-label="Search"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] sm:hidden"
      >
        <Search className="h-4 w-4" />
      </button>

      <SystemStatusPill />

      <button
        type="button"
        onClick={() => void refresh()}
        aria-label="Refresh overview"
        title="Refresh overview"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <RefreshCw className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => setIsSearchOpen(true)}
        aria-label="Notifications (opens command palette)"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <Bell className="h-4 w-4" />
      </button>

      {/* Identity chip — real role from organization_members */}
      {phase === "ready" && identity && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-primary)]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="max-w-[160px] truncate text-[11px] font-bold text-[var(--foreground)]">
              {identity.email ?? "Administrator"}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
              {identity.role}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Sign out"
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--danger)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
};

export default AdminCommandBar;
