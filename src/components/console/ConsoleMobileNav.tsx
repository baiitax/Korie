'use client';

/**
 * KoriePay — shared mobile console navigation (admin spec).
 * Floating dock + full "More" bottom sheet, identical across Admin,
 * Compliance, Support and Merchant. Sheet groups come from the portal's own
 * navigation model, so every destination stays reachable on a phone.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, MoreHorizontal, X } from 'lucide-react';
import { KorieDock, type KrDockItem, type KrIcon } from '@/components/nav/KorieFloatingRail';

export interface ConsoleSheetGroup {
  title: string;
  items: { label: string; href: string; icon: KrIcon; badge?: string | number; hot?: boolean }[];
}

interface ConsoleMobileNavProps {
  dockItems: KrDockItem[];
  groups: ConsoleSheetGroup[];
  title: string;
  subtitle: string;
  ariaLabel?: string;
  onLogout?: () => void;
  /** extra rows appended after the nav groups (theme/language switches, …) */
  extra?: React.ReactNode;
}

export const ConsoleMobileNav: React.FC<ConsoleMobileNavProps> = ({
  dockItems,
  groups,
  title,
  subtitle,
  ariaLabel = 'Console navigation',
  onLogout,
  extra,
}) => {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname !== href && pathname.startsWith(href + '/'));

  const items: KrDockItem[] = [
    ...dockItems,
    { label: 'More', icon: MoreHorizontal, onClick: () => setMoreOpen(true) },
  ];

  return (
    <>
      <KorieDock ariaLabel={ariaLabel} items={items} />

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 w-full h-full bg-slate-950/50 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-3 bottom-3 max-h-[78dvh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 rounded-t-3xl">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--foreground)] truncate">{title}</p>
                <p className="text-[10px] font-mono text-[var(--foreground-muted)] truncate">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-4">
              {groups.map((grp) => (
                <div key={grp.title}>
                  <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                    {grp.title}
                  </p>
                  <div className="space-y-0.5">
                    {grp.items.map((it) => {
                      const Icon = it.icon;
                      const active = isActive(it.href);
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                            active
                              ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--brand-border)]'
                              : 'text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] border border-transparent'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.3 : 1.9} />
                          <span className="flex-1 min-w-0 truncate">{it.label}</span>
                          {it.badge != null && (
                            <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]">
                              {it.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {extra}

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    void onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-transparent"
                >
                  <LogOut className="w-4 h-4" strokeWidth={2.1} /> Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConsoleMobileNav;
