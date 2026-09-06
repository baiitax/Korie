"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowRightLeft, Search, Bell, Menu, X } from "lucide-react";
import { useAdmin } from "./AdminContext";
import { AdminRailSections } from "./AdminRail";

/**
 * AdminMobileNav — floating bottom navigation for phones + a slide-over
 * drawer with the full section list (the same sections the rail renders).
 *
 * Five destinations on the bar: Home · Operations · Search · Alerts · More.
 * The bar never condenses or hides (44px+ targets), and the drawer closes on
 * route change.
 */
export const AdminMobileNav: React.FC = () => {
  const pathname = usePathname();
  const { setIsSearchOpen } = useAdmin();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // The sign-in route renders without the shell (after all hooks).

  const isHome = pathname === "/admin";
  const isOps = pathname.startsWith("/admin/transactions") || pathname.startsWith("/admin/transfers") ||
    pathname.startsWith("/admin/settlements") || pathname.startsWith("/admin/reconciliation");

  return (
    <>
      {/* Drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-[var(--border)] bg-[var(--surface)] p-4 pb-24 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                All modules
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--foreground-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {AdminRailSections.map((s) => {
                const Icon = s.icon;
                const active =
                  s.href === "/admin" ? pathname === "/admin" : pathname === s.href || pathname.startsWith(`${s.href}/`);
                return (
                  <li key={s.key}>
                    <Link
                      href={s.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[52px] items-center gap-2.5 rounded-2xl border px-3 text-[12px] font-semibold transition-colors ${
                        active
                          ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Floating bar */}
      <nav
        aria-label="Admin mobile navigation"
        className="fixed bottom-3 left-3 right-3 z-50 flex items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--surface)]/90 px-2 py-2 shadow-[var(--shadow-card)] backdrop-blur-xl lg:hidden"
      >
        <Link
          href="/admin"
          aria-label="Dashboard"
          aria-current={isHome ? "page" : undefined}
          className={`grid h-12 w-12 place-items-center rounded-2xl transition-colors ${
            isHome ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"
          }`}
        >
          <Home className="h-5 w-5" />
        </Link>
        <Link
          href="/admin/transactions"
          aria-label="Operations"
          aria-current={isOps ? "page" : undefined}
          className={`grid h-12 w-12 place-items-center rounded-2xl transition-colors ${
            isOps ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"
          }`}
        >
          <ArrowRightLeft className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Search"
          className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-[var(--shadow-md)]"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Alerts — opens command palette"
          className="grid h-12 w-12 place-items-center rounded-2xl text-[var(--foreground-muted)]"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="More modules"
          aria-expanded={drawerOpen}
          className="grid h-12 w-12 place-items-center rounded-2xl text-[var(--foreground-muted)]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>
    </>
  );
};

export default AdminMobileNav;
