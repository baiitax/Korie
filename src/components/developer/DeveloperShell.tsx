"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDeveloper } from './DeveloperContext';
import { useAuth } from '@/components/auth/AuthContext';
import { KorieFloatingRail, KorieDock } from '@/components/nav/KorieFloatingRail';
import {
  Code2,
  Terminal,
  Layers,
  Radio,
  Activity,
  FileCode2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  BookOpen,
  Cpu,
  BarChart3,
  Users,
  LifeBuoy,
  Settings,
  ChevronDown,
  X,
  Search,
  Database,
  MoreHorizontal,
  LogOut,
} from 'lucide-react';
import KorieLogo from '@/components/brand/KorieLogo';
import PortalFooter from '@/components/ui/PortalFooter';
import ShellAccount from '@/components/ui/ShellAccount';

/**
 * DeveloperShell — premium floating-rail workspace shell (spec-compliant).
 *
 * Desktop: KorieFloatingRail (sky tone) floats in the page gutter; the
 * content column carries the sticky workspace header (app selector,
 * environment pill, search, language, account) + main + portal footer.
 *
 * Mobile: KorieDock (Overview · API Docs · Sandbox · Logs · More) with a
 * full-section bottom-sheet "More" surface that also hosts the environment
 * switch, language switch and sign-out.
 */
export const DeveloperShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const {
    environment,
    setEnvironment,
    locale,
    setLocale,
    t,
    organization,
    activeApplication,
    applications,
    setActiveApplicationId,
    activeMember,
    isSearchOpen,
    setIsSearchOpen,
    incidents,
  } = useDeveloper();

  const { logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appDropdownOpen, setAppDropdownOpen] = useState(false);
  const [envWarningModal, setEnvWarningModal] = useState(false);
  const [pendingEnv, setPendingEnv] = useState<'SANDBOX' | 'PRODUCTION' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Lock body scroll while the More sheet is open.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const activeIncident = incidents.find(i => i.status !== 'RESOLVED');

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* noop */
    }
    await logout();
  };

  const navGroups = [
    {
      group: 'Overview',
      items: [{ href: '/developers/dashboard', label: t.nav.dashboard, icon: Activity, badge: 'LIVE' }],
    },
    {
      group: 'Discover & Build',
      items: [
        { href: '/developers/apis', label: t.nav.apis, icon: Database, badge: undefined },
        { href: '/developers/docs', label: t.nav.docs, icon: BookOpen, badge: undefined },
        { href: '/developers/explorer', label: t.nav.explorer, icon: Terminal, badge: undefined },
        { href: '/developers/sdks', label: t.nav.sdks, icon: FileCode2, badge: undefined },
      ],
    },
    {
      group: 'Sandbox & Testing',
      items: [
        { href: '/developers/sandbox', label: t.nav.sandbox, icon: Cpu, badge: undefined },
        { href: '/developers/testing', label: t.nav.testing, icon: CheckCircle2, badge: undefined },
      ],
    },
    {
      group: 'Integration & Security',
      items: [
        { href: '/developers/applications', label: t.nav.applications, icon: Layers, badge: undefined },
        { href: '/developers/credentials', label: t.nav.credentials, icon: Code2, badge: undefined },
        { href: '/developers/webhooks', label: t.nav.webhooks, icon: Radio, badge: undefined },
        { href: '/developers/events', label: t.nav.events, icon: Zap, badge: undefined },
      ],
    },
    {
      group: 'Telemetry & Health',
      items: [
        { href: '/developers/logs', label: t.nav.logs, icon: FileCode2, badge: undefined },
        { href: '/developers/errors', label: t.nav.errors, icon: ShieldCheck, badge: undefined },
        { href: '/developers/usage', label: t.nav.usage, icon: BarChart3, badge: undefined },
        { href: '/developers/status', label: t.nav.status, icon: Activity, badge: undefined },
        { href: '/developers/changelog', label: t.nav.changelog, icon: BookOpen, badge: undefined },
      ],
    },
    {
      group: 'Organization & Support',
      items: [
        { href: '/developers/team', label: t.nav.team, icon: Users, badge: undefined },
        { href: '/developers/support', label: t.nav.support, icon: LifeBuoy, badge: undefined },
        { href: '/developers/settings', label: t.nav.settings, icon: Settings, badge: undefined },
      ],
    },
  ];

  const railGroups = navGroups.map(g => ({
    title: g.group,
    items: g.items.map(it => ({
      label: it.label,
      href: it.href,
      icon: it.icon,
      badge: it.badge === 'ALERT' ? 'ALERT' : undefined,
      hot: it.badge === 'ALERT',
    })),
  }));

  /** Compact-mode core column: Settings gear lives in the rail utilities. */
  const CORE_HREFS = [
    '/developers/dashboard',
    '/developers/apis',
    '/developers/explorer',
    '/developers/sandbox',
    '/developers/testing',
    '/developers/applications',
    '/developers/credentials',
    '/developers/webhooks',
    '/developers/logs',
    '/developers/usage',
    '/developers/status',
  ];

  const dockItems = [
    { label: 'Overview', href: '/developers/dashboard', icon: Activity },
    { label: 'Docs', href: '/developers/apis', icon: BookOpen },
    { label: 'Sandbox', href: '/developers/sandbox', icon: Cpu },
    { label: 'Logs', href: '/developers/logs', icon: FileCode2 },
    { label: 'More', icon: MoreHorizontal, onClick: () => setMobileMenuOpen(true) },
  ];

  const handleEnvSwitchClick = (target: 'SANDBOX' | 'PRODUCTION') => {
    if (target === environment) return;
    if (target === 'PRODUCTION') {
      setPendingEnv('PRODUCTION');
      setEnvWarningModal(true);
    } else {
      setEnvironment('SANDBOX');
    }
  };

  const confirmProductionSwitch = () => {
    setEnvironment('PRODUCTION');
    setEnvWarningModal(false);
    setPendingEnv(null);
  };

  const envActiveClass = (env: 'SANDBOX' | 'PRODUCTION') =>
    environment === env
      ? env === 'SANDBOX'
        ? 'bg-[var(--brand-primary)] text-white shadow-sm'
        : 'bg-amber-500 text-white shadow-sm'
      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col font-sans antialiased">
      {/* Top banner — active incident notice */}
      {activeIncident && (
        <div className="bg-[var(--warning-soft)] border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--foreground)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0" />
            <span className="font-semibold">'Service Notice:'</span>
            <span>{activeIncident.title}</span>
          </div>
          <Link href="/developers/status" className="font-bold underline text-[var(--brand-primary)] hover:text-[var(--brand-secondary)]">
            View Status →
          </Link>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop: premium floating navigation rail */}
        <KorieFloatingRail
          tone="sky"
          word="KoriePay"
          role="DEV"
          settingsHref="/developers/settings"
          onLogout={handleLogout}
          storeKey="korie_developer_rail"
          groups={railGroups}
          primary={CORE_HREFS}
          context={
            <div className="space-y-2">
              {/* Active workspace */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                    Workspace
                  </span>
                  <span className="rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wide text-[var(--brand-primary)]">
                    {organization.tier}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] font-bold text-[var(--foreground)]">
                  {organization.name}
                </p>
                <p className="truncate font-mono text-[9px] text-[var(--foreground-muted)]">
                  {organization.jurisdiction}
                </p>
              </div>
              {/* Active application + environment */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                    Application
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide ${
                      activeApplication.environment === 'PRODUCTION'
                        ? 'bg-amber-500/15 text-amber-600'
                        : 'bg-emerald-500/15 text-[var(--brand-primary)]'
                    }`}
                  >
                    {activeApplication.environment}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] font-bold text-[var(--foreground)]">
                  {activeApplication.name}
                </p>
                <p className="truncate font-mono text-[9px] text-[var(--foreground-muted)]">
                  {activeApplication.id}
                </p>
              </div>
            </div>
          }
          footer={
            <Link
              href="/developers/settings"
              className="flex items-center justify-between gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 transition-colors hover:border-[var(--brand-border)]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 shrink-0 rounded-lg bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center text-[11px] font-bold">
                  {activeMember.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-[var(--foreground)] truncate">
                    {activeMember.name.split(',')[0]}
                  </span>
                  <span className="block text-[9px] font-mono uppercase tracking-wide text-[var(--brand-primary)] truncate">
                    {activeMember.role}
                  </span>
                </span>
              </span>
            </Link>
          }
        />

        {/* Right workspace column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Workspace header */}
          <header className="sticky top-0 z-40 bg-[var(--nav-bg)]/85 backdrop-blur-md border-b border-[var(--border)]">
            <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
              {/* Brand (mobile only — the rail carries the brand on desktop) */}
              <Link href="/developers" className="lg:hidden flex items-center gap-2.5 group shrink-0">
                <KorieLogo variant="icon" height={28} linkHref="" />
                <span className="flex flex-col leading-tight">
                  <span className="font-black tracking-tight text-[var(--foreground)] text-sm flex items-center gap-1.5">
                    KoriePay
                    <span className="text-[var(--brand-primary)] font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-soft)] border border-[var(--brand-border)]">
                      DEV
                    </span>
                  </span>
                  <span className="text-[9px] font-mono text-[var(--foreground-muted)]">Platform & API Hub</span>
                </span>
              </Link>

              {/* Application selector (desktop) */}
              <div className="relative hidden md:block min-w-0">
                <button
                  onClick={() => setAppDropdownOpen(!appDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                  <span className="font-semibold truncate max-w-[150px]">{activeApplication.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--foreground-muted)] shrink-0" />
                </button>

                {appDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-2 z-50">
                    <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase px-3 py-1">
                      Select Application
                    </div>
                    {applications.map(app => (
                      <button
                        key={app.id}
                        onClick={() => {
                          setActiveApplicationId(app.id);
                          setAppDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          app.id === activeApplication.id
                            ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold'
                            : 'text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'
                        }`}
                      >
                        <div className="truncate min-w-0">
                          <div className="truncate">{app.name}</div>
                          <div className="text-[10px] text-[var(--foreground-muted)] font-mono">{app.id}</div>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                            app.environment === 'PRODUCTION'
                              ? 'bg-amber-500/15 text-amber-600'
                              : 'bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                          }`}
                        >
                          {app.environment}
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-[var(--border)] mt-1 pt-1">
                      <Link
                        href="/developers/applications"
                        onClick={() => setAppDropdownOpen(false)}
                        className="block text-center py-1.5 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] font-semibold"
                      >
                        + Manage Applications
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Right toolbar */}
              <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                {/* Environment switcher pill */}
                <div className="flex items-center p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-inner" role="group" aria-label="Environment">
                  <button
                    onClick={() => handleEnvSwitchClick('SANDBOX')}
                    aria-pressed={environment === 'SANDBOX'}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${envActiveClass('SANDBOX')}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${environment === 'SANDBOX' ? 'bg-white' : 'bg-emerald-500'}`} />
                    SANDBOX
                  </button>
                  <button
                    onClick={() => handleEnvSwitchClick('PRODUCTION')}
                    aria-pressed={environment === 'PRODUCTION'}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${envActiveClass('PRODUCTION')}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${environment === 'PRODUCTION' ? 'bg-white' : 'bg-amber-400'}`} />
                    <span className="hidden min-[400px]:inline">PRODUCTION</span>
                  </button>
                </div>

                {/* Quick search (⌘K) */}
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Search APIs & Docs...</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] text-[10px] font-mono text-[var(--foreground-muted)] border border-[var(--border)]">⌘K</kbd>
                </button>

                {/* Language switcher (desktop) */}
                <div className="hidden sm:flex items-center rounded-lg bg-[var(--surface)] border border-[var(--border)] p-0.5 text-[11px] font-mono">
                  {(['en', 'ha', 'fr'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setLocale(lang)}
                      className={`px-1.5 py-0.5 rounded uppercase font-bold transition-colors ${
                        locale === lang
                          ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                <ShellAccount className="hidden sm:flex" />
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6" id="main-content">
            <div className="mx-auto w-full max-w-[1600px]">
              {children}
            </div>
          </main>

          <PortalFooter portal="developer" />
        </div>
      </div>

      {/* Mobile: More sheet (from dock) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="All developer sections">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 w-full h-full bg-slate-950/50 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-2.5 bottom-2.5 max-h-[82dvh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            {/* Sheet header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 rounded-t-3xl">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--foreground)] truncate">Developer Portal</p>
                <p className="text-[10px] font-mono text-[var(--foreground-muted)] truncate">
                  {organization.name} · {activeApplication.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Environment + language quick row */}
            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              <div className="flex items-center p-1 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]" role="group" aria-label="Environment">
                <button
                  onClick={() => handleEnvSwitchClick('SANDBOX')}
                  aria-pressed={environment === 'SANDBOX'}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${envActiveClass('SANDBOX')}`}
                >
                  SANDBOX
                </button>
                <button
                  onClick={() => handleEnvSwitchClick('PRODUCTION')}
                  aria-pressed={environment === 'PRODUCTION'}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${envActiveClass('PRODUCTION')}`}
                >
                  PRODUCTION
                </button>
              </div>
              <div className="flex items-center rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] p-0.5 text-[11px] font-mono">
                {(['en', 'ha', 'fr'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLocale(lang)}
                    className={`px-2 py-0.5 rounded uppercase font-bold transition-colors ${
                      locale === lang
                        ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                        : 'text-[var(--foreground-muted)]'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Sections */}
            <div className="p-3 space-y-4">
              {navGroups.map(grp => (
                <div key={grp.group}>
                  <p className="px-2 pb-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    {grp.group}
                  </p>
                  <div className="space-y-0.5">
                    {grp.items.map(item => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                              : 'text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? '' : 'text-[var(--foreground-muted)]'}`} />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.badge === 'ALERT' && (
                            <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-rose-500">
                              ALERT
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

      {/* Mobile floating dock */}
      <KorieDock ariaLabel="Developer navigation" items={dockItems} />

      {/* Production switch warning modal */}
      {envWarningModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" role="alertdialog" aria-modal="true" aria-label="Production access warning">
          <div className="w-full max-w-md bg-[var(--surface)] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--foreground)] text-base">Switch to Production Mode</h3>
                <p className="text-xs text-[var(--foreground-muted)]">Live Financial Settlement Environment</p>
              </div>
            </div>

            <p className="text-xs text-[var(--foreground)]/80 leading-relaxed">
              You are switching to <strong className="text-amber-500">LIVE PRODUCTION</strong>. API calls will move real
              funds through Providus Bank Nigeria and Coris Bank Niger Republic settlement accounts. Never use test
              references in this mode.
            </p>

            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-[11px] font-mono text-amber-600">
              Enforcing live HMAC-SHA256 signatures &amp; dual-control financial authorization.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setEnvWarningModal(false);
                  setPendingEnv(null);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--border)]"
              >
                Stay in Sandbox
              </button>
              <button
                onClick={confirmProductionSwitch}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                Confirm Production Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick search modal (⌘K) */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)]">
              <Search className="w-4 h-4 text-[var(--foreground-muted)]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search APIs, endpoints, error codes, guides..."
                className="w-full bg-transparent text-xs sm:text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-lg bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                aria-label="Close search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
              <div className="text-[10px] font-mono uppercase text-[var(--foreground-muted)] px-2 font-bold">
                Quick Navigation
              </div>
              <Link
                href="/developers/apis"
                onClick={() => setIsSearchOpen(false)}
                className="block p-2.5 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--brand-soft)] border border-[var(--border)] text-[var(--foreground)] transition-colors"
              >
                <div className="font-bold flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  <span>API Marketplace & Catalog</span>
                </div>
                <div className="text-[11px] text-[var(--foreground-muted)]">
                  Payments, Wallets, Agency, Merchant, KYC, FX corridor
                </div>
              </Link>
              <Link
                href="/developers/explorer"
                onClick={() => setIsSearchOpen(false)}
                className="block p-2.5 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--brand-soft)] border border-[var(--border)] text-[var(--foreground)] transition-colors"
              >
                <div className="font-bold flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[var(--brand-secondary)]" />
                  <span>Interactive API Explorer</span>
                </div>
                <div className="text-[11px] text-[var(--foreground-muted)]">
                  Send live sandbox requests with instant JSON response preview
                </div>
              </Link>
              <Link
                href="/developers/webhooks"
                onClick={() => setIsSearchOpen(false)}
                className="block p-2.5 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--brand-soft)] border border-[var(--border)] text-[var(--foreground)] transition-colors"
              >
                <div className="font-bold flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-[var(--brand-secondary)]" />
                  <span>Webhook Manager & Replay</span>
                </div>
                <div className="text-[11px] text-[var(--foreground-muted)]">
                  Signature verifier and payload history
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperShell;
