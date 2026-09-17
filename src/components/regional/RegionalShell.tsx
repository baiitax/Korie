"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRegional } from "./RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import KorieLogo from "@/components/brand/KorieLogo";
import { PortalBootReveal } from "@/components/loading";
import { useTheme } from "@/components/ui/ThemeContext";
import {
  LayoutDashboard, Building2, Users, UserCircle, Store, ArrowRightLeft, Wallet,
  BarChart3, Coins, FileCheck2, ShieldAlert, LifeBuoy, FileSpreadsheet, Bell, Settings,
  LogOut, Menu, X, Globe, Sun, Moon, Search, Home, MoreHorizontal, ChevronRight, Percent } from "lucide-react";

interface NavItem { href: string; key: string; icon: React.ElementType; exact?: boolean }
const NAV_GROUPS: { key: string; items: NavItem[] }[] = [
  { key: "nav.overview", items: [{ href: "/regional", key: "nav.overview", icon: LayoutDashboard, exact: true }] },
  {
    key: "nav.groupNetwork",
    items: [
      { href: "/regional/aggregators", key: "nav.aggregators", icon: Building2 },
      { href: "/regional/agents", key: "nav.agents", icon: Users },
      { href: "/regional/customers", key: "nav.customers", icon: UserCircle },
      { href: "/regional/merchants", key: "nav.merchants", icon: Store },
    ],
  },
  {
    key: "nav.groupMoney",
    items: [
      { href: "/regional/transactions", key: "nav.transactions", icon: ArrowRightLeft },
      { href: "/regional/liquidity", key: "nav.liquidity", icon: Wallet },
      { href: "/regional/commissions", key: "nav.commissions", icon: Coins },
      { href: "/regional/commission-sets", key: "nav.commissionSets", icon: Percent },
    ],
  },
  {
    key: "nav.groupControl",
    items: [
      { href: "/regional/performance", key: "nav.performance", icon: BarChart3 },
      { href: "/regional/kyc", key: "nav.kyc", icon: FileCheck2 },
      { href: "/regional/risk", key: "nav.risk", icon: ShieldAlert },
      { href: "/regional/support", key: "nav.support", icon: LifeBuoy },
    ],
  },
  {
    key: "nav.groupWorkspace",
    items: [
      { href: "/regional/reports", key: "nav.reports", icon: FileSpreadsheet },
      { href: "/regional/notifications", key: "nav.notifications", icon: Bell },
      { href: "/regional/settings", key: "nav.settings", icon: Settings },
    ],
  },
];

const LANGS: { code: "en" | "fr" | "ha"; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ha", label: "HA" },
];

interface SearchResult { type: string; label: string; sublabel: string; href: string }

export default function RegionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { manager, managerError, t, language, setLanguage, signOut } = useRegional();
  const { theme, setTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  /* Notification badge (critical + high only). */
  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await regionalApiFetch("/api/regional/notifications");
        const json = await res.json();
        if (!cancelled && res.ok) setAlertCount((json.data?.counts?.critical ?? 0) + (json.data?.counts?.high ?? 0));
      } catch {
        /* badge is best-effort */
      }
    };
    void load();
    const id = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [manager, pathname]);

  /* Debounced global search. */
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await regionalApiFetch(`/api/regional/search?q=${encodeURIComponent(q.trim())}`);
        const json = await res.json();
        if (res.ok) setResults(json.data?.results ?? []);
      } catch {
        setResults([]);
      }
    }, 300);
  }, [q]);

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  const greeting = (() => {
    const h = now?.getHours() ?? 12;
    if (h < 12) return t("common.morning");
    if (h < 17) return t("common.afternoon");
    return t("common.evening");
  })();

  const SearchBox = (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => setSearchOpen(true)}
        onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
        placeholder={t("common.search")}
        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
      />
      {searchOpen && results !== null && (
        <div className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-md,0_4px_24px_rgba(0,0,0,0.12))] p-2">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[var(--foreground-muted)]">{t("common.searchEmpty")}</div>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  router.push(r.href);
                  setQ("");
                  setResults(null);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--surface-elevated)] flex items-center gap-2"
              >
                <span className="text-[9px] font-mono font-bold text-[var(--foreground-muted)] border border-[var(--border)] rounded px-1 py-0.5 shrink-0">{r.type}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{r.label}</span>
                  <span className="block text-[11px] text-[var(--foreground-muted)] truncate">{r.sublabel}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 text-[var(--foreground-muted)]" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );

  const sidebar = (
    <aside className="hidden lg:flex flex-col w-72 bg-[var(--surface)]/80 border-r border-[var(--border)] sticky top-0 h-screen overflow-y-auto shrink-0">
      <div className="p-5 border-b border-[var(--border)] flex items-center gap-3">
        <KorieLogo className="h-8 w-auto" />
        <div className="leading-tight">
          <div className="text-sm font-bold">{t("common.portalName")}</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">{t("session.managerFor")}</div>
        </div>
      </div>

      {manager && (
        <div className="p-4 mx-4 mt-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)]">
          <div className="text-sm font-semibold truncate">{manager.fullName}</div>
          <div className="text-xs text-[var(--foreground-muted)] truncate">{manager.email}</div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-border)]">
              {manager.country === "NG" ? "Nigeria" : "Niger"}
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)]">{t("session.states", { count: manager.territories.length })}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {manager.territories.map((ter: string) => (
              <span key={ter} className="px-1.5 py-0.5 rounded-md text-[10px] bg-[var(--background)] border border-[var(--border)] text-[var(--foreground-muted)]">
                {ter}
              </span>
            ))}
          </div>
        </div>
      )}

      <nav className="p-4 space-y-5 mt-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.key}>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">{t(group.key)}</div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive(item)
                      ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-border)]"
                      : "text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] border border-transparent"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t(item.key)}</span>
                  {item.href === "/regional/notifications" && alertCount !== null && alertCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500 text-white">{alertCount}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4 border-t border-[var(--border)] space-y-3">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold ${
                language === l.code ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary,#052e2b)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-auto p-2 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
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
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased">
      {/* Command header */}
      <header className="sticky top-0 z-40 bg-[var(--surface)]/90 backdrop-blur border-b border-[var(--border)]">
        <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <button onClick={() => setNavOpen((v) => !v)} className="lg:hidden p-2 rounded-lg border border-[var(--border)]" aria-label="Menu">
            {navOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div className="lg:hidden flex items-center gap-2 min-w-0">
            <KorieLogo className="h-6 w-auto" />
            <span className="text-xs font-bold truncate">{t("common.portalName")}</span>
          </div>
          <div className="hidden lg:flex flex-col min-w-0">
            <div className="text-sm font-bold">
              {greeting}
              {manager ? `, ${manager.fullName.split(" ")[0]}` : ""}
            </div>
            <div className="text-[11px] text-[var(--foreground-muted)] truncate">
              {t("dashboard.commandCenter")}
              {manager ? ` · ${manager.territories.slice(0, 3).join(", ")}${manager.territories.length > 3 ? "…" : ""}` : ""}
            </div>
          </div>
          <div className="ml-auto hidden sm:block">{SearchBox}</div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-[var(--foreground-muted)] font-mono">
            {now ? now.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }) : "…"}
          </div>
          <Link
            href="/regional/notifications"
            className="relative p-2 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {alertCount !== null && alertCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500 text-white">{alertCount}</span>
            )}
          </Link>
          <div className="sm:hidden">{/* mobile search opens below */}</div>
        </div>
        <div className="sm:hidden px-4 pb-3">{SearchBox}</div>
      </header>

      {navOpen && (
        <div className="lg:hidden border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.key}>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">{t(group.key)}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setNavOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive(item) ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.key)}
                </Link>
              ))}
            </div>
          ))}
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-500 border border-rose-500/20 mt-2">
            <LogOut className="w-4 h-4" />
            {t("common.signOut")}
          </button>
        </div>
      )}

      <div className="flex flex-1">
        {sidebar}
        <main className="flex-1 min-w-0 pb-24 lg:pb-0">
          <PortalBootReveal context="regional">{children}</PortalBootReveal>
          <footer className="px-4 sm:px-6 lg:px-8 py-6 text-[11px] text-[var(--foreground-muted)] border-t border-[var(--border)]">
            {t("common.poweredBy")}
          </footer>
        </main>
      </div>

      {/* Mobile floating bottom navigation */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
        {moreOpen && (
          <div className="mb-2 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-lg p-2 grid grid-cols-3 gap-1">
            {NAV_GROUPS.flatMap((g) => g.items)
              .filter((i) => !["/regional", "/regional/aggregators", "/regional/notifications"].includes(i.href))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl text-[10px] font-semibold text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)]"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="truncate max-w-[72px]">{t(item.key)}</span>
                </Link>
              ))}
          </div>
        )}
        <div className="rounded-3xl bg-[var(--surface)]/95 backdrop-blur border border-[var(--border)] shadow-lg px-2 py-2 flex items-center justify-around">
          {[
            { href: "/regional", key: "nav.home", icon: Home, exact: true },
            { href: "/regional/aggregators", key: "nav.aggregators", icon: Building2 },
            { href: "/regional/notifications", key: "nav.alerts", icon: Bell, badge: true },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl text-[10px] font-bold ${
                (item.exact ? pathname === item.href : pathname.startsWith(item.href)) ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {t(item.key)}
              {"badge" in item && item.badge && alertCount !== null && alertCount > 0 && (
                <span className="absolute top-0 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500 text-white">{alertCount}</span>
              )}
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl text-[10px] font-bold ${moreOpen ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`}
          >
            <MoreHorizontal className="w-5 h-5" />
            {t("nav.more")}
          </button>
        </div>
      </nav>
    </div>
  );
}
