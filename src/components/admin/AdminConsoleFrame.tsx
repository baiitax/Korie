"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import AdminTopBar from "./AdminTopBar";
import AdminMobileNav from "./AdminMobileNav";
import ConsoleShell from "@/components/console/ConsoleShell";
import ConsoleCommandPalette from "@/components/console/ConsoleCommandPalette";
import ConsoleKeyGate from "@/components/console/ConsoleKeyGate";
import { SANDBOX_ADMIN_BOOTSTRAP_KEY } from "@/lib/consoleKeys";
import { useAdmin } from "./AdminContext";
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

/** Full-height console wrapper for the Super Admin command center.
 *  This is the reference implementation of the KoriePay console chrome:
 *  floating navigation rail + topbar workspace + mobile dock/More sheet.
 *  Compliance, Support and Merchant render through the same ConsoleShell. */
export const AdminConsoleFrame: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { logout } = useAuth();
  const { isSearchOpen, setIsSearchOpen } = useAdmin();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    await logout();
  };

  // The topbar's search trigger flips the shared admin search state (⌘K lives
  // in AdminContext); this frame now renders a real destination palette for it.
  const paletteVisible = paletteOpen || isSearchOpen;
  const closePalette = () => {
    setPaletteOpen(false);
    setIsSearchOpen(false);
  };

  return (
    <>
      <ConsoleShell
        rail={{
          groups: adminNavGroups.map(toRailGroup),
          primary: CORE_HREFS,
          storeKey: "korie_admin_rail",
          word: "KoriePay",
          role: "SUPER ADMIN",
          tone: "emerald",
          settingsHref: "/admin/settings",
          onLogout: handleLogout,
          context: (
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
          ),
          footer: (
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
          ),
        }}
        topbar={<AdminTopBar onOpenSearch={() => setPaletteOpen(true)} />}
        mobileNav={<AdminMobileNav />}
        overlays={
          <ConsoleCommandPalette
            open={paletteVisible}
            onClose={closePalette}
            placeholder="Jump to any admin section (e.g. ledger, bank, KYC)..."
            groups={[
              {
                title: "Super Admin sections",
                items: adminNavGroups.flatMap((g) =>
                  g.items.map((it) => ({ label: it.label, sub: it.href, href: it.href })),
                ),
              },
            ]}
            emptyText="No admin section matches"
          />
        }
      >
        <ConsoleKeyGate
          kind="admin"
          title="Super Admin console"
          sessionPath="/api/admin/session"
          bootstrapKey={SANDBOX_ADMIN_BOOTSTRAP_KEY}
          credentialsHref="/admin/api-credentials"
          credentialsLabel="API Credentials"
        >
          {children}
        </ConsoleKeyGate>
      </ConsoleShell>
    </>
  );
};

export default AdminConsoleFrame;
