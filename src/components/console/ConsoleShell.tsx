'use client';

/**
 * KoriePay — shared console shell (admin layout, master spec v1).
 *
 * The Super Admin console defines the layout language for every operations
 * portal: a floating, collapsible icon-first navigation rail in the page
 * gutter, a glass top bar over the workspace column, and the mobile floating
 * dock + "More" sheet. Support, Compliance and Merchant now render through
 * this same shell so their chrome is identical to /admin.
 */
import React from 'react';
import { KorieFloatingRail, type KrGroup, type KrTone } from '@/components/nav/KorieFloatingRail';

export interface ConsoleRailConfig {
  groups: KrGroup[];
  /** hrefs rendered in the collapsed icon rail */
  primary: string[];
  storeKey: string;
  word?: string;
  role?: string;
  tone?: KrTone;
  context?: React.ReactNode;
  footer?: React.ReactNode;
  settingsHref?: string;
  onLogout?: () => void;
}

interface ConsoleShellProps {
  rail: ConsoleRailConfig;
  topbar: React.ReactNode;
  mobileNav: React.ReactNode;
  children: React.ReactNode;
  /** main column classes; defaults to the admin workspace padding */
  mainClassName?: string;
  /** extra full-screen layers (command palette, toasts, modals) */
  overlays?: React.ReactNode;
}

export const ConsoleShell: React.FC<ConsoleShellProps> = ({
  rail,
  topbar,
  mobileNav,
  children,
  mainClassName = 'flex-1 pb-28 lg:pb-10',
  overlays,
}) => {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-row font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Desktop: premium floating navigation rail (identical collapse spec) */}
      <KorieFloatingRail
        tone={rail.tone || 'emerald'}
        word={rail.word || 'KoriePay'}
        role={rail.role}
        settingsHref={rail.settingsHref}
        onLogout={rail.onLogout}
        storeKey={rail.storeKey}
        groups={rail.groups}
        primary={rail.primary}
        context={rail.context}
        footer={rail.footer}
      />

      {/* Right: topbar workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {topbar}
        <main className={mainClassName}>{children}</main>
      </div>

      {/* Mobile: floating dock + full More sheet */}
      {mobileNav}

      {overlays}
    </div>
  );
};

export default ConsoleShell;
