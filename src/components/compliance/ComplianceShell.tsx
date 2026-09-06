'use client';

/**
 * KoriePay Compliance Command Center — global chrome.
 * Light-first glass shell: persistent sidebar (lg+), collapsible, mobile drawer,
 * header with breadcrumb + global search (⌘K) + notifications + theme/language +
 * profile; mobile bottom navigation (Home / Customers / Alerts / Cases / More).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCheck, Building2, Radio, ShieldAlert, ShieldHalf, Fingerprint, Eye,
  Bell, FileSearch, FolderSearch, CheckSquare, ListTodo, ArrowUpRight, FileBarChart2, BarChart3,
  History, Activity, Lock, FileCheck2, Calendar, BookOpen, UserCog, Plug2, HeartPulse, Settings,
  Search, Menu, X, ChevronsLeft, ChevronDown, LogOut, Sun, Moon, Globe, CircleAlert, CircleCheck,
  Clock3, Gauge, AlertOctagon, Sparkles, Home, MoreHorizontal, ScrollText, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCompliance } from './ComplianceContext';
import { useCompliancePortal, ToastMsg } from './CompliancePortalContext';
import { ComplianceLocale } from '@/locales/compliance';

/* ------------------------------------------------------------------ */
/* Navigation model                                                    */
/* ------------------------------------------------------------------ */
export interface NavItem {
  key: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  badge?: 'kyc' | 'alerts' | 'cases' | 'tasks' | 'approvals' | 'matches';
}
export interface NavGroup { groupKey: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: 'overview',
    items: [{ key: 'dashboard', labelKey: 'nav.dashboard', href: '/compliance', icon: LayoutDashboard }],
  },
  {
    groupKey: 'customers',
    items: [
      { key: 'customers', labelKey: 'nav.customers', href: '/compliance/customers', icon: Users },
      { key: 'kyc', labelKey: 'nav.kyc', href: '/compliance/kyc', icon: UserCheck, badge: 'kyc' },
      { key: 'kyb', labelKey: 'nav.kyb', href: '/compliance/kyb', icon: Building2 },
    ],
  },
  {
    groupKey: 'monitoring',
    items: [
      { key: 'txm', labelKey: 'nav.transactionMonitoring', href: '/compliance/transaction-monitoring', icon: Radio },
      { key: 'aml', labelKey: 'nav.aml', href: '/compliance/aml', icon: ShieldAlert },
      { key: 'risk', labelKey: 'nav.risk', href: '/compliance/risk', icon: Gauge, badge: 'matches' },
    ],
  },
  {
    groupKey: 'screening',
    items: [
      { key: 'sanctions', labelKey: 'nav.sanctions', href: '/compliance/sanctions', icon: Fingerprint },
      { key: 'pep', labelKey: 'nav.pep', href: '/compliance/pep', icon: Eye },
      { key: 'watchlists', labelKey: 'nav.watchlists', href: '/compliance/watchlists', icon: ScrollText },
    ],
  },
  {
    groupKey: 'investigations',
    items: [
      { key: 'alerts', labelKey: 'nav.alerts', href: '/compliance/alerts', icon: Bell, badge: 'alerts' },
      { key: 'cases', labelKey: 'nav.cases', href: '/compliance/cases', icon: FileSearch, badge: 'cases' },
      { key: 'investigations', labelKey: 'nav.investigations', href: '/compliance/investigations', icon: FolderSearch },
    ],
  },
  {
    groupKey: 'operations',
    items: [
      { key: 'approvals', labelKey: 'nav.approvals', href: '/compliance/approvals', icon: CheckSquare, badge: 'approvals' },
      { key: 'tasks', labelKey: 'nav.tasks', href: '/compliance/tasks', icon: ListTodo, badge: 'tasks' },
      { key: 'escalations', labelKey: 'nav.escalations', href: '/compliance/escalations', icon: ArrowUpRight },
    ],
  },
  {
    groupKey: 'reporting',
    items: [
      { key: 'reports', labelKey: 'nav.reports', href: '/compliance/reports', icon: FileBarChart2 },
      { key: 'analytics', labelKey: 'nav.analytics', href: '/compliance/analytics', icon: BarChart3 },
    ],
  },
  {
    groupKey: 'governance',
    items: [
      { key: 'audit', labelKey: 'nav.audit', href: '/compliance/audit', icon: History },
      { key: 'activity', labelKey: 'nav.activity', href: '/compliance/activity', icon: Activity },
    ],
  },
  {
    groupKey: 'regulatoryDesks',
    items: [
      { key: 'restrictions', labelKey: 'nav.restrictions', href: '/compliance/restrictions', icon: Lock },
      { key: 'regulatory', labelKey: 'nav.regulatoryReporting', href: '/compliance/regulatory-reporting', icon: FileCheck2 },
      { key: 'calendar', labelKey: 'nav.calendar', href: '/compliance/calendar', icon: Calendar },
      { key: 'policies', labelKey: 'nav.policies', href: '/compliance/policies', icon: BookOpen },
      { key: 'team', labelKey: 'nav.team', href: '/compliance/team', icon: UserCog },
    ],
  },
  {
    groupKey: 'system',
    items: [
      { key: 'integrations', labelKey: 'nav.integrations', href: '/compliance/integrations', icon: Plug2 },
      { key: 'health', labelKey: 'nav.systemHealth', href: '/compliance/system-health', icon: HeartPulse },
      { key: 'settings', labelKey: 'nav.settings', href: '/compliance/settings', icon: Settings },
    ],
  },
];

const NAV_FLAT: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const gt = (t: Record<string, any>, key: string): string => {
  const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), t as any);
  return typeof v === 'string' ? v : key;
};
const SEG_LABELS: Record<string, string> = {
  customers: 'nav.customers', kyc: 'nav.kyc', kyb: 'nav.kyb', 'transaction-monitoring': 'nav.transactionMonitoring',
  aml: 'nav.aml', risk: 'nav.risk', sanctions: 'nav.sanctions', pep: 'nav.pep', watchlists: 'nav.watchlists',
  alerts: 'nav.alerts', cases: 'nav.cases', investigations: 'nav.investigations', approvals: 'nav.approvals',
  tasks: 'nav.tasks', escalations: 'nav.escalations', reports: 'nav.reports', analytics: 'nav.analytics',
  audit: 'nav.audit', activity: 'nav.activity', restrictions: 'nav.restrictions', 'regulatory-reporting': 'nav.regulatoryReporting',
  calendar: 'nav.calendar', policies: 'nav.policies', team: 'nav.team', integrations: 'nav.integrations',
  'system-health': 'nav.systemHealth', settings: 'nav.settings', workQueue: 'nav.tasks', agents: 'nav.kyc',
};

const badgeFor = (b: string | undefined, stats: ReturnType<typeof useCompliancePortal>['stats']) => {
  switch (b) {
    case 'kyc': return stats.kycOpen;
    case 'alerts': return stats.alertsOpen;
    case 'cases': return stats.casesOpen;
    case 'tasks': return stats.tasksOpen;
    case 'approvals': return stats.approvalsPending;
    case 'matches': return stats.matchesReview;
    default: return 0;
  }
};

/* ------------------------------------------------------------------ */
/* Small chrome atoms                                                  */
/* ------------------------------------------------------------------ */
const LangFlag: React.FC<{ code: ComplianceLocale }> = ({ code }) => {
  const label = code === 'en' ? 'EN' : code === 'fr' ? 'FR' : 'HA';
  return <span className="text-[0.6rem] font-extrabold tracking-wider">{label}</span>;
};

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export const ComplianceShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const portal = useCompliancePortal();
  const legacy = useCompliance();
  const { t } = portal;

  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // keep legacy locale in sync so inherited desks switch language too
  useEffect(() => {
    if (legacy.locale !== portal.locale) legacy.setLocale(portal.locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal.locale]);

  useEffect(() => {
    setDrawerOpen(false); setNotifOpen(false); setProfileOpen(false); setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(next ? 'dark' : 'light');
    try { localStorage.setItem('koriepay_theme', next ? 'dark' : 'light'); } catch { /* noop */ }
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', next ? '#070b17' : '#f6f9fd');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((v) => !v); }
      if (e.key === 'Escape') { setSearchOpen(false); setNotifOpen(false); setProfileOpen(false); setMoreOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (profileOpen) {
      const h = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }
  }, [profileOpen]);

  const crumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean); // ['compliance', ...]
    const trail: { label: string; href?: string }[] = [{ label: t.nav.dashboard, href: '/compliance' }];
    if (parts.length > 1) {
      parts.slice(1).forEach((seg, i) => {
        const key = SEG_LABELS[seg] || (seg === 'compliance' ? null : null);
        const label = key ? gt(t, key) : seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const href = parts.slice(0, i + 2).join('/');
        trail.push({ label, href: i === parts.length - 2 ? undefined : `/${href}` });
      });
    }
    return trail;
  }, [pathname, t]);

  const activeKey = useMemo(() => {
    const seg = parts2(pathname);
    const match = NAV_FLAT.find((n) => n.href === `/compliance${seg.length ? `/${seg}` : ''}` || (n.href !== '/compliance' && pathname.startsWith(n.href)));
    return match?.key;
  }, [pathname]);

  const notifications = useMemo(() => {
    const items: { id: string; group: 'critical' | 'compliance' | 'system'; title: string; href?: string; at: string }[] = [];
    portal.alerts.filter((a) => a.status === 'OPEN' && a.severity !== 'LOW').slice(0, 5).forEach((a) =>
      items.push({ id: a.id, group: a.severity === 'CRITICAL' ? 'critical' : 'compliance', title: `${a.title} · ${a.customerName ?? '—'}`, href: `/compliance/alerts/${a.id}`, at: a.triggeredAt }));
    portal.approvals.filter((a) => a.status === 'PENDING').slice(0, 3).forEach((a) =>
      items.push({ id: a.id, group: 'compliance', title: `${t.nav.approvals}: ${a.title}`, href: '/compliance/approvals', at: a.requestedAt }));
    portal.kyc.filter((k) => k.status === 'PENDING' || k.status === 'IN_REVIEW').slice(0, 3).forEach((k) =>
      items.push({ id: k.id, group: 'compliance', title: `${t.nav.kyc} — ${k.customerName}`, href: `/compliance/kyc/${k.id.replace('KYC-', '')}`, at: k.submittedAt }));
    portal.cases.filter((c) => new Date(c.deadlineSla).getTime() - Date.now() < 24 * 3600_000).slice(0, 2).forEach((c) =>
      items.push({ id: c.id, group: 'system', title: `${t.common.slaApproaching}: ${c.caseNumber}`, href: `/compliance/cases/${c.caseNumber}`, at: c.deadlineSla }));
    return items;
  }, [portal, t]);

  const initials = (portal.currentOfficer.fullName || 'KO').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex-1 overflow-y-auto kpc-scroll px-2 py-2.5 space-y-3" aria-label={t.nav.main || 'Compliance navigation'}>
      {NAV_GROUPS.map((g) => {
        const badgeTotal = g.items.reduce((acc, it) => acc + badgeFor(it.badge, portal.stats), 0);
        return (
          <div key={g.groupKey}>
            {sidebarOpen && (
              <div className="kpc-nav-group flex items-center justify-between px-1.5">
                {gt(t, 'groups.' + g.groupKey)}
                {badgeTotal > 0 && <span className="kpc-nav-badge">{badgeTotal}</span>}
              </div>
            )}
            <div className={sidebarOpen ? 'space-y-0.5' : 'space-y-1'}>
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = activeKey === it.key;
                const badge = badgeFor(it.badge, portal.stats);
                return (
                  <Link
                    key={it.key}
                    href={it.href}
                    aria-current={active ? 'page' : undefined}
                    title={!sidebarOpen ? gt(t, it.labelKey) : undefined}
                    onClick={onNavigate}
                    className={`kpc-nav-item${!sidebarOpen ? ' kpc-nav-item--icon' : ''}`}
                  >
                    <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={active ? 2.3 : 1.9} />
                    {sidebarOpen && <span className="flex-1 truncate">{gt(t, it.labelKey)}</span>}
                    {sidebarOpen && badge > 0 && !active && (
                      <span className={`kpc-nav-badge ${it.badge === 'alerts' || it.badge === 'matches' || it.badge === 'approvals' ? 'kpc-nav-badge-hot' : ''}`}>{badge}</span>
                    )}
                    {sidebarOpen && active && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-90" strokeWidth={2.6} />}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* brand header — logo + portal badge (Super Admin / Aggregator style) */}
      <div className={`flex items-center gap-2.5 ${sidebarOpen ? 'px-3.5 pt-3.5 pb-2' : 'justify-center px-0 pt-3.5 pb-2'}`}>
        <Link href="/compliance" aria-label="KoriePay" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/25 ring-1 ring-emerald-500/20 shrink-0">
            <img src="/brand/koriepay-icon-tight.png" alt="" className="w-6 h-6 rounded-[7px]" />
          </div>
          {sidebarOpen && (
            <span className="leading-tight min-w-0">
              <span className="block text-[0.95rem] font-extrabold tracking-tight text-[var(--kpc-ink)]">KoriePay</span>
            </span>
          )}
        </Link>
        {sidebarOpen && (
          <span className="ml-auto px-2 py-0.5 rounded-md text-[0.56rem] font-mono font-extrabold uppercase tracking-[0.14em] text-[var(--kpc-brand-ink)] bg-[var(--kpc-brand-ink)]/10 border border-[var(--kpc-brand-ink)]/25 shrink-0">
            Compliance
          </span>
        )}
      </div>

      {/* context strip — markets & rails + jurisdiction (rounded card like Admin/Aggregator) */}
      {sidebarOpen ? (
        <div className="mx-3 my-2 rounded-2xl border border-[rgba(var(--kpc-ring),0.65)] bg-[var(--kpc-card-solid)] shadow-[var(--kpc-shadow-sm,0_1px_2px_rgba(15,23,42,.05))] p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[0.56rem] font-mono font-extrabold uppercase tracking-[0.12em] text-[var(--kpc-ink-3)]">
            <span>{t.header.jurisdiction} &amp; Rails</span>
            <span className="px-1.5 py-px rounded-full text-[0.48rem] tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse inline-block" />Demo
            </span>
          </div>
          <Link href="/compliance/system-health" title="System health" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[rgba(13,148,136,0.08)] text-[var(--kpc-ink-2)] hover:text-[var(--kpc-ink)] transition-colors">
            <span className="flex items-center gap-2 text-[0.72rem] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span>&#x1F1F3;&#x1F1EA; Coris Bank</span>
            </span>
            <span className="text-[0.58rem] kpc-mono font-bold text-[var(--kpc-ink-3)]">XOF (CFA)</span>
          </Link>
          <Link href="/compliance/system-health" title="System health" className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[rgba(13,148,136,0.08)] text-[var(--kpc-ink-2)] hover:text-[var(--kpc-ink)] transition-colors">
            <span className="flex items-center gap-2 text-[0.72rem] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>&#x1F1F3;&#x1F1F4; Providus Bank</span>
            </span>
            <span className="text-[0.58rem] kpc-mono font-bold text-[var(--kpc-ink-3)]">NGN</span>
          </Link>
          <div className="pt-1.5 border-t border-[rgba(var(--kpc-ring),0.5)]">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[rgba(var(--kpc-ring),0.3)] border border-[rgba(var(--kpc-ring),0.45)] text-[0.58rem] kpc-mono font-extrabold">
              {(['NE', 'NG', 'ALL'] as const).map((code) => {
                const on = (legacy.selectedJurisdiction as string) === code;
                return (
                  <button
                    key={code}
                    onClick={() => legacy.setSelectedJurisdiction(code as never)}
                    aria-pressed={on}
                    className={`py-1 rounded-md transition-colors ${on ? 'bg-teal-600 text-white shadow-sm' : 'text-[var(--kpc-ink-3)] hover:text-[var(--kpc-ink)]'}`}
                  >
                    {code === 'NE' ? '&#x1F1F3;&#x1F1EA; NE' : code === 'NG' ? '&#x1F1F3;&#x1F1F4; NG' : '&#x1F310; All'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-2" title="Demo data · XOF-first (NE), NGN second (NG)">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        </div>
      )}

      {renderNav()}

      {/* officer footer card — profile + public site (Super Admin style) */}
      <div className="mt-auto p-2.5 border-t border-[rgba(var(--kpc-ring),0.55)]">
        <div className={`flex items-center gap-2 rounded-xl border border-[rgba(var(--kpc-ring),0.55)] bg-[var(--kpc-card-solid)] px-2.5 py-2 ${sidebarOpen ? '' : 'justify-center px-0 border-0 bg-transparent'}`}>
          <Link href="/compliance/settings" className="flex items-center gap-2.5 min-w-0 flex-1" title={t.header.myProfile}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-700 text-white flex items-center justify-center text-[0.68rem] font-extrabold shadow-sm shrink-0">{initials}</div>
            {sidebarOpen && (
              <span className="min-w-0 leading-tight block">
                <span className="block text-[0.74rem] font-bold text-[var(--kpc-ink)] truncate">{portal.currentOfficer.fullName}</span>
                <span className="block text-[0.58rem] kpc-mono font-bold text-[var(--kpc-ink-3)] truncate">{portal.currentOfficer.role.replace(/_/g, ' ')} · {portal.currentOfficer.id}</span>
              </span>
            )}
          </Link>
          {sidebarOpen && (
            <Link href="/" title={t.header.logout} className="text-[var(--kpc-ink-3)] hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0">
              <LogOut className="w-4 h-4" />
            </Link>
          )}
        </div>
        {sidebarOpen && (
          <p className="px-1 pt-1.5 flex items-center gap-1.5 text-[0.56rem] font-semibold text-[var(--kpc-ink-3)]">
            <span className="w-1 h-1 rounded-full bg-teal-500" />{t.header.demo} · XOF first &#x1F1F3;&#x1F1EA; · {legacy.selectedJurisdiction !== 'ALL' ? legacy.selectedJurisdiction : 'NG + NE'}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="kp-c kpc-app min-h-screen flex flex-col" style={{ background: 'var(--kpc-bg)' }}>
      <div className="kpc-topline" />
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-40 kpc-glass border-b border-[rgba(var(--kpc-ring),0.6)]">
        <div className="flex items-center gap-2 px-3 md:px-5 h-[52px]">
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden kpc-btn kpc-btn-ghost kpc-btn-icon" aria-label="Open navigation"><Menu className="w-5 h-5" /></button>
          <button onClick={() => setSidebarOpen((v) => !v)} className="hidden lg:inline-flex kpc-btn kpc-btn-ghost kpc-btn-icon" aria-label="Collapse sidebar"><ChevronsLeft className={`w-4.5 h-4.5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} style={{ width: 18, height: 18 }} /></button>

          {/* breadcrumb */}
          <nav className="flex items-center gap-1.5 min-w-0 text-[0.78rem]" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-[var(--kpc-ink-3)] select-none">/</span>}
                {c.href && i < crumbs.length - 1 ? (
                  <Link href={c.href} className="text-[var(--kpc-ink-3)] hover:text-[var(--kpc-brand-ink)] font-medium truncate">{c.label}</Link>
                ) : (
                  <span className="font-bold text-[var(--kpc-ink)] truncate max-w-[46vw] sm:max-w-none">{c.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="flex-1" />

          {/* search */}
          <button onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 30); }} className="hidden md:flex items-center gap-2 text-[0.73rem] text-[var(--kpc-ink-3)] bg-[var(--kpc-card-solid)] border border-[rgba(var(--kpc-ring),0.75)] rounded-lg px-2.5 py-1.5 hover:border-emerald-500/40 transition w-52 xl:w-64">
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{t.header.searchPlaceholder}</span>
            <kbd className="text-[0.6rem] font-bold border border-[rgba(var(--kpc-ring),0.9)] rounded px-1 py-px">⌘K</kbd>
          </button>
          <button onClick={() => setSearchOpen(true)} className="md:hidden kpc-btn kpc-btn-ghost kpc-btn-icon" aria-label="Search"><Search className="w-[18px] h-[18px]" /></button>

          {/* notifications */}
          <div className="relative">
            <button onClick={() => setNotifOpen((v) => !v)} className="kpc-btn kpc-btn-ghost kpc-btn-icon relative" aria-label="Notifications">
              <Bell className="w-[18px] h-[18px]" />
              {notifications.length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-600 text-white text-[0.55rem] font-extrabold flex items-center justify-center">{notifications.length}</span>}
            </button>
            {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} items={notifications} t={t} />}
          </div>

          {/* theme */}
          <button onClick={toggleTheme} className="kpc-btn kpc-btn-ghost kpc-btn-icon" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}</button>

          {/* language */}
          <div className="hidden md:flex items-center bg-[var(--kpc-card-solid)] border border-[rgba(var(--kpc-ring),0.75)] rounded-lg p-0.5">
            {(['en', 'fr', 'ha'] as ComplianceLocale[]).map((l) => (
              <button key={l} onClick={() => portal.setLocale(l)} aria-pressed={portal.locale === l} className={`px-2 py-1 rounded-md text-[0.66rem] font-extrabold transition ${portal.locale === l ? 'bg-teal-600 text-white shadow-sm' : 'text-[var(--kpc-ink-3)] hover:text-[var(--kpc-ink)]'}`}>{l.toUpperCase()}</button>
            ))}
          </div>

          {/* profile */}
          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen((v) => !v)} aria-haspopup="menu" aria-expanded={profileOpen} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-[rgba(var(--kpc-ring),0.5)] transition">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 text-white flex items-center justify-center text-[0.62rem] font-extrabold">{initials}</div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--kpc-ink-3)] hidden sm:block" />
            </button>
            {profileOpen && <ProfilePanel t={t} portal={portal} />}
          </div>
        </div>
      </header>

      {/* ============ BODY ============ */}
      <div className="flex flex-1 min-h-0">
        {/* desktop sidebar */}
        <aside className={`hidden lg:flex flex-col shrink-0 transition-[width] duration-200 border-r border-[rgba(var(--kpc-ring),0.6)] bg-[var(--kpc-card-solid)] ${sidebarOpen ? 'w-[248px]' : 'w-[64px]'}`}>
          <SidebarInner />
        </aside>
        <main className="flex-1 min-w-0 px-3 md:px-6 py-4 md:py-5 pb-24 lg:pb-8">{children}</main>
      </div>

      {/* ============ MOBILE DRAWER ============ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm kpc-anim-fade" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] bg-[var(--kpc-bg-2)] border-r border-[rgba(var(--kpc-ring),0.7)] shadow-2xl kpc-anim-rise" role="dialog" aria-label="Navigation">
            <div className="flex justify-end p-2"><button onClick={() => setDrawerOpen(false)} className="kpc-btn kpc-btn-ghost kpc-btn-icon" aria-label="Close"><X className="w-5 h-5" /></button></div>
            <SidebarInner />
          </div>
        </div>
      )}

      {/* ============ BOTTOM NAV (mobile) ============ */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 kpc-glass border-t border-[rgba(var(--kpc-ring),0.7)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {[
            { key: 'home', label: t.bottomNav.home, href: '/compliance', icon: Home },
            { key: 'customers', label: t.bottomNav.customers, href: '/compliance/customers', icon: Users },
            { key: 'alerts', label: t.bottomNav.alerts, href: '/compliance/alerts', icon: CircleAlert },
            { key: 'cases', label: t.bottomNav.cases, href: '/compliance/cases', icon: FileSearch },
            { key: 'more', label: t.bottomNav.more, href: null, icon: MoreHorizontal },
          ].map((b) => {
            const Icon = b.icon;
            const active = b.href ? pathname === b.href || pathname.startsWith(b.href + '/') : moreOpen;
            if (b.href) {
              return (
                <Link key={b.key} href={b.href} className="flex flex-col items-center gap-0.5 py-2 text-[0.6rem] font-bold">
                  <Icon className={`w-5 h-5 ${active ? 'text-teal-600 dark:text-teal-400' : 'text-[var(--kpc-ink-3)]'}`} strokeWidth={active ? 2.3 : 1.9} />
                  <span className={active ? 'text-teal-600 dark:text-teal-400' : 'text-[var(--kpc-ink-3)]'}>{b.label}</span>
                </Link>
              );
            }
            return (
              <button key={b.key} onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} className="flex flex-col items-center gap-0.5 py-2 text-[0.6rem] font-bold">
                <Icon className={`w-5 h-5 ${moreOpen ? 'text-teal-600 dark:text-teal-400' : 'text-[var(--kpc-ink-3)]'}`} strokeWidth={moreOpen ? 2.3 : 1.9} />
                <span className={moreOpen ? 'text-teal-600 dark:text-teal-400' : 'text-[var(--kpc-ink-3)]'}>{b.label}</span>
              </button>
            );
          })}
        </div>
        {moreOpen && (
          <div className="kpc-anim-rise border-t border-[rgba(var(--kpc-ring),0.6)] max-h-[55vh] overflow-y-auto kpc-scroll px-2 py-2">
            {NAV_GROUPS.filter((g) => !['overview'].includes(g.groupKey)).map((g) => (
              <div key={g.groupKey} className="mb-1.5">
                <div className="kpc-nav-group">{gt(t, 'groups.' + g.groupKey)}</div>
                <div className="grid grid-cols-2 gap-1">
                  {g.items.map((it) => {
                    const Icon = it.icon;
                    const b = badgeFor(it.badge, portal.stats);
                    return (
                      <Link key={it.key} href={it.href} onClick={() => setMoreOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[0.72rem] font-semibold text-[var(--kpc-ink-2)] hover:bg-[rgba(var(--kpc-ring),0.5)] hover:text-[var(--kpc-ink)]">
                        <Icon className="w-4 h-4 shrink-0" /> <span className="truncate flex-1">{gt(t, it.labelKey)}</span>
                        {b > 0 && <span className="kpc-nav-badge">{b}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-2 py-2 border-t border-[rgba(var(--kpc-ring),0.5)] mt-1">
              <button onClick={() => portal.setLocale(portal.locale === 'en' ? 'fr' : portal.locale === 'fr' ? 'ha' : 'en')} className="kpc-btn kpc-btn-ghost text-[0.7rem]"><Globe className="w-4 h-4" /> {portal.locale.toUpperCase()}</button>
              <button onClick={toggleTheme} className="kpc-btn kpc-btn-ghost text-[0.7rem]">{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {dark ? t.header.light : t.header.dark}</button>
              <Link href="/login" className="kpc-btn kpc-btn-ghost text-[0.7rem] text-rose-600 dark:text-rose-400"><LogOut className="w-4 h-4" /> {t.header.logout}</Link>
            </div>
          </div>
        )}
      </div>

      {/* ============ COMMAND PALETTE ============ */}
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} autoFocusRef={searchRef} />}

      {/* ============ TOASTS ============ */}
      <div className="fixed bottom-20 lg:bottom-4 right-3 z-[60] space-y-2 w-[min(340px,92vw)]" role="region" aria-label="Notifications">
        {portal.toasts.map((tst) => <ToastCard key={tst.id} toast={tst} onClose={() => portal.dismissToast(tst.id)} />)}
      </div>
    </div>
  );
};

function parts2(pathname: string): string {
  return pathname.split('/').filter(Boolean).slice(1).join('/');
}

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */
function NotificationPanel({ items, onClose, t }: { items: { id: string; group: 'critical' | 'compliance' | 'system'; title: string; href?: string; at: string }[]; onClose: () => void; t: Record<string, any> }) {
  const groups: { key: 'critical' | 'compliance' | 'system'; label: string }[] = [
    { key: 'critical', label: t.notif.critical },
    { key: 'compliance', label: t.notif.compliance },
    { key: 'system', label: t.notif.system },
  ];
  return (
    <div className="absolute right-0 top-[calc(100%+8px)] w-[340px] max-w-[90vw] kpc-card kpc-card-flat kpc-anim-rise z-50 overflow-hidden shadow-xl" role="dialog" aria-label="Notifications">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--kpc-line)]">
        <span className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{t.header.notifications}</span>
        <button onClick={onClose} className="kpc-btn kpc-btn-ghost kpc-btn-icon"><X className="w-4 h-4" /></button>
      </div>
      <div className="max-h-[380px] overflow-y-auto kpc-scroll">
        {groups.map((g) => {
          const list = items.filter((i) => i.group === g.key);
          if (!list.length) return null;
          return (
            <div key={g.key} className="py-1.5">
              <div className="kpc-eyebrow px-3.5 pb-1 text-[var(--kpc-ink-3)]">{g.label} · {list.length}</div>
              {list.map((i) => (
                <Link key={i.id} href={i.href ?? '#'} onClick={onClose} className="flex items-start gap-2.5 px-3.5 py-2 hover:bg-[rgba(13,148,136,0.05)] transition">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${i.group === 'critical' ? 'bg-rose-500' : i.group === 'compliance' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                  <div className="min-w-0">
                    <p className="text-[0.74rem] font-semibold text-[var(--kpc-ink)] leading-snug">{i.title}</p>
                    <p className="text-[0.64rem] text-[var(--kpc-ink-3)] mt-0.5">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(i.at))}</p>
                  </div>
                </Link>
              ))}
            </div>
          );
        })}
        {!items.length && <div className="px-4 py-8 text-center text-[0.74rem] text-[var(--kpc-ink-3)]">{t.notif.empty}</div>}
      </div>
    </div>
  );
}

function ProfilePanel({ t, portal }: { t: Record<string, any>; portal: ReturnType<typeof useCompliancePortal> }) {
  const officer = portal.currentOfficer;
  const items = [
    { icon: UserCog, label: t.header.myProfile, href: '/compliance/settings' },
    { icon: ShieldHalf, label: t.header.security, href: '/compliance/settings?tab=security' },
    { icon: Activity, label: t.header.activity, href: '/compliance/activity' },
    { icon: Settings, label: t.header.preferences, href: '/compliance/settings?tab=appearance' },
  ];
  return (
    <div className="absolute right-0 top-[calc(100%+8px)] w-60 kpc-card kpc-card-flat kpc-anim-rise z-50 overflow-hidden shadow-xl" role="menu" aria-label="Profile">
      <div className="px-3.5 py-3 border-b border-[var(--kpc-line)]">
        <div className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{officer.fullName}</div>
        <div className="text-[0.66rem] text-[var(--kpc-brand-ink)] font-bold uppercase tracking-wider mt-0.5">{officer.role.replace(/_/g, ' ')}</div>
      </div>
      <div className="py-1">
        {items.map((it) => (
          <Link key={it.label} href={it.href} role="menuitem" className="flex items-center gap-2.5 px-3.5 py-2 text-[0.76rem] font-semibold text-[var(--kpc-ink-2)] hover:bg-[rgba(13,148,136,0.06)] hover:text-[var(--kpc-ink)]">
            <it.icon className="w-4 h-4" /> {it.label}
          </Link>
        ))}
      </div>
      <div className="border-t border-[var(--kpc-line)] py-1">
        <div className="px-3.5 py-1.5 text-[0.64rem] font-bold uppercase tracking-wider text-[var(--kpc-ink-3)]">{t.header.jurisdiction}</div>
        <div className="flex gap-1 px-2.5">
          {[
            { code: 'ALL', label: 'NG + NE' },
            { code: 'NG', label: '🇳🇬 NG' },
            { code: 'NE', label: '🇳🇪 NE' },
          ].map((j) => (
            <button key={j.code} onClick={() => portal.pushToast('info', `${t.header.jurisdiction} → ${j.label}`, t.toasts.jurisdictionDemo)} className={`flex-1 rounded-lg px-2 py-1.5 text-[0.68rem] font-bold border transition ${portal.currentOfficer.jurisdiction === j.code ? 'bg-teal-600 text-white border-teal-600' : 'border-[rgba(var(--kpc-ring),0.8)] text-[var(--kpc-ink-2)] hover:border-teal-500/50'}`}>{j.label}</button>
          ))}
        </div>
        <p className="px-3.5 pt-1 pb-0.5 text-[0.6rem] text-[var(--kpc-ink-3)]">{t.toasts.jurisdictionDemo}</p>
      </div>
      <Link href="/login" className="flex items-center gap-2.5 px-3.5 py-2.5 border-t border-[var(--kpc-line)] text-[0.76rem] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/5">
        <LogOut className="w-4 h-4" /> {t.header.logout}
      </Link>
    </div>
  );
}

function SearchPalette({ onClose, autoFocusRef }: { onClose: () => void; autoFocusRef?: React.Ref<HTMLInputElement> }) {
  const router = useRouter();
  const p = useCompliancePortal();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [] as { group: string; href: string; label: string; sub: string }[];
    const out: { group: string; href: string; label: string; sub: string }[] = [];
    const push = (group: string, items: { label: string; sub: string; href: string }[]) =>
      items.slice(0, 5).forEach((i) => out.push({ group, ...i }));
    const by = (s: string) => s.toLowerCase().includes(query);
    push(p.t.search.customers, p.customers.filter((c) => by(c.firstName) || by(c.lastName) || by(c.id)).map((c) => ({ label: `${c.firstName} ${c.lastName}`, sub: `${c.id} · ${c.city}`, href: `/compliance/customers/${c.id.replace('KP-', '')}` })));
    push(p.t.search.transactions, p.txns.filter((x) => by(x.id)).slice(0, 5).map((x) => ({ label: x.id, sub: `${p.fmtMoney(x.amount, x.currency)} · ${x.customerName}`, href: `/compliance/transaction-monitoring/${x.id.replace('TXN-', '')}` })));
    push(p.t.search.alerts, p.alerts.filter((a) => by(a.id) || by(a.title)).map((a) => ({ label: a.title, sub: `${a.id} · ${a.severity}`, href: `/compliance/alerts/${a.id}` })));
    push(p.t.search.cases, p.cases.filter((c) => by(c.caseNumber) || by(c.title)).map((c) => ({ label: `${c.caseNumber} · ${c.title}`, sub: c.customerName ?? '', href: `/compliance/cases/${c.caseNumber}` })));
    push(p.t.search.kyc, p.kyc.filter((k) => by(k.customerName) || by(k.id)).map((k) => ({ label: `${k.customerName} — ${k.id}`, sub: k.tier, href: `/compliance/kyc/${k.id.replace('KYC-', '')}` })));
    return out.slice(0, 24);
  }, [q, p]);

  useEffect(() => { setSel(0); }, [q]);

  const go = (href: string) => { router.push(href); onClose(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[sel]) go(results[sel].href);
    if (e.key === 'Escape') onClose();
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] px-3">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm kpc-anim-fade" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-xl kpc-card kpc-card-flat kpc-anim-rise overflow-hidden shadow-2xl" role="dialog" aria-label={p.t.header.searchPlaceholder}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--kpc-line)]">
          <Search className="w-4.5 h-4.5 text-[var(--kpc-ink-3)]" style={{ width: 18, height: 18 }} />
          <input
            ref={autoFocusRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={p.t.header.searchPlaceholder}
            className="flex-1 bg-transparent text-[0.85rem] text-[var(--kpc-ink)] placeholder:text-[var(--kpc-ink-3)] outline-none"
            aria-label={p.t.header.searchPlaceholder}
          />
          <kbd className="text-[0.6rem] font-bold border border-[rgba(var(--kpc-ring),0.9)] rounded px-1 py-0.5 text-[var(--kpc-ink-3)]">ESC</kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto kpc-scroll py-1.5" onMouseDown={(e) => e.preventDefault()}>
          {q && !results.length && <div className="px-5 py-8 text-center text-[0.78rem] text-[var(--kpc-ink-3)]">{p.t.search.noResults} “{q}”</div>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? <div className="kpc-eyebrow px-4 pt-2.5 pb-1 text-[var(--kpc-ink-3)]">{r.group}</div> : null;
            lastGroup = r.group;
            return (
              <React.Fragment key={r.href + r.label}>
                {header}
                <button onMouseEnter={() => setSel(i)} onClick={() => go(r.href)} className={`w-full text-left px-4 py-2 flex items-center gap-3 transition ${i === sel ? 'bg-[rgba(13,148,136,0.08)]' : ''}`}>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[0.78rem] font-bold text-[var(--kpc-ink)] truncate">{r.label}</span>
                    <span className="block text-[0.66rem] text-[var(--kpc-ink-3)] truncate">{r.sub}</span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--kpc-ink-3)]" />
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastMsg; onClose: () => void }) {
  const toneMap: Record<ToastMsg['tone'], string> = {
    ok: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/60',
    info: 'text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-50/90 dark:bg-sky-950/60',
    warn: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/60',
    danger: 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/60',
  };
  const Icon = toast.tone === 'ok' ? CircleCheck : toast.tone === 'danger' ? AlertOctagon : toast.tone === 'warn' ? Clock3 : Sparkles;
  return (
    <div className={`kpc-anim-rise border rounded-xl px-3 py-2.5 shadow-lg backdrop-blur flex items-start gap-2.5 ${toneMap[toast.tone]}`} role="status">
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[0.74rem] font-extrabold leading-snug">{toast.title}{toast.demo ? <span className="ml-1.5 text-[0.58rem] uppercase tracking-wider opacity-70 border px-1 py-px rounded">demo</span> : null}</div>
        {toast.msg && <div className="text-[0.68rem] opacity-80 mt-0.5 truncate">{toast.msg}</div>}
      </div>
      <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}
