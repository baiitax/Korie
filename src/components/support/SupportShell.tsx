"use client";

// =============================================================================
// File: src/components/support/SupportShell.tsx
// Description: KoriePay Support — the operating system shell.
//
// §09  complete sidebar (OVERVIEW / CUSTOMER SERVICE / TRANSACTIONS /
//       OPERATIONS / KNOWLEDGE / ANALYTICS / GOVERNANCE / SYSTEM)
// §79  rounded glass surfaces
// §81  mobile: floating bottom nav (5 slots + More sheet), full desktop IA
// §83  dark mode via .dark .kp-support tokens
// §95  global command search (⌘K)
// =============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  DollarSign,
  FileSearch,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Lock,
  LogOut,
  MoreHorizontal,
  MessagesSquare,
  Moon,
  Plus,
  Search,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Ticket as TicketIcon,
  Users,
  Zap,
} from "lucide-react";
import { useSupportOps } from "./SupportOpsProvider";
import { Modal, Spinner, initials, relTime } from "./SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";
import { NewTicketModal } from "./NewTicketModal";

interface NavItem {
  href: string;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "overview",
    items: [
      { href: "/support", key: "dashboard", icon: LayoutDashboard, exact: true },
      { href: "/support/inbox", key: "inbox", icon: MessagesSquare },
    ],
  },
  {
    group: "customerService",
    items: [
      { href: "/support/tickets", key: "tickets", icon: TicketIcon },
      { href: "/support/customers", key: "customers", icon: Users },
      { href: "/support/kyc", key: "kyc", icon: ShieldCheck },
    ],
  },
  {
    group: "transactions",
    items: [
      { href: "/support/transactions", key: "transactions", icon: Activity },
      { href: "/support/disputes", key: "disputes", icon: FileSearch },
      { href: "/support/refunds", key: "refunds", icon: DollarSign },
    ],
  },
  {
    group: "operations",
    items: [
      { href: "/support/escalations", key: "escalations", icon: Zap },
      { href: "/support/tasks", key: "tasks", icon: ListChecks },
    ],
  },
  {
    group: "knowledge",
    items: [
      { href: "/support/knowledge", key: "knowledge", icon: BookOpen },
      { href: "/support/macros", key: "macros", icon: ClipboardList },
    ],
  },
  {
    group: "analytics",
    items: [{ href: "/support/analytics", key: "analytics", icon: BarChart3 }],
  },
  {
    group: "governance",
    items: [
      { href: "/support/audit", key: "audit", icon: Lock },
      { href: "/support/notifications", key: "notifications", icon: Bell },
    ],
  },
  {
    group: "system",
    items: [
      { href: "/support/integrations", key: "integrations", icon: Server },
      { href: "/support/system-health", key: "systemHealth", icon: LifeBuoy },
      { href: "/support/settings", key: "settings", icon: SettingsIcon },
    ],
  },
];

const MOBILE_MAIN = [
  { href: "/support", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/support/inbox", key: "inbox", icon: MessagesSquare },
  { href: "/support/customers", key: "customers", icon: Users },
  { href: "/support/tasks", key: "tasks", icon: ListChecks },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function SupportShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, theme, setTheme, activeOfficer, signOut, isOnline, toasts, dismissToast, toast } = useSupportOps();
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; read: boolean; createdAt: string; link?: string }[]>([]);
  const [unread, setUnread] = useState(0);

  // Notification unread badge (poll-light: on open + every 60s).
  const refreshNotifications = useCallback(async () => {
    const res = await supportOps.notifications();
    if (isSupportApiError(res)) return;
    setNotifications(res.items);
    setUnread(res.unreadCount);
  }, []);

  useEffect(() => {
    refreshNotifications();
    const iv = window.setInterval(refreshNotifications, 60000);
    return () => window.clearInterval(iv);
  }, [refreshNotifications]);

  // ⌘K global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const navGroups = useMemo(() => NAV, []);

  const SidebarLink = ({ item }: { item: NavItem }) => {
    const active = isActive(pathname, item);
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors ${
          active
            ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]"
            : "text-[var(--foreground-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
        }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {t(`supportOps.nav.${item.key}`)}
      </Link>
    );
  };

  return (
    <div className="kp-support min-h-dvh bg-[var(--background)] text-[var(--foreground)] antialiased">
      {/* Offline strip */}
      {!isOnline && (
        <div className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-[var(--state-warning)] px-4 py-1.5 text-xs font-bold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          {t("supportOps.header.offline")}
        </div>
      )}

      <div className="flex">
        {/* ── Desktop sidebar ─────────────────────────────────────────── */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--support-sidebar-w)] flex-col border-r border-[var(--card-border)] bg-[var(--nav-bg)] backdrop-blur-[var(--nav-blur)] lg:flex">
          <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#0b7a63] to-[#158987] text-white shadow-sm">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-extrabold tracking-tight">{t("supportOps.nav.title")}</p>
              <p className="text-[11px] font-semibold text-[var(--muted)]">{t("supportOps.nav.subtitle")}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label={t("supportOps.nav.title")}>
            {navGroups.map((g) => (
              <div key={g.group}>
                <p className="px-3 pb-1.5 pt-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {t(`supportOps.nav.${g.group}`)}
                </p>
                <div className="space-y-0.5">
                  {g.items.map((item) => (
                    <SidebarLink key={item.key} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Officer + prefs footer */}
          <div className="border-t border-[var(--border)] p-3">
            <div className="flex items-center gap-2 rounded-[10px] bg-[var(--surface-2)] p-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)] text-[11px] font-extrabold text-[var(--brand-on-primary)]">
                {activeOfficer ? initials(activeOfficer.fullName) : "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[var(--foreground)]">{activeOfficer?.fullName ?? "—"}</p>
                <p className="truncate text-[10px] font-semibold text-[var(--muted)]">
                  {activeOfficer ? t(`supportOps.roles.${activeOfficer.role}`) : ""}
                </p>
              </div>
              <button
                onClick={() => void signOut()}
                aria-label={t("supportOps.header.signOut")}
                title={t("supportOps.header.signOut")}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1" role="group" aria-label={t("supportOps.header.language")}>
                {(["en", "fr", "ha"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      lang === l ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={t("supportOps.header.theme")}
                className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="flex min-h-dvh w-full flex-col lg:pl-[var(--support-sidebar-w)]">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-[var(--support-topbar-h)] items-center gap-2 border-b border-[var(--card-border)] bg-[var(--nav-bg)] px-4 backdrop-blur-[var(--nav-blur)] sm:px-6">
            {/* Mobile brand */}
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#0b7a63] to-[#158987] text-white lg:hidden">
              <LifeBuoy className="h-4 w-4" />
            </span>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-left text-[13px] text-[var(--muted)] transition-colors hover:border-[var(--brand-border)]"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden truncate sm:inline">{t("supportOps.header.searchPlaceholder")}</span>
              <span className="truncate sm:hidden">{t("supportOps.search.title")}</span>
              <kbd className="ml-auto hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-bold sm:inline">⌘K</kbd>
            </button>

            <button
              onClick={() => setNewTicketOpen(true)}
              disabled={!isOnline}
              className="flex items-center gap-1.5 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-3 py-2 text-[13px] font-bold text-[var(--brand-on-primary)] shadow-sm transition-colors hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("supportOps.newTicket.title")}</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                }}
                aria-label={t("supportOps.header.notifications")}
                className="relative grid h-9 w-9 place-items-center rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] text-[var(--foreground-muted)] transition-colors hover:border-[var(--brand-border)]"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4.5 min-w-[18px] h-[18px] place-items-center rounded-full bg-[var(--state-danger)] px-1 text-[10px] font-extrabold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--surface)] p-2 shadow-xl">
                  <p className="px-2 py-1 text-xs font-extrabold text-[var(--foreground)]">{t("supportOps.notifications.title")}</p>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 && (
                      <p className="px-2 py-4 text-center text-xs text-[var(--muted)]">{t("supportOps.notifications.empty")}</p>
                    )}
                    {notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link ?? "/support/notifications"}
                        onClick={async () => {
                          setNotifOpen(false);
                          if (!n.read) {
                            await supportOps.markNotificationRead(n.id);
                            setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                            setUnread((u) => Math.max(0, u - 1));
                          }
                        }}
                        className={`block rounded-lg px-2 py-2 transition-colors hover:bg-[var(--surface-3)] ${n.read ? "opacity-60" : ""}`}
                      >
                        <p className="text-xs font-bold text-[var(--foreground)]">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--foreground-muted)]">{n.body}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">{relTime(n.createdAt, t)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
        </div>
      </div>

      {/* ── Mobile floating bottom nav (§81–§82) ──────────────────────── */}
      <nav
        aria-label="mobile"
        className="fixed bottom-4 left-1/2 z-40 flex w-[92%] max-w-md -translate-x-1/2 items-center justify-around rounded-2xl border border-[var(--card-border)] bg-[var(--nav-bg)] p-1.5 shadow-xl backdrop-blur-[var(--nav-blur)] lg:hidden"
        style={{ paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))" }}
      >
        {MOBILE_MAIN.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[10px] font-bold transition-colors ${
                active ? "text-[var(--brand-primary)]" : "text-[var(--muted)]"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "" : "opacity-70"}`} />
              {t(`supportOps.nav.${item.key}`)}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          aria-label={t("supportOps.common.actions")}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[10px] font-bold text-[var(--muted)]`}
        >
          <MoreHorizontal className="h-5 w-5 opacity-70" />
          {t("supportOps.common.actions")}
        </button>
      </nav>

      {/* More sheet (mobile) */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t("supportOps.nav.title")}>
        <div className="grid grid-cols-2 gap-2">
          {NAV.flatMap((g) => g.items)
            .filter((i) => !MOBILE_MAIN.some((m) => m.href === i.href))
            .map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[13px] font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--brand-border)]"
              >
                <item.icon className="h-4 w-4 text-[var(--brand-primary)]" />
                {t(`supportOps.nav.${item.key}`)}
              </Link>
            ))}
        </div>
      </Modal>

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NewTicketModal open={newTicketOpen} onClose={() => setNewTicketOpen(false)} onCreated={(num) => toast(t("supportOps.toasts.ticketCreated", { ticket: num }))} />

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 lg:bottom-6">
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2 rounded-[10px] border px-3 py-2.5 text-xs font-semibold shadow-lg backdrop-blur ${
              toastItem.type === "error"
                ? "border-[var(--state-danger)]/40 bg-[var(--state-danger-soft)] text-[var(--state-danger)]"
                : toastItem.type === "info"
                  ? "border-[var(--state-info)]/40 bg-[var(--state-info-soft)] text-[var(--state-info)]"
                  : "border-[var(--state-success)]/40 bg-[var(--state-success-soft)] text-[var(--state-success)]"
            }`}
          >
            <span className="flex-1">{toastItem.message}</span>
            <button onClick={() => dismissToast(toastItem.id)} aria-label={t("supportOps.common.close")} className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Global command search (§95) */
interface SearchHit {
  id: string;
  href: string;
}
interface SearchResults {
  customers: (SearchHit & { name: string; country: string; status: string })[];
  tickets: (SearchHit & { number: string; subject: string; status: string })[];
  transactions: (SearchHit & { reference: string; currency: string; amount: number; status: string })[];
  disputes: (SearchHit & { number: string; category: string; status: string })[];
  escalations: (SearchHit & { number: string; destination: string; status: string })[];
  knowledge: (SearchHit & { title: string; category: string })[];
}

function GlobalSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useSupportOps();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setResults(null);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setBusy(true);
    const timer = window.setTimeout(async () => {
      const res = await supportOps.search(q.trim());
      if (isSupportApiError(res)) setResults(null);
      else setResults(res);
      setBusy(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const groups: { key: string; items: { href: string; primary: string; secondary: string }[] }[] = results
    ? [
        { key: "customers", items: results.customers.map((c) => ({ href: c.href, primary: c.name, secondary: c.status })) },
        { key: "tickets", items: results.tickets.map((x) => ({ href: x.href, primary: `${x.number} — ${x.subject}`, secondary: x.status })) },
        { key: "transactions", items: results.transactions.map((x) => ({ href: x.href, primary: x.reference, secondary: `${x.currency} ${x.amount} · ${x.status}` })) },
        { key: "disputes", items: results.disputes.map((x) => ({ href: x.href, primary: x.number, secondary: x.category })) },
        { key: "escalations", items: results.escalations.map((x) => ({ href: x.href, primary: x.number, secondary: x.destination })) },
        { key: "knowledge", items: results.knowledge.map((x) => ({ href: x.href, primary: x.title, secondary: x.category })) },
      ].filter((g) => g.items.length > 0)
    : [];

  return (
    <Modal open={open} onClose={onClose} title={t("supportOps.search.title")} wide>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("supportOps.search.placeholder")}
        aria-label={t("supportOps.search.placeholder")}
        className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand-border)]"
      />
      <div className="mt-3 max-h-[50dvh] overflow-y-auto">
        {busy && <div className="flex items-center gap-2 px-1 py-3 text-xs text-[var(--muted)]"><Spinner /> {t("supportOps.common.loading")}</div>}
        {!busy && q.trim().length >= 2 && groups.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-[var(--muted)]">
            {t("supportOps.search.noResults", { query: q })}
          </p>
        )}
        {groups.map((g) => (
          <div key={g.key} className="mb-3">
            <p className="px-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
              {t(`supportOps.search.groups.${g.key}`)}
            </p>
            {g.items.map((item, i) => (
              <button
                key={i}
                onClick={() => go(item.href)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-3)]"
              >
                <span className="truncate text-[13px] font-semibold text-[var(--foreground)]">{item.primary}</span>
                <span className="shrink-0 text-[11px] font-semibold text-[var(--muted)]">{item.secondary}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}


