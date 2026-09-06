"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  Wallet,
  MoreHorizontal,
  LogOut,
  X,
} from "lucide-react";
import { KorieDock } from "@/components/nav/KorieFloatingRail";
import { useAuth } from "@/components/auth/AuthContext";
import { adminNavGroups, ADMIN_ATTENTION_BADGES } from "./adminNav";

/**
 * AdminMobileNav — the Super Admin console had no mobile navigation at all
 * (the old sidebar rendered at every viewport). This adds the shared floating
 * dock (premium spec) plus a full-section More sheet so every admin area stays
 * reachable from a phone: Overview · Customers · Transactions · Wallets · More.
 */
export const AdminMobileNav: React.FC = () => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    await logout();
  };

  return (
    <>
      <KorieDock
        ariaLabel="Admin navigation"
        items={[
          { label: "Overview", href: "/admin", icon: LayoutDashboard },
          { label: "Customers", href: "/admin/customers", icon: Users },
          { label: "Transactions", href: "/admin/transactions", icon: ArrowRightLeft },
          { label: "Wallets", href: "/admin/wallets", icon: Wallet },
          { label: "More", icon: MoreHorizontal, onClick: () => setMoreOpen(true) },
        ]}
      />

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="All admin sections">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 w-full h-full bg-slate-950/50 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-3 bottom-3 max-h-[78dvh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 rounded-t-3xl">
              <div>
                <p className="text-xs font-bold text-[var(--foreground)]">All Admin Sections</p>
                <p className="text-[10px] font-mono text-[var(--foreground-muted)]">SUPER ADMIN · COMMAND CENTER</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-4">
              {adminNavGroups.map((grp) => (
                <div key={grp.title}>
                  <p className="px-2 pb-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    {grp.title}
                  </p>
                  <div className="space-y-0.5">
                    {grp.items.map((it) => {
                      const Icon = it.icon;
                      const active = isActive(it.href);
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                              : "text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${active ? "" : "text-[var(--foreground-muted)]"}`} />
                            <span className="truncate">{it.label}</span>
                          </span>
                          {it.badge && ADMIN_ATTENTION_BADGES.has(it.badge) && (
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold ${
                                it.badge === "Alert"
                                  ? "bg-rose-500/15 text-rose-500"
                                  : "bg-amber-500/15 text-amber-600"
                              }`}
                            >
                              {it.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-2.5 text-xs font-bold text-[var(--foreground)] transition-colors hover:text-[var(--danger)] hover:border-[var(--danger-soft)]"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminMobileNav;
