'use client';

/**
 * KoriePay Compliance Command Center — global chrome.
 *
 * Chrome aligned to the Super Admin console (master spec v1): shared
 * ConsoleShell — floating collapsible icon-first rail, glass top bar, mobile
 * floating dock + More sheet, ⌘K command palette. The compliance domain layer
 * (locale, jurisdiction, officers, notifications, toasts, ⌘K data) is unchanged
 * and simply feeds the shared chrome's slots.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Users, UserCheck, Building2, Radio, ShieldAlert, Gauge, Fingerprint, Eye,
  Bell, FileSearch, FolderSearch, CheckSquare, ListTodo, ArrowUpRight, FileBarChart2, BarChart3,
  History, Activity, Lock, FileCheck2, Calendar, BookOpen, UserCog, Plug2, HeartPulse, Settings,
  CircleCheck, CircleAlert, Clock3, AlertOctagon, Sparkles, Home, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCompliance } from './ComplianceContext';
import { useCompliancePortal, ToastMsg } from './CompliancePortalContext';
import { ComplianceLocale } from '@/locales/compliance';
import ConsoleShell from '@/components/console/ConsoleShell';
import ConsoleTopBar from '@/components/console/ConsoleTopBar';
import ConsoleMobileNav from '@/components/console/ConsoleMobileNav';
import ConsoleCommandPalette from '@/components/console/ConsoleCommandPalette';

/* ------------------------------------------------------------------ */
/* Navigation model                                                    */
/* ------------------------------------------------------------------ */
export interface NavItem {
  key: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  badge?: 'kyc' | 'alerts' | 'cases' | 'tasks' | 'approvals' | 'matches';
  /** shown in the icon-first floating rail (compact mode) */
  rail?: boolean;
}
export interface NavGroup { groupKey: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: 'overview',
    items: [{ key: 'dashboard', labelKey: 'nav.dashboard', href: '/compliance', icon: LayoutDashboard, rail: true }],
  },
  {
    groupKey: 'customers',
    items: [
      { key: 'customers', labelKey: 'nav.customers', href: '/compliance/customers', icon: Users, rail: true },
      { key: 'kyc', labelKey: 'nav.kyc', href: '/compliance/kyc', icon: UserCheck, badge: 'kyc', rail: true },
      { key: 'kyb', labelKey: 'nav.kyb', href: '/compliance/kyb', icon: Building2, rail: true },
    ],
  },
  {
    groupKey: 'monitoring',
    items: [
      { key: 'txm', labelKey: 'nav.transactionMonitoring', href: '/compliance/transaction-monitoring', icon: Radio, rail: true },
      { key: 'aml', labelKey: 'nav.aml', href: '/compliance/aml', icon: ShieldAlert },
      { key: 'risk', labelKey: 'nav.risk', href: '/compliance/risk', icon: Gauge, badge: 'matches', rail: true },
    ],
  },
  {
    groupKey: 'screening',
    items: [
      { key: 'sanctions', labelKey: 'nav.sanctions', href: '/compliance/sanctions', icon: Fingerprint, rail: true },
      { key: 'pep', labelKey: 'nav.pep', href: '/compliance/pep', icon: Eye },
      { key: 'watchlists', labelKey: 'nav.watchlists', href: '/compliance/watchlists', icon: FileSearch },
    ],
  },
  {
    groupKey: 'investigations',
    items: [
      { key: 'alerts', labelKey: 'nav.alerts', href: '/compliance/alerts', icon: Bell, badge: 'alerts', rail: true },
      { key: 'cases', labelKey: 'nav.cases', href: '/compliance/cases', icon: FileSearch, badge: 'cases', rail: true },
      { key: 'investigations', labelKey: 'nav.investigations', href: '/compliance/investigations', icon: FolderSearch },
    ],
  },
  {
    groupKey: 'operations',
    items: [
      { key: 'approvals', labelKey: 'nav.approvals', href: '/compliance/approvals', icon: CheckSquare, badge: 'approvals', rail: true },
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

const HOT_BADGES = new Set(['alerts', 'matches', 'approvals']);

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export const ComplianceShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const portal = useCompliancePortal();
  const legacy = useCompliance();
  const { t } = portal;
  const [paletteOpen, setPaletteOpen] = useState(false);

  // keep legacy locale in sync so inherited desks switch language too
  React.useEffect(() => {
    if (legacy.locale !== portal.locale) legacy.setLocale(portal.locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal.locale]);

  const railGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        title: gt(t, 'groups.' + g.groupKey).toUpperCase(),
        items: g.items.map((it) => {
          const b = badgeFor(it.badge, portal.stats);
          return {
            label: gt(t, it.labelKey),
            href: it.href,
            icon: it.icon,
            badge: b > 0 ? b : undefined,
            hot: it.badge ? HOT_BADGES.has(it.badge) : false,
          };
        }),
      })),
    [t, portal.stats],
  );

  const primary = NAV_FLAT.filter((n) => n.rail).map((n) => n.href);

  const notifications = useMemo(() => {
    const items: { id: string; title: string; body?: string; tone: 'amber' | 'emerald' | 'rose' | 'sky' }[] = [];
    portal.alerts
      .filter((a) => a.status === 'OPEN' && a.severity !== 'LOW')
      .slice(0, 4)
      .forEach((a) =>
        items.push({
          id: a.id,
          title: a.title,
          body: `${a.id} · ${a.customerName ?? '—'} · ${a.severity}`,
          tone: a.severity === 'CRITICAL' ? 'rose' : 'amber',
        }),
      );
    portal.approvals
      .filter((a) => a.status === 'PENDING')
      .slice(0, 2)
      .forEach((a) => items.push({ id: a.id, title: `${t.nav.approvals}: ${a.title}`, body: a.requestedAt, tone: 'sky' }));
    return items;
  }, [portal.alerts, portal.approvals, t]);

  const paletteGroups = useMemo(() => {
    const by = (s: string, q: string) => s.toLowerCase().includes(q);
    void by;
    return [
      {
        title: 'Compliance destinations',
        items: NAV_FLAT.map((n) => ({ label: gt(t, n.labelKey), sub: n.href, href: n.href })),
      },
      {
        title: t.search?.customers || 'Customers',
        items: portal.customers.slice(0, 10).map((c) => ({
          label: `${c.firstName} ${c.lastName}`,
          sub: `${c.id} · ${c.city}`,
          href: `/compliance/customers/${c.id.replace('KP-', '')}`,
        })),
      },
      {
        title: t.search?.alerts || 'Alerts',
        items: portal.alerts.slice(0, 10).map((a) => ({
          label: a.title,
          sub: `${a.id} · ${a.severity}`,
          href: `/compliance/alerts/${a.id}`,
        })),
      },
      {
        title: t.search?.cases || 'Cases',
        items: portal.cases.slice(0, 10).map((c) => ({
          label: `${c.caseNumber} · ${c.title}`,
          sub: c.customerName ?? '',
          href: `/compliance/cases/${c.caseNumber}`,
        })),
      },
      {
        title: t.search?.kyc || 'KYC',
        items: portal.kyc.slice(0, 10).map((k) => ({
          label: `${k.customerName} — ${k.id}`,
          sub: k.tier,
          href: `/compliance/kyc/${k.id.replace('KYC-', '')}`,
        })),
      },
    ];
  }, [t, portal.customers, portal.alerts, portal.cases, portal.kyc]);

  const initials = (portal.currentOfficer.fullName || 'KO')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* noop */
    }
    window.location.href = '/login';
  };

  const jurisOptions = [
    { id: 'ALL', label: '🌍 All Regions', tone: 'global' as const },
    { id: 'NG', label: '🇳🇬 Nigeria (NGN)', tone: 'ng' as const },
    { id: 'NE', label: '🇳🇪 Niger (XOF)', tone: 'ne' as const },
  ];

  return (
    <div className="kp-c kpc-app">
      <ConsoleShell
        rail={{
          tone: 'emerald',
          word: 'KoriePay',
          role: 'COMPLIANCE',
          storeKey: 'korie_compliance_rail',
          settingsHref: '/compliance/settings',
          onLogout: handleLogout,
          groups: railGroups,
          primary,
          context: (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                {t.header?.jurisdiction || 'Jurisdiction'} &amp; Rails
              </p>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--foreground-muted)]">🇳🇪 Coris Bank</span>
                <span className="font-mono font-bold text-[var(--foreground-muted)]">XOF</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--foreground-muted)]">🇳🇬 Providus Bank</span>
                <span className="font-mono font-bold text-[var(--foreground-muted)]">NGN</span>
              </div>
              <div className="pt-1.5 border-t border-[var(--border)]">
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[9px] font-mono font-extrabold">
                  {(['NE', 'NG', 'ALL'] as const).map((code) => {
                    const on = (legacy.selectedJurisdiction as string) === code;
                    return (
                      <button
                        key={code}
                        onClick={() => legacy.setSelectedJurisdiction(code as never)}
                        aria-pressed={on}
                        className={`py-1 rounded-md transition-colors ${
                          on ? 'bg-teal-600 text-white shadow-sm' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {code === 'NE' ? '🇳🇪 NE' : code === 'NG' ? '🇳🇬 NG' : '🌍 All'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ),
          footer: (
            <div className="flex items-center justify-between gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5">
              <Link href="/compliance/settings" className="flex items-center gap-2 min-w-0" title={t.header?.myProfile}>
                <span className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-700 text-white flex items-center justify-center text-[10px] font-extrabold">
                  {initials}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-[var(--foreground)] truncate">
                    {portal.currentOfficer.fullName}
                  </span>
                  <span className="block text-[9px] font-mono uppercase tracking-wide text-[var(--brand-primary)] truncate">
                    {portal.currentOfficer.role.replace(/_/g, ' ')} · {portal.currentOfficer.id}
                  </span>
                </span>
              </Link>
              <Link href="/" className="shrink-0 text-[9px] font-mono text-[var(--brand-primary)] hover:underline">
                Site ↗
              </Link>
            </div>
          ),
        }}
        topbar={
          <ConsoleTopBar
            searchPlaceholder={t.header?.searchPlaceholder || 'Search customers, alerts, cases, KYC...'}
            onSearch={() => setPaletteOpen(true)}
            markets={{
              value: legacy.selectedJurisdiction as string,
              onChange: (v) => legacy.setSelectedJurisdiction(v as never),
              options: jurisOptions,
            }}
            notifications={{
              count: notifications.length,
              title: t.header?.notifications || 'Notifications',
              emptyText: t.notif?.empty || 'No new notifications.',
              items: notifications,
            }}
            extras={
              <>
                {/* Officer identity chip — admin-style status chip */}
                <span className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border bg-teal-500/10 text-teal-300 border-teal-500/30">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <span>{portal.currentOfficer.role.replace(/_/g, ' ')}</span>
                </span>
                {/* Language switcher — same segmented control as the admin market switcher */}
                <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold font-mono">
                  {(['en', 'fr', 'ha'] as ComplianceLocale[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => portal.setLocale(l)}
                      aria-pressed={portal.locale === l}
                      className={`px-2.5 py-1.5 rounded-lg uppercase transition-all ${
                        portal.locale === l ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </>
            }
            user={{ name: portal.currentOfficer.fullName, role: portal.currentOfficer.role.replace(/_/g, ' ') }}
            onLogout={handleLogout}
          />
        }
        mobileNav={
          <ConsoleMobileNav
            dockItems={[
              { label: t.bottomNav?.home || 'Home', href: '/compliance', icon: Home },
              { label: t.bottomNav?.customers || 'Customers', href: '/compliance/customers', icon: Users },
              { label: t.bottomNav?.alerts || 'Alerts', href: '/compliance/alerts', icon: CircleAlert },
              { label: t.bottomNav?.cases || 'Cases', href: '/compliance/cases', icon: FileSearch },
            ]}
            groups={NAV_GROUPS.map((g) => ({
              title: gt(t, 'groups.' + g.groupKey).toUpperCase(),
              items: g.items.map((it) => {
                const b = badgeFor(it.badge, portal.stats);
                return {
                  label: gt(t, it.labelKey),
                  href: it.href,
                  icon: it.icon,
                  badge: b > 0 ? b : undefined,
                  hot: it.badge ? HOT_BADGES.has(it.badge) : false,
                };
              }),
            }))}
            title={t.nav?.main || 'All Compliance Sections'}
            subtitle="COMPLIANCE · FINANCIAL CRIME MANAGEMENT"
            onLogout={handleLogout}
            extra={
              <div className="rounded-xl border border-[var(--border)] p-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">Language</span>
                <div className="flex items-center gap-1">
                  {(['en', 'fr', 'ha'] as ComplianceLocale[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => portal.setLocale(l)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                        portal.locale === l
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-[var(--border)] text-[var(--foreground-muted)]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            }
          />
        }
        mainClassName="flex-1 pb-28 lg:pb-2"
        overlays={
          <>
            <ConsoleCommandPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
              placeholder={t.header?.searchPlaceholder || 'Search customers, alerts, cases, KYC...'}
              groups={paletteGroups}
              emptyText={t.search?.noResults || 'No matches'}
            />
            {/* TOASTS */}
            <div
              className="fixed bottom-20 lg:bottom-4 right-3 z-[60] space-y-2 w-[min(340px,92vw)]"
              role="region"
              aria-label="Notifications"
            >
              {portal.toasts.map((tst) => (
                <ToastCard key={tst.id} toast={tst} onClose={() => portal.dismissToast(tst.id)} />
              ))}
            </div>
          </>
        }
      >
        {children}
      </ConsoleShell>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */
function ToastCard({ toast, onClose }: { toast: ToastMsg; onClose: () => void }) {
  const toneMap: Record<ToastMsg['tone'], string> = {
    ok: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/60',
    info: 'text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-50/90 dark:bg-sky-950/60',
    warn: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/60',
    danger: 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/60',
  };
  const Icon = toast.tone === 'ok' ? CircleCheck : toast.tone === 'danger' ? AlertOctagon : toast.tone === 'warn' ? Clock3 : Sparkles;
  return (
    <div
      className={`kpc-anim-rise border rounded-xl px-3 py-2.5 shadow-lg backdrop-blur flex items-start gap-2.5 ${toneMap[toast.tone]}`}
      role="status"
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[0.74rem] font-extrabold leading-snug">
          {toast.title}
          {toast.demo ? (
            <span className="ml-1.5 text-[0.58rem] uppercase tracking-wider opacity-70 border px-1 py-px rounded">demo</span>
          ) : null}
        </div>
        {toast.msg && <div className="text-[0.68rem] opacity-80 mt-0.5 truncate">{toast.msg}</div>}
      </div>
      <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default ComplianceShell;
