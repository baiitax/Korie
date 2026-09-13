"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRegional } from "./RegionalContext";
import KorieLogo from "@/components/brand/KorieLogo";
import { PortalBootReveal } from "@/components/loading";
import { LayoutDashboard, Users, Wallet, ShieldAlert, LogOut, Menu, X, Globe } from "lucide-react";

const NAV = [
  { href: "/regional", key: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/regional/agents", key: "nav.agents", icon: Users, exact: false },
  { href: "/regional/float", key: "nav.float", icon: Wallet, exact: false },
  { href: "/regional/risk", key: "nav.risk", icon: ShieldAlert, exact: false },
];

const LANGS: { code: "en" | "fr" | "ha"; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ha", label: "HA" },
];

export default function RegionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { manager, managerError, t, language, setLanguage, signOut } = useRegional();
  const [navOpen, setNavOpen] = useState(false);

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased selection:bg-teal-500 selection:text-slate-950">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KorieLogo className="h-7 w-auto" />
          <span className="text-sm font-semibold">{t("common.portalName")}</span>
        </div>
        <button
          onClick={() => setNavOpen((v) => !v)}
          className="p-2 rounded-lg border border-[var(--border)] text-[var(--muted)]"
          aria-label="Toggle navigation"
        >
          {navOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>
      {navOpen && (
        <div className="lg:hidden border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setNavOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium ${
                isActive(item) ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {t(item.key)}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 bg-[var(--surface)]/80 border-r border-[var(--border)] sticky top-0 h-screen overflow-y-auto shrink-0">
          <div className="p-5 border-b border-[var(--border)] flex items-center gap-3">
            <KorieLogo className="h-8 w-auto" />
            <div className="leading-tight">
              <div className="text-sm font-bold">{t("common.portalName")}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                {t("session.managerFor")}
              </div>
            </div>
          </div>

          {manager ? (
            <div className="p-4 mx-4 mt-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="text-sm font-semibold truncate">{manager.fullName}</div>
              <div className="text-xs text-[var(--muted)] truncate">{manager.email}</div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  {manager.country === "NG" ? "Nigeria" : "Niger"}
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  {t("session.states", { count: manager.territories.length })}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {manager.territories.map((ter: string) => (
                  <span
                    key={ter}
                    className="px-1.5 py-0.5 rounded-md text-[10px] bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]"
                  >
                    {ter}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 mx-4 mt-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--muted)]">
              {managerError ? t("session.error") : t("common.loading")}
            </div>
          )}

          <nav className="p-4 space-y-1 mt-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(item)
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] border border-transparent"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="mt-auto p-4 border-t border-[var(--border)] space-y-3">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[var(--muted)]" />
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold ${
                    language === l.code
                      ? "bg-teal-500 text-slate-950"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t("common.signOut")}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <PortalBootReveal context="regional">{children}</PortalBootReveal>
          <footer className="px-4 sm:px-6 lg:px-8 py-6 text-[11px] text-[var(--muted)] border-t border-[var(--border)]">
            {t("states.footer")}
          </footer>
        </main>
      </div>
    </div>
  );
}
