'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSupport } from './SupportContext';
import { AlertTriangle, Award, BarChart3, Bell, BookOpen, CheckCircle2, ChevronDown, FileCheck2, Globe, GraduationCap, History, Inbox, Layers, LifeBuoy, ListFilter, Menu, MoreHorizontal, Radio, Search, Settings, SlidersHorizontal, Sparkles, TrendingUp, Users, X, Zap } from 'lucide-react';
import { SupportLocale } from '@/locales/support';
import ShellAccount from '@/components/ui/ShellAccount';
import { useAuth } from '@/components/auth/AuthContext';
import { KorieFloatingRail, KorieDock } from '@/components/nav/KorieFloatingRail';
import PortalFooter from '@/components/ui/PortalFooter';

export const SupportShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const {
    locale,
    setLocale,
    t,
    selectedJurisdiction,
    setSelectedJurisdiction,
    currentOfficer,
    setCurrentOfficer,
    officers,
    stats,
  } = useSupport();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [officerDropdownOpen, setOfficerDropdownOpen] = useState(false);

  interface NavSubItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string | null;
    alert?: boolean;
  }

  interface NavGroup {
    group: string;
    items: NavSubItem[];
  }

  const navItems: NavGroup[] = [
    {
      group: 'COMMAND & INBOX',
      items: [
        { name: 'Dashboard', href: '/support', icon: BarChart3, badge: null, alert: false },
        { name: 'Live Inbox', href: '/support/inbox', icon: Inbox, badge: stats.totalOpen, alert: false },
        { name: 'My Queue', href: '/support/my-queue', icon: CheckCircle2, badge: stats.assignedToMe, alert: false },
        { name: 'All Tickets', href: '/support/tickets', icon: ListFilter, badge: stats.unassigned ? `+${stats.unassigned}` : null, alert: false },
      ],
    },
    {
      group: 'INVESTIGATION & CONTEXT',
      items: [
        { name: 'Customer 360°', href: '/support/customers', icon: Users, badge: null, alert: false },
        { name: 'Transaction Investigation', href: '/support/transactions', icon: Search, badge: null, alert: false },
        { name: 'System Incidents', href: '/support/incidents', icon: AlertTriangle, badge: stats.activeIncidentsCount > 0 ? stats.activeIncidentsCount : null, alert: stats.activeIncidentsCount > 0 },
      ],
    },
    {
      group: 'AUTOMATION & PLAYBOOKS',
      items: [
        { name: 'Automation Rules', href: '/support/automation', icon: Zap, badge: stats.automationResolvedCount ? `${stats.automationResolvedCount} runs` : null, alert: false },
        { name: 'Guided Playbooks', href: '/support/playbooks', icon: Layers, badge: 'Step-by-Step', alert: false },
        { name: 'Knowledge Base', href: '/support/knowledge-base', icon: BookOpen, badge: null, alert: false },
      ],
    },
    {
      group: 'WORKFORCE & INTELLIGENCE',
      items: [
        { name: 'Training Academy', href: '/support/training', icon: GraduationCap, badge: 'Sandbox', alert: false },
        { name: 'Quality Assurance (QA)', href: '/support/qa', icon: Award, badge: null, alert: false },
        { name: 'Support Intelligence', href: '/support/analytics', icon: TrendingUp, badge: null, alert: false },
        { name: 'Capacity Planning', href: '/support/capacity', icon: SlidersHorizontal, badge: null, alert: false },
        { name: 'Team & RBAC', href: '/support/team', icon: Users, badge: null, alert: false },
        { name: 'Immutable Audit Log', href: '/support/audit', icon: History, badge: null, alert: false },
        { name: 'SLA Settings', href: '/support/settings', icon: Settings, badge: null, alert: false },
      ],
    },
  ];

  const railGroups = navItems.map((grp) => ({
    title: grp.group,
    items: grp.items
      .filter((it) => typeof it.badge !== 'string' || /^\+?\d+$/.test(it.badge))
      .map((it) => ({
        label: it.name,
        href: it.href,
        icon: it.icon,
        badge: it.badge != null && (typeof it.badge === 'number' || /^\+?\d+$/.test(String(it.badge))) ? it.badge : undefined,
        hot: it.alert === true,
      })),
  }));

  const { logout } = useAuth();
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* noop */
    }
    await logout();
  };

  const supportDockItems = [
    { label: 'Overview', href: '/support', icon: BarChart3 },
    { label: 'Inbox', href: '/support/inbox', icon: Inbox },
    { label: 'My Queue', href: '/support/my-queue', icon: CheckCircle2 },
    { label: 'Tickets', href: '/support/tickets', icon: ListFilter },
    { label: 'More', icon: MoreHorizontal, onClick: () => setMobileMenuOpen(true) },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface)] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-[var(--nav-bg)] backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/support" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-900/30 ring-1 ring-blue-400/40">
              <LifeBuoy className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-teal-400 transition-colors">
                  KORIEPAY
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  SUPPORT OPS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Workforce Automation & Service Intelligence Center
              </p>
            </div>
          </Link>
        </div>

        {/* Global Selectors */}
        <div className="flex items-center gap-3">
          {/* Jurisdiction Switcher */}
          <div className="hidden sm:flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setSelectedJurisdiction('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedJurisdiction === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌍 All Regions
            </button>
            <button
              onClick={() => setSelectedJurisdiction('NG')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                selectedJurisdiction === 'NG'
                  ? 'bg-emerald-950/80 text-emerald-300 shadow-sm border border-emerald-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🇳🇬</span> Nigeria (NGN)
            </button>
            <button
              onClick={() => setSelectedJurisdiction('NE')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                selectedJurisdiction === 'NE'
                  ? 'bg-amber-950/80 text-amber-300 shadow-sm border border-amber-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🇳🇪</span> Niger (XOF)
            </button>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
            {(['en', 'ha', 'fr'] as SupportLocale[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                className={`px-2 py-1 text-xs font-bold uppercase rounded-md transition-colors ${
                  locale === lang
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Active Officer / RBAC Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => setOfficerDropdownOpen(!officerDropdownOpen)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 hover:border-slate-700 transition"
            >
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
                {currentOfficer.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-slate-200 leading-tight">
                  {currentOfficer.fullName}
                </div>
                <div className="text-[10px] text-teal-400 font-mono">
                  {currentOfficer.role.replace(/_/g, ' ')}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {officerDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50">
                <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Simulate Officer Role & Permissions
                </div>
                <div className="space-y-1 mt-1">
                  {officers.map((off) => (
                    <button
                      key={off.id}
                      onClick={() => {
                        setCurrentOfficer(off);
                        setOfficerDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                        currentOfficer.id === off.id
                          ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{off.fullName}</div>
                        <div className="text-[10px] text-slate-400">
                          {off.role.replace(/_/g, ' ')} • {off.jurisdiction}
                        </div>
                      </div>
                      {currentOfficer.id === off.id && (
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day / Night + Sign out */}
            <ShellAccount className="hidden md:flex" />
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: premium floating navigation rail (console-inset variant) */}
        <KorieFloatingRail
          inset
          tone="sky"
          word="KoriePay"
          role="OPS"
          settingsHref="/support/settings"
          onLogout={handleLogout}
          storeKey="korie_support_rail"
          groups={railGroups}
          primary={[
            '/support',
            '/support/inbox',
            '/support/my-queue',
            '/support/tickets',
            '/support/customers',
            '/support/transactions',
            '/support/incidents',
            '/support/automation',
            '/support/knowledge-base',
            '/support/analytics',
            '/support/audit',
            '/support/team',
          ]}
          context={
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                Banking &amp; Clearing Rails
              </p>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--foreground-muted)]">Providus NIP (NG)</span>
                <span className="font-mono font-bold text-amber-500">DEGRADED</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--foreground-muted)]">Coris Bank (NE)</span>
                <span className="font-mono font-bold text-emerald-500">ONLINE</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--foreground-muted)]">Interswitch</span>
                <span className="font-mono font-bold text-emerald-500">ONLINE</span>
              </div>
            </div>
          }
          footer={
            <Link
              href="/support/team"
              className="flex items-center justify-between gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 transition-colors hover:border-[var(--brand-border)]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 shrink-0 rounded-lg bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center text-[11px] font-bold">
                  {currentOfficer.fullName.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-[var(--foreground)] truncate">
                    {currentOfficer.fullName}
                  </span>
                  <span className="block text-[9px] font-mono uppercase tracking-wide text-[var(--brand-primary)] truncate">
                    {currentOfficer.role.replace(/_/g, ' ')}
                  </span>
                </span>
              </span>
            </Link>
          }
        />

        {/* Mobile: full-screen operations menu (dock → More) */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[70] overflow-y-auto bg-[var(--nav-bg)] backdrop-blur-md">
            <div className="p-4 flex items-center justify-between border-b border-[var(--border)]">
              <span className="font-bold text-slate-200">Support Operations Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
<div className="p-4 space-y-6">
            {navItems.map((grp) => (
              <div key={grp.group} className="space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
                  {grp.group}
                </div>
                {grp.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/support' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/20 to-teal-600/10 text-teal-300 border border-teal-500/30 shadow-inner'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge !== null && item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.alert
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* Banking & Switch Node Status */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3">
                BANKING CLEARING RAILS
              </div>
              <div className="px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Providus NIP (NG):</span>
                  <span className="text-amber-400 font-mono text-[11px] font-semibold">DEGRADED (INC-01)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Coris Bank (NE):</span>
                  <span className="text-emerald-400 font-mono text-[11px] font-semibold">ONLINE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Interswitch Switch:</span>
                  <span className="text-emerald-400 font-mono text-[11px] font-semibold">ONLINE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        <KorieDock items={supportDockItems} />


        {/* Center Main Stage */}
        <main className="flex-1 overflow-y-auto bg-[var(--background)] p-4 lg:p-8 space-y-6">
          {children}
        </main>
          <PortalFooter portal="support" />
      </div>
    </div>
  );
};
