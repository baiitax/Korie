'use client';

/**
 * KoriePay — premium floating navigation rail (master spec v1).
 * Icon-first floating rounded card; expanded labeled mode is opt-in and
 * persisted per portal. Shared by every portal shell (admin, aggregator,
 * merchant, agent, customer, support) so the navigation design language is
 * identical across KoriePay dashboards.
 */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, LogOut, Settings } from 'lucide-react';

export type KrIcon = React.ElementType;

export interface KrItem {
  label: string;
  href: string;
  icon: KrIcon;
  badge?: string | number;
  /** render badge as an alert chip (rose) */
  hot?: boolean;
}

export interface KrGroup {
  title: string;
  items: KrItem[];
}

export type KrTone = 'emerald' | 'teal' | 'amber' | 'sky';

interface KrRailProps {
  groups: KrGroup[];
  /** hrefs rendered as icons in the compact rail */
  primary: string[];
  /** role chip text (e.g. SUPER ADMIN / MERCHANT TIER-2) */
  role?: string;
  tone?: KrTone;
  /** expanded-mode block above navigation (branch/node/context switchers) */
  context?: React.ReactNode;
  /** expanded-mode bottom card (officer / profile / settlement) */
  footer?: React.ReactNode;
  settingsHref?: string;
  logoutHref?: string;
  /** action logout (e.g. POST /api/auth/logout) — used when logoutHref is not a link */
  onLogout?: () => void;
  storeKey: string;
  word?: string;
  /** sits inside a full-height workspace (support console) instead of the page gutter */
  inset?: boolean;
}

const isActive = (pathname: string, href: string) =>
  pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

export const KorieFloatingRail: React.FC<KrRailProps> = ({
  groups,
  primary,
  role,
  tone = 'emerald',
  context,
  footer,
  settingsHref,
  logoutHref,
  onLogout,
  storeKey,
  word = 'KoriePay',
  inset,
}) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try { setOpen(localStorage.getItem(storeKey) === '1'); } catch { /* noop */ }
  }, [storeKey]);
  useEffect(() => {
    try { localStorage.setItem(storeKey, open ? '1' : '0'); } catch { /* noop */ }
  }, [open, storeKey]);

  const armTip = (e: React.SyntheticEvent<HTMLElement>, text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const rail = railRef.current;
      const el = e.currentTarget;
      if (!rail) return;
      const r = el.getBoundingClientRect();
      const rr = rail.getBoundingClientRect();
      setTip({ text, top: r.top + r.height / 2, left: rr.right + 12 });
    }, 260);
  };
  const clearTip = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setTip(null);
  };

  const primGroups = groups
    .map((g) => ({ title: g.title, items: g.items.filter((i) => primary.includes(i.href)) }))
    .filter((g) => g.items.length > 0);

  const tipProps = (text: string) => ({
    'aria-label': text,
    onMouseEnter: (e: React.SyntheticEvent<HTMLElement>) => armTip(e, text),
    onMouseLeave: clearTip,
    onFocus: (e: React.SyntheticEvent<HTMLElement>) => armTip(e, text),
    onBlur: clearTip,
  });

  return (
    <aside
      ref={railRef}
      aria-label="Primary navigation"
      className={`kr-rail kr-tone-${tone}${open ? ' kr-rail--open' : ''}${inset ? ' kr-rail--inset' : ''}`}
    >
      {open ? (
        /* ------------------------------------------------ expanded (labeled) */
        <div className="kr-h flex flex-col h-full w-full">
          <div className="kr-head flex items-center gap-2.5 pl-3 pr-2 pt-4 pb-2">
            <Link href="/" className="flex items-center gap-2 min-w-0 flex-1" aria-label="KoriePay home">
              <span className="kr-brand shrink-0">
                <img src="/brand/koriepay-icon-tight.png" alt="" className="w-6 h-6 rounded-[7px]" />
              </span>
              <span className="kr-word truncate">{word}</span>
            </Link>
            {role && <span className={`kr-chip kr-chip--${tone}`}>{role}</span>}
          </div>

          {context && <div className="kr-context px-3 pb-1.5 shrink-0">{context}</div>}

          <nav className="kr-nav flex-1 overflow-y-auto kpc-scroll px-2.5 py-1" aria-label="All modules">
            {groups.map((g) => (
              <div key={g.title || g.items[0]?.href} className="kr-navgroup">
                {g.title && <p className="kr-gtitle">{g.title}</p>}
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const active = isActive(pathname, it.href);
                  return (
                    <Link key={it.href} href={it.href} aria-current={active ? 'page' : undefined} className={`kr-row${active ? ' kr-row--on' : ''}`}>
                      <Icon className="kr-row-ico" strokeWidth={active ? 2.3 : 1.9} />
                      <span className="kr-label flex-1 min-w-0 truncate">{it.label}</span>
                      {!active && it.badge != null && <span className={`kr-chip-badge${it.hot ? ' kr-chip-badge--hot' : ''}`}>{it.badge}</span>}
                      {active && <ChevronsRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.6} />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {footer && <div className="kr-foot px-3 pt-2 pb-1 shrink-0">{footer}</div>}

          <div className="kr-util flex items-center gap-1 px-2.5 py-2 shrink-0">
            {settingsHref && (
              <Link href={settingsHref} {...tipProps('Settings')} className="kr-item" aria-label="Settings">
                <Settings className="w-5 h-5" strokeWidth={1.9} />
              </Link>
            )}
            {logoutHref && (
              <Link href={logoutHref} {...tipProps('Logout')} className="kr-item kr-item--danger" aria-label="Logout">
                <LogOut className="w-5 h-5" strokeWidth={1.9} />
              </Link>
            )}
            {!logoutHref && onLogout && (
              <button onClick={onLogout} {...tipProps('Logout')} className="kr-item kr-item--danger" aria-label="Logout">
                <LogOut className="w-5 h-5" strokeWidth={1.9} />
              </button>
            )}
            <button onClick={() => setOpen(false)} {...tipProps('Collapse')} className="kr-item ml-auto" aria-label="Collapse navigation">
              <ChevronsLeft className="w-5 h-5" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------ compact (icon-first) */
        <div className="kr-h flex flex-col items-center h-full w-full py-3">
          <Link href="/" aria-label="KoriePay home" className="kr-brand">
            <img src="/brand/koriepay-icon-tight.png" alt="" className="w-6 h-6 rounded-[7px]" />
          </Link>

          <nav className="kr-scroll flex-1 w-full overflow-y-auto px-2.5 mt-3" aria-label="Primary navigation" onScroll={clearTip}>
            {primGroups.map((g, gi) => (
              <div key={g.title} className={`flex flex-col items-center w-full ${gi > 0 ? 'mt-1.5 pt-1.5 kr-sep' : ''}`}>
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const active = isActive(pathname, it.href);
                  return (
                    <Link key={it.href} href={it.href} {...tipProps(it.label)} aria-current={active ? 'page' : undefined} className="kr-item">
                      <Icon className="w-5 h-5" strokeWidth={active ? 2.3 : 1.85} />
                      {it.badge != null && <span className={`kr-dot ${String(it.badge).length > 2 ? 'kr-dot--hot' : ''}`} />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <button onClick={() => setOpen(true)} {...tipProps('All modules')} className="kr-item mt-1" aria-label="Expand navigation">
            <ChevronsRight className="w-5 h-5" />
          </button>

          <div className="kr-sep w-full my-1" />

          <div className="flex flex-col items-center gap-0.5 px-2.5 pb-0.5">
            {settingsHref && (
              <Link href={settingsHref} {...tipProps('Settings')} className="kr-item" aria-label="Settings">
                <Settings className="w-5 h-5" strokeWidth={1.85} />
              </Link>
            )}
            {logoutHref && (
              <Link href={logoutHref} {...tipProps('Logout')} className="kr-item kr-item--danger" aria-label="Logout">
                <LogOut className="w-5 h-5" strokeWidth={1.85} />
              </Link>
            )}
            {!logoutHref && onLogout && (
              <button onClick={onLogout} {...tipProps('Logout')} className="kr-item kr-item--danger" aria-label="Logout">
                <LogOut className="w-5 h-5" strokeWidth={1.85} />
              </button>
            )}
          </div>
        </div>
      )}

      {tip && (
        <span role="tooltip" className="kr-tip" style={{ top: tip.top, left: tip.left }}>
          {tip.text}
        </span>
      )}
    </aside>
  );
};

/* ================================================================ */
/* Mobile floating dock                                              */
/* ================================================================ */

export interface KrDockItem {
  label: string;
  href?: string;
  icon: KrIcon;
  onClick?: () => void;
}

export const KorieDock: React.FC<{ items: KrDockItem[]; ariaLabel?: string }> = ({ items, ariaLabel = 'Mobile navigation' }) => {
  const pathname = usePathname();
  return (
    <nav aria-label={ariaLabel} className="kr-dock lg:hidden">
      {items.map((it, idx) => {
        const Icon = it.icon;
        const active = it.href ? pathname === it.href || pathname.startsWith(it.href + '/') : false;
        const cls = `kr-dock-btn${active ? ' kr-dock-btn--on' : ''}`;
        if (it.href) {
          return (
            <Link key={idx} href={it.href} aria-current={active} className={cls}>
              <span className="kr-dock-ico"><Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.9} /></span>
              <span className="kr-dock-lbl">{it.label}</span>
            </Link>
          );
        }
        return (
          <button key={idx} type="button" onClick={it.onClick} className={cls}>
            <span className="kr-dock-ico"><Icon className="w-5 h-5" strokeWidth={1.9} /></span>
            <span className="kr-dock-lbl">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
