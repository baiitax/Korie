'use client';

/**
 * Support Operations console — chrome aligned to the Super Admin console
 * (master spec v1): shared ConsoleShell (floating collapsible rail + glass
 * top bar + mobile dock/More sheet), same rail behaviour, same top-bar design
 * and the same ⌘K command palette.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSupport } from './SupportContext';
import {
  AlertTriangle, Award, BarChart3, BookOpen, CheckCircle2, ChevronDown, GraduationCap, History,
  Inbox, Layers, ListFilter, Search, Settings, SlidersHorizontal, TrendingUp, Users, Zap,
} from 'lucide-react';
import { SupportLocale } from '@/locales/support';
import { useAuth } from '@/components/auth/AuthContext';
import ConsoleShell from '@/components/console/ConsoleShell';
import ConsoleTopBar from '@/components/console/ConsoleTopBar';
import ConsoleMobileNav from '@/components/console/ConsoleMobileNav';
import ConsoleCommandPalette from '@/components/console/ConsoleCommandPalette';

export const SupportShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    locale,
    setLocale,
    selectedJurisdiction,
    setSelectedJurisdiction,
    currentOfficer,
    setCurrentOfficer,
    officers,
    stats,
    tickets,
  } = useSupport();

  const [officerOpen, setOfficerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const navGroups = useMemo(
    () => [
      {
        group: 'COMMAND & INBOX',
        items: [
          { name: 'Dashboard', href: '/support', icon: BarChart3, badge: null as number | string | null, alert: false },
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
    ],
    [stats],
  );

  const railGroups = navGroups.map((grp) => ({
    title: grp.group,
    items: grp.items
      .filter((it) => typeof it.badge !== 'string' || /^\+?\d+$/.test(it.badge))
      .map((it) => ({
        label: it.name,
        href: it.href,
        icon: it.icon,
        badge:
          it.badge != null && (typeof it.badge === 'number' || /^\+?\d+$/.test(String(it.badge)))
            ? it.badge
            : undefined,
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

  const dockItems = [
    { label: 'Overview', href: '/support', icon: BarChart3 },
    { label: 'Inbox', href: '/support/inbox', icon: Inbox },
    { label: 'My Queue', href: '/support/my-queue', icon: CheckCircle2 },
    { label: 'Tickets', href: '/support/tickets', icon: ListFilter },
  ];

  const OPEN_TICKET_STATUSES = ['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL_TEAM', 'ESCALATED'];
  const openTickets = tickets.filter((tk) => OPEN_TICKET_STATUSES.includes(tk.status));

  const paletteGroups = [
    {
      title: 'Support destinations',
      items: navGroups.flatMap((g) => g.items.map((it) => ({ label: it.name, sub: it.href, href: it.href }))),
    },
    {
      title: 'Tickets (live queue)',
      items: openTickets.slice(0, 12).map((tk) => ({
        label: `${tk.ticketNumber || tk.id} · ${tk.subject}`,
        sub: `${tk.status} · ${tk.priority} · ${tk.customerName || '—'}`,
        href: `/support/tickets/${tk.id}`,
      })),
    },
  ];

  return (
    <>
      <ConsoleShell
        rail={{
          tone: 'sky',
          word: 'KoriePay',
          role: 'SUPPORT OPS',
          storeKey: 'korie_support_rail',
          settingsHref: '/support/settings',
          onLogout: handleLogout,
          groups: railGroups,
          primary: [
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
          ],
          context: (
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
          ),
          footer: (
            <div className="flex items-center justify-between gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5">
              <Link href="/support/team" className="flex items-center gap-2 min-w-0">
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
              </Link>
              <Link href="/" className="shrink-0 text-[9px] font-mono text-[var(--brand-primary)] hover:underline">
                Site ↗
              </Link>
            </div>
          ),
        }}
        topbar={
          <ConsoleTopBar
            searchPlaceholder="Search tickets, customers, incidents (e.g. TKT-2026)..."
            onSearch={() => setPaletteOpen(true)}
            markets={{
              value: selectedJurisdiction,
              onChange: (v) => setSelectedJurisdiction(v as typeof selectedJurisdiction),
              options: [
                { id: 'ALL', label: '🌍 All Regions', tone: 'global' },
                { id: 'NG', label: '🇳🇬 Nigeria (NGN)', tone: 'ng' },
                { id: 'NE', label: '🇳🇪 Niger (XOF)', tone: 'ne' },
              ],
            }}
            statusChip={
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border bg-sky-500/10 text-sky-300 border-sky-500/30">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <span>{stats.totalOpen} OPEN</span>
              </span>
            }
            extras={
              <>
                {/* Language switcher — same segmented control as the admin market switcher */}
                <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold font-mono">
                  {(['en', 'ha', 'fr'] as SupportLocale[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLocale(lang)}
                      className={`px-2.5 py-1.5 rounded-lg uppercase transition-all ${
                        locale === lang ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                {/* Simulated RBAC officer — admin-style control */}
                <div className="relative hidden lg:block">
                  <button
                    onClick={() => setOfficerOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                    title="Simulate officer role & permissions"
                  >
                    <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-300 flex items-center justify-center text-[9px] font-bold border border-blue-500/30">
                      {currentOfficer.fullName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate">{currentOfficer.role.replace(/_/g, ' ')}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {officerOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-[#0d1527] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl z-50 text-xs">
                      <div className="pb-2 mb-2 border-b border-white/10 font-bold text-white">
                        Simulate Officer Role &amp; Permissions
                      </div>
                      <div className="space-y-1 max-h-72 overflow-y-auto">
                        {officers.map((off) => (
                          <button
                            key={off.id}
                            onClick={() => {
                              setCurrentOfficer(off);
                              setOfficerOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-lg transition flex items-center justify-between ${
                              currentOfficer.id === off.id
                                ? 'bg-sky-950/60 text-sky-300 border border-sky-800/60'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span>
                              <span className="block font-semibold text-[11px]">{off.fullName}</span>
                              <span className="block text-[10px] text-slate-400">
                                {off.role.replace(/_/g, ' ')} • {off.jurisdiction}
                              </span>
                            </span>
                            {currentOfficer.id === off.id && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            }
            notifications={{
              count: stats.slaBreached + stats.activeIncidentsCount,
              title: 'Service Desk Alerts',
              emptyText: 'No SLA breaches or active incidents.',
              items: [
                ...(stats.slaBreached > 0
                  ? [{ id: 'sla', title: `${stats.slaBreached} ticket(s) past SLA`, body: 'Escalate or reassign from My Queue.', tone: 'rose' as const }]
                  : []),
                ...(stats.activeIncidentsCount > 0
                  ? [{ id: 'inc', title: `${stats.activeIncidentsCount} active incident(s)`, body: 'Check System Incidents for impacted rails.', tone: 'amber' as const }]
                  : []),
              ],
            }}
            user={{ name: currentOfficer.fullName, role: currentOfficer.role.replace(/_/g, ' ') }}
            onLogout={handleLogout}
          />
        }
        mobileNav={
          <ConsoleMobileNav
            dockItems={dockItems}
            groups={navGroups.map((g) => ({
              title: g.group,
              items: g.items.map((it) => ({
                label: it.name,
                href: it.href,
                icon: it.icon,
                badge: it.badge ?? undefined,
                hot: it.alert,
              })),
            }))}
            title="All Support Sections"
            subtitle="SUPPORT OPS · WORKFORCE AUTOMATION"
            onLogout={handleLogout}
          />
        }
        mainClassName="flex-1 p-4 lg:p-8 space-y-6 pb-28 lg:pb-8"
        overlays={
          <ConsoleCommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            placeholder="Jump to a support section or ticket..."
            groups={paletteGroups}
            emptyText="No support destination matches"
          />
        }
      >
        {children}
      </ConsoleShell>
    </>
  );
};

export default SupportShell;
