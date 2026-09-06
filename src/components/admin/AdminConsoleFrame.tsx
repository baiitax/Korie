"use client";

import React from "react";
import Link from "next/link";
import { KorieFloatingRail } from "@/components/nav/KorieFloatingRail";
import { useAuth } from "@/components/auth/AuthContext";
import AdminTopBar from "./AdminTopBar";
import AdminMobileNav from "./AdminMobileNav";
import {
  adminNavGroups,
  ADMIN_ATTENTION_BADGES,
  type AdminNavGroup,
} from "./adminNav";

/** Compact-mode (icon-first) core: the gear entry is provided by the rail's
 *  Settings utility, so /admin/settings stays out of the scroll column. */
const CORE_HREFS = [
  "/admin",
  "/admin/customers",
  "/admin/agents",
  "/admin/merchants",
  "/admin/transactions",
  "/admin/transfers",
  "/admin/wallets",
  "/admin/ledger",
  "/admin/settlements",
  "/admin/kyc",
  "/admin/risk",
  "/admin/banking-nodes",
];

const toRailGroup = (g: AdminNavGroup) => ({
  title: g.title,
  items: g.items.map((it) => ({
    label: it.label,
    href: it.href,
    icon: it.icon,
    badge: it.badge && ADMIN_ATTENTION_BADGES.has(it.badge) ? it.badge : undefined,
    hot: it.badge === "Alert",
  })),
});

/** Full-height console wrapper for the Super Admin command center: floating
 *  navigation rail (premium spec) + topbar workspace + mobile dock/More. */
export const AdminConsoleFrame: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    await logout();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-row font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Desktop: premium floating navigation rail */}
      <KorieFloatingRail
        tone="emerald"
        word="KoriePay"
        role="SUPER ADMIN"
        settingsHref="/admin/settings"
        onLogout={handleLogout}
        storeKey="korie_admin_rail"
        groups={adminNavGroups.map(toRailGroup)}
        primary={CORE_HREFS}
        context={
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
              Core Banking Rails
            </p>
            <div className="space-y-1 text-[10px]">
              <Link
                href="/admin/banking-nodes"
                className="flex items-center justify-between rounded-lg p-1.5 transition-colors hover:bg-[var(--surface)]"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-[var(--foreground)] truncate">
                    🇳🇬 Providus Bank
                  </span>
                </span>
                <span className="font-mono text-[var(--foreground-muted)]">142ms</span>
              </Link>
              <Link
                href="/admin/banking-nodes"
                className="flex items-center justify-between rounded-lg p-1.5 transition-colors hover:bg-[var(--surface)]"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-[var(--foreground)] truncate">
                    🇳🇪 Coris Bank
                  </span>
                </span>
                <span className="font-mono text-[var(--foreground-muted)]">188ms</span>
              </Link>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center text-[10px] font-extrabold">
                SA
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-[var(--foreground)] truncate">
                  Super Admin
                </span>
                <span className="block text-[9px] font-mono uppercase tracking-wide text-[var(--brand-primary)] truncate">
                  Abuja Core Desk
                </span>
              </span>
            </span>
            <Link
              href="/"
              className="shrink-0 text-[9px] font-mono text-[var(--brand-primary)] hover:underline"
            >
              Site ↗
            </Link>
          </div>
        }
      />

      {/* Right: topbar workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <AdminTopBar />
        {/* pb clears the floating dock on phones */}
        <main className="flex-1 pb-28 lg:pb-10">{children}</main>
      </div>

      {/* Mobile: floating dock + full More sheet (new — admin had no mobile nav) */}
      <AdminMobileNav />
    </div>
  );
};

export default AdminConsoleFrame;
