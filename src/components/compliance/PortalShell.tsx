'use client';

/**
 * The compliance console frame: rail, header, mobile bar, and nothing else.
 *
 * What this replaced: a dark-only shell whose sidebar printed "NFIU GoAML:
 * CONNECTED / Coris Bank NE: ONLINE" as static text, whose bell and search
 * icons had no handlers, and whose header let anyone click into the "MLRO"
 * seat under a label that read *(RBAC Simulation)*. A console that decorates
 * with fake connectivity and fake authority teaches the wrong instincts, so
 * every control here either does something real or says it cannot.
 *
 * The platform strip at the foot of the rail is the honest version of that old
 * block: it reads `/api/health` and reports what the circuit breakers actually
 * say, including "not reported" when the answer is missing.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Globe,
  LayoutGrid,
  LogOut,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import KorieLogo from '@/components/brand/KorieLogo';
import PortalFooter from '@/components/ui/PortalFooter';
import ThemeSelector from '@/components/customer/ui/ThemeSelector';
import { useLanguage } from '@/components/ui/LanguageContext';
import { useTheme } from '@/components/ui/ThemeContext';
import { useAuth } from '@/components/auth/AuthContext';
import { useComplianceResource } from '@/services/compliance/hooks';
import { useCompliancePortal } from './CompliancePortal';
import {
  COMPLIANCE_MOBILE_TABS,
  COMPLIANCE_NAV,
  type ComplianceNavItem,
} from './nav';
import { Chip, Provenance } from './ui/Primitives';
import { NotificationCenter } from './NotificationCenter';

const JURISDICTIONS = [
  { value: 'ALL', key: 'all' },
  { value: 'NG', key: 'nigeria' },
  { value: 'NE', key: 'niger' },
] as const;

const LANGUAGES = [
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'fr', label: 'Français', short: 'FR' },
  { value: 'ha', label: 'Hausa', short: 'HA' },
] as const;

export const CompliancePortalShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    t,
    jurisdiction,
    setJurisdiction,
    summary,
    summaryLoading,
    demoEnabled,
    mode,
    setSearchOpen,
    session,
    sessionLoading,
  } = useCompliancePortal();
  const { language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const { logout } = useAuth();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // System health is a rail-level fact, so it is read once here, not per page.
  const { resource: healthResource } = useComplianceResource('systemHealth');
  const health = healthResource.data[0];

  useEffect(() => {
    setMoreOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [moreOpen]);

  const counts = useMemo<Record<string, number | undefined>>(
    () => ({
      alerts: summary?.openAlerts,
      cases: summary?.openCases,
      tasks: summary?.taskCount,
      approvals: summary?.pendingApprovals,
      obligations: summary?.overdueObligations,
      escalations: undefined,
      sanctions: summary?.sanctionsPotentialMatches,
    }),
    [summary],
  );

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* the local session is cleared either way */
    }
    await logout();
  };

  const isActive = (href: string) => (href === '/compliance' ? pathname === href : pathname.startsWith(href));

  const badgeFor = (item: ComplianceNavItem) => {
    if (!item.badge) return null;
    const value = counts[item.badge];
    if (summaryLoading && value === undefined) {
      return <span className="cmp-skeleton-line h-[14px] w-[18px] flex-none" aria-hidden="true" />;
    }
    if (value === undefined) {
      return item.badge === 'escalations' ? <span className="cmp-rail__soon">{t('compliance.shell.notConnected')}</span> : null;
    }
    if (!value) return null;
    return (
      <span className="cmp-rail__count" data-tone={item.critical ? 'critical' : undefined}>
        {value > 999 ? '999+' : value}
      </span>
    );
  };

  const navLink = (item: ComplianceNavItem, onNav?: () => void) => (
    <Link
      key={item.href + item.key}
      href={item.href}
      onClick={onNav}
      aria-current={isActive(item.href) ? 'page' : undefined}
      className="cmp-rail__link"
      title={item.note === 'demo' ? t('compliance.shell.demoModuleHint') : undefined}
    >
      <item.icon aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{t(`compliance.nav.${item.label}`)}</span>
      {badgeFor(item)}
    </Link>
  );

  const platformLine = (() => {
    if (healthResource.status === 'unauthorized') return { text: t('compliance.shell.healthHidden'), tone: 'high' as const };
    if (!health) return { text: t('compliance.shell.healthUnknown'), tone: 'neutral' as const };
    const map = {
      OPERATIONAL: { text: t('compliance.shell.operational'), tone: 'clear' as const },
      DEGRADED: { text: t('compliance.shell.degraded'), tone: 'high' as const },
      SAFE_MODE: { text: t('compliance.shell.safeMode'), tone: 'critical' as const },
      CRITICAL: { text: t('compliance.shell.critical'), tone: 'critical' as const },
    };
    return map[health.platformStatus] ?? { text: t('compliance.shell.healthUnknown'), tone: 'neutral' as const };
  })();

  return (
    <div className="kp-compliance flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#cmp-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[var(--z-toast)] focus:rounded-lg focus:bg-[var(--surface)] focus:px-3 focus:py-2 focus:text-[13px] focus:font-bold focus:shadow-[var(--shadow-lg)]"
      >
        {t('compliance.shell.skip')}
      </a>

      <div className="flex min-h-screen flex-1">
        {/* ── Desktop rail ───────────────────────────────────────────────── */}
        <aside className="cmp-rail sticky top-0 hidden h-screen lg:flex" aria-label={t('compliance.shell.navAria')}>
          <div className="flex items-center gap-2.5 px-1 pb-1">
            <Link href="/compliance" className="flex min-h-[40px] items-center gap-2 rounded-[10px] px-1">
              <KorieLogo variant="compact" theme={theme === 'dark' ? 'dark' : 'light'} height={26} linkHref="" />
            </Link>
            <span className="cmp-chip flex-none" style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-primary)' }}>
              {t('compliance.shell.badge')}
            </span>
          </div>

          <nav className="flex-1 space-y-3" aria-label={t('compliance.shell.navAria')}>
            {COMPLIANCE_NAV.map((group) => (
              <div key={group.key} className="cmp-rail__group">
                <h2 className="cmp-rail__label">{t(`compliance.navGroup.${group.key}`)}</h2>
                <div className="space-y-0.5">{group.items.map((item) => navLink(item))}</div>
              </div>
            ))}
          </nav>

          <div className="space-y-1.5 rounded-[var(--cmp-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">
                {t('compliance.shell.platform')}
              </span>
              <Chip tone={platformLine.tone}>{platformLine.text}</Chip>
            </div>
            <Link
              href="/compliance/system-health"
              className="flex items-center justify-between gap-2 text-[11.5px] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              <span>
                {t('compliance.shell.providerRails')}{' '}
                <span className="tabular">
                  {health ? `${health.providers.filter((p) => p.status === 'CONNECTED').length}/${health.providers.length}` : '—'}
                </span>
              </span>
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Provenance
              resource={{
                source: demoEnabled ? (health ? 'live' : 'demo') : 'live',
                derived: false,
              }}
              detail={mode === 'demo' ? t('compliance.shell.demoBuildDetail') : t('compliance.shell.liveBuildDetail')}
            />
            <p className="text-[10.5px] leading-snug text-[var(--muted)]">
              {mode === 'demo' ? t('compliance.shell.demoBuild') : t('compliance.shell.liveBuild')}
            </p>
          </div>
        </aside>

        {/* ── Content column ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="cmp-header">
            <Link href="/compliance" className="flex min-h-[38px] items-center gap-2 rounded-[10px] px-1 lg:hidden" aria-label={t('compliance.shell.homeAria')}>
              <KorieLogo variant="icon" height={28} linkHref="" />
            </Link>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="cmp-btn cmp-btn--ghost hidden h-[38px] min-w-[220px] justify-start gap-2 border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 text-[12.5px] font-semibold text-[var(--foreground-muted)] lg:flex lg:max-w-[360px] lg:flex-1"
            >
              <Search className="h-4 w-4 flex-none" aria-hidden="true" />
              <span className="truncate">{t('compliance.shell.searchPlaceholder')}</span>
              <kbd className="ml-auto hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted)] xl:inline" translate="no">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="cmp-btn cmp-btn--icon cmp-btn--ghost lg:hidden"
              aria-label={t('compliance.shell.searchAria')}
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              {/* Jurisdiction scopes the whole portal — badges included — so a
                  counter and a table can never disagree. */}
              <div
                className="hidden items-center gap-0.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-0.5 md:flex"
                role="group"
                aria-label={t('compliance.shell.jurisdictionAria')}
              >
                <Globe className="ml-1 mr-0.5 h-3.5 w-3.5 text-[var(--muted)]" aria-hidden="true" />
                {JURISDICTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setJurisdiction(option.value)}
                    aria-pressed={jurisdiction === option.value}
                    className={`min-h-[30px] rounded-[8px] px-2 text-[11.5px] font-bold transition-colors ${
                      jurisdiction === option.value
                        ? 'bg-[var(--surface)] text-[var(--brand-primary)] shadow-[var(--shadow-xs)]'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {t(`compliance.jurisdiction.${option.key}`)}
                  </button>
                ))}
              </div>

              <NotificationCenter />

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  className="cmp-btn h-[38px] gap-2 px-1.5"
                  aria-label={t('compliance.shell.profileAria')}
                >
                  <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-[var(--brand-soft)] text-[10.5px] font-extrabold text-[var(--brand-primary)]">
                    {(session?.displayName ?? '').slice(0, 2).toUpperCase() || '··'}
                  </span>
                  <span className="hidden min-w-0 text-left leading-tight xl:block">
                    <span className="block max-w-[150px] truncate text-[12px] font-bold">
                      {sessionLoading ? t('compliance.shell.loadingSession') : session?.displayName ?? t('compliance.shell.officerFallback')}
                    </span>
                    <span className="block text-[10px] font-semibold text-[var(--foreground-muted)]">
                      {session?.roles?.[0]?.replace(/_/g, ' ') ?? t('compliance.shell.roleUnknown')}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden="true" />
                </button>

                {profileOpen ? (
                  <div className="cmp-menu w-[min(320px,calc(100vw-24px))]" role="menu" aria-label={t('compliance.shell.profileAria')}>
                    <div className="px-2.5 pb-2 pt-1.5">
                      <p className="text-[13px] font-bold text-[var(--foreground)]">
                        {sessionLoading ? t('compliance.shell.loadingSession') : session?.displayName ?? t('compliance.shell.officerFallback')}
                      </p>
                      <p className="text-[11.5px] text-[var(--foreground-muted)]">{session?.email ?? t('compliance.shell.emailHidden')}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(session?.roles ?? []).slice(0, 3).map((role) => (
                          <Chip key={role}>{role.replace(/_/g, ' ')}</Chip>
                        ))}
                        {session?.department ? <Chip>{session.department}</Chip> : null}
                        {session?.assuranceLevel ? <Chip tone={session.assuranceLevel === 'AAL3' ? 'clear' : 'medium'}>{session.assuranceLevel}</Chip> : null}
                        {session?.mfaEnforced === undefined ? null : (
                          <Chip tone={session.mfaEnforced ? 'clear' : 'high'}>{session.mfaEnforced ? t('compliance.shell.mfaOn') : t('compliance.shell.mfaOff')}</Chip>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] leading-snug text-[var(--muted)]">
                        {session
                          ? t('compliance.shell.sessionFoot', {
                              sessions: session.activeSessions ?? 0,
                              trust: session.deviceTrust ?? t('compliance.shell.notReported'),
                            })
                          : t('compliance.shell.sessionUnavailable')}
                      </p>
                      {!sessionLoading && session?.unavailableReason ? (
                        <p className="mt-1 text-[10.5px] text-[var(--muted)]" title={session.unavailableReason}>
                          {t('compliance.shell.sessionReason')}
                        </p>
                      ) : null}
                    </div>

                    <div className="border-t border-[var(--border)] px-2 py-2">
                      <p className="cmp-menu__label">{t('compliance.shell.appearance')}</p>
                      <ThemeSelector t={t} variant="sheet" />
                    </div>

                    <div className="border-t border-[var(--border)] px-2 py-2">
                      <p className="cmp-menu__label">{t('compliance.shell.language')}</p>
                      <div className="flex gap-1">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.value}
                            type="button"
                            role="menuitemradio"
                            aria-checked={language === lang.value}
                            onClick={() => setLanguage(lang.value)}
                            className="cmp-btn flex-1"
                          >
                            {lang.short}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] px-2 py-2">
                      <p className="cmp-menu__label">{t('compliance.shell.jurisdictionAria')}</p>
                      <div className="flex flex-wrap gap-1 md:hidden">
                        {JURISDICTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setJurisdiction(option.value)}
                            className="cmp-btn flex-1"
                            aria-pressed={jurisdiction === option.value}
                          >
                            {t(`compliance.jurisdiction.${option.key}`)}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--muted)] md:hidden">{t('compliance.shell.jurisdictionMobileNote')}</p>
                    </div>

                    <div className="border-t border-[var(--border)] pt-1.5">
                      <Link href="/compliance/settings" className="cmp-menu__item" role="menuitem">
                        <LayoutGrid className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                        {t('compliance.shell.settings')}
                      </Link>
                      <button type="button" role="menuitem" className="cmp-menu__item w-full" onClick={signOut}>
                        <LogOut className="h-4 w-4 text-[var(--sev-critical)]" aria-hidden="true" />
                        <span className="text-[var(--sev-critical)]">{t('compliance.shell.signOut')}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main id="cmp-main" className="min-w-0 flex-1 px-3 pb-24 pt-4 lg:px-6 lg:pb-10 lg:pt-6">
            <div className="cmp-page">{children}</div>
          </main>

          <PortalFooter portal="compliance" supportHref="/support" />
        </div>
      </div>

      {/* ── Mobile bar ─────────────────────────────────────────────────── */}
      <nav className="cmp-mobile-nav lg:hidden" aria-label={t('compliance.shell.mobileNavAria')}>
        {COMPLIANCE_MOBILE_TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className="cmp-mobile-nav__item" aria-current={isActive(tab.href) ? 'page' : undefined}>
            <tab.icon aria-hidden="true" />
            <span className="truncate">{t(`compliance.nav.${tab.label}`)}</span>
            {tab.key === 'alerts' && (counts.alerts ?? 0) > 0 ? (
              <span
                className="absolute right-2 top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full px-1 text-[9.5px] font-extrabold tabular text-white"
                style={{ background: 'var(--sev-critical)' }}
                aria-hidden="true"
              >
                {counts.alerts}
              </span>
            ) : null}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="cmp-mobile-nav__item"
          aria-expanded={moreOpen}
          aria-label={t('compliance.shell.more')}
        >
          <MoreHorizontal aria-hidden="true" />
          <span>{t('compliance.shell.more')}</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-[var(--z-sheet)] lg:hidden" role="presentation">
          <div className="cmp-scrim" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="cmp-sheet absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto p-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-bold">{t('compliance.shell.moreTitle')}</h2>
              <button type="button" className="cmp-btn cmp-btn--icon cmp-btn--ghost" onClick={() => setMoreOpen(false)} aria-label={t('compliance.shell.close')}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2 space-y-3">
              {COMPLIANCE_NAV.map((group) => (
                <div key={`more-${group.key}`}>
                  <p className="cmp-rail__label">{t(`compliance.navGroup.${group.key}`)}</p>
                  <div className="space-y-0.5">{group.items.map((item) => navLink(item, () => setMoreOpen(false)))}</div>
                </div>
              ))}
              <div className="rounded-[var(--cmp-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                <p className="cmp-menu__label">{t('compliance.shell.appearance')}</p>
                <ThemeSelector t={t} variant="sheet" />
                <p className="cmp-menu__label mt-2">{t('compliance.shell.jurisdictionAria')}</p>
                <div className="flex flex-wrap gap-1">
                  {JURISDICTIONS.map((option) => (
                    <button
                      key={`more-${option.value}`}
                      type="button"
                      onClick={() => setJurisdiction(option.value)}
                      className="cmp-btn flex-1"
                      aria-pressed={jurisdiction === option.value}
                    >
                      {t(`compliance.jurisdiction.${option.key}`)}
                    </button>
                  ))}
                </div>
                <p className="cmp-menu__label mt-2">{t('compliance.shell.language')}</p>
                <div className="flex gap-1">
                  {LANGUAGES.map((lang) => (
                    <button key={`lang-${lang.value}`} type="button" onClick={() => setLanguage(lang.value)} className="cmp-btn flex-1">
                      {lang.short}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className="cmp-btn w-full" onClick={signOut}>
                <LogOut className="h-4 w-4 text-[var(--sev-critical)]" aria-hidden="true" />
                <span className="text-[var(--sev-critical)]">{t('compliance.shell.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CompliancePortalShell;
