'use client';

/* KoriePay Compliance kit — light, scoped primitives used by every portal page. */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

export type Tone = 'low' | 'medium' | 'high' | 'critical' | 'info' | 'ok' | 'warn' | 'dim' | 'brand';
export const TONE_CLASS: Record<Tone, string> = {
  low: 'tone-low', medium: 'tone-medium', high: 'tone-high', critical: 'tone-critical',
  info: 'tone-info', ok: 'tone-ok', warn: 'tone-warn', dim: 'tone-dim', brand: 'tone-brand',
};

export function toneOfRisk(risk: string): Tone {
  if (risk === 'LOW' || risk === 'CLEAN' || risk === 'VERIFIED' || risk === 'SETTLED' || risk === 'RESOLVED' || risk === 'CLOSED' || risk === 'PASS' || risk === 'ACTIVE' || risk === 'OPERATIONAL' || risk === 'SYNCED' || risk === 'SUCCESS' || risk === 'READY' || risk === 'DONE' || risk === 'APPROVED' || risk === 'CONNECTED' || risk === 'FALSE_POSITIVE') return 'ok';
  if (risk === 'MEDIUM' || risk === 'PENDING' || risk === 'ACKNOWLEDGED' || risk === 'OPEN' || risk === 'REVIEW' || risk === 'IN_REVIEW' || risk === 'UNDER_REVIEW' || risk === 'POTENTIAL_MATCH' || risk === 'ASSIGNED' || risk === 'IN_PROGRESS' || risk === 'SCHEDULED' || risk === 'DEGRADED' || risk === 'INFORMATION_REQUESTED' || risk === 'NEEDS_REVIEW' || risk === 'NOT_GENERATED' || risk === 'PENDING_DECISION' || risk === 'UPDATING' || risk === 'WAITING_FOR_INFO' || risk === 'DORMANT') return 'warn';
  if (risk === 'HIGH' || risk === 'ESCALATED' || risk === 'FLAG' || risk === 'FLAGGED' || risk === 'CONFIRMED_MATCH' || risk === 'RESTRICTED' || risk === 'EXPIRED' || risk === 'DENIED' || risk === 'REOPENED' || risk === 'ERROR') return 'high';
  if (risk === 'CRITICAL' || risk === 'BLOCK' || risk === 'BLOCKED' || risk === 'FROZEN' || risk === 'FAILED' || risk === 'REJECTED' || risk === 'UNAVAILABLE' || risk === 'OVERDUE') return 'critical';
  return 'dim';
}

/* ---------------- surface blocks ---------------- */
export const Card: React.FC<{ className?: string; children: React.ReactNode; flat?: boolean; pad?: boolean; id?: string }> = ({ className, children, flat, pad = true, id }) => (
  <div id={id} className={cx('kpc-card', flat && 'kpc-card-flat', pad && 'p-4 md:p-5', className)}>{children}</div>
);

export const SectionHeader: React.FC<{ title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }> = ({ title, sub, actions, eyebrow }) => (
  <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
    <div>
      {eyebrow && <div className="kpc-eyebrow mb-1 flex items-center gap-1.5">{eyebrow}</div>}
      <h2 className="text-[0.98rem] font-extrabold tracking-tight text-[var(--kpc-ink)] flex items-center gap-2">{title}</h2>
      {sub && <p className="text-[0.7rem] text-[var(--kpc-ink-3)] mt-0.5 max-w-2xl">{sub}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

export const ViewAll: React.FC<{ href: string; label?: string }> = ({ href, label }) => (
  <Link href={href} className="kpc-link text-[0.7rem] inline-flex items-center gap-1">
    {label ?? 'View all'} <ArrowRight className="w-3 h-3" />
  </Link>
);

/* ---------------- chips / avatars ---------------- */
export const Chip: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string; icon?: React.ReactNode; title?: string }> = ({ tone = 'dim', children, className, icon, title }) => (
  <span className={cx('kpc-chip', TONE_CLASS[tone], className)} title={title}>
    {icon}
    {children}
  </span>
);

export const CountDot: React.FC<{ n: number; tone?: Tone }> = ({ n, tone = 'dim' }) => (
  <span className={cx('kpc-nav-badge', tone === 'critical' || tone === 'high' ? 'kpc-nav-badge-hot' : '')}>{n}</span>
);

export const Avatar: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 30, className }) => (
  <span
    className={cx('inline-flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 text-white font-extrabold shrink-0', className)}
    style={{ width: size, height: size, fontSize: size * 0.38 }}
    aria-hidden
  >
    {(name || 'KP').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
  </span>
);

export const StatusDot: React.FC<{ tone: Tone; pulse?: boolean }> = ({ tone, pulse }) => {
  const map: Record<Tone, string> = {
    ok: 'bg-emerald-500', warn: 'bg-amber-500', high: 'bg-orange-500', critical: 'bg-rose-500',
    info: 'bg-sky-500', low: 'bg-emerald-500', medium: 'bg-amber-500', dim: 'bg-slate-400', brand: 'bg-teal-500',
  };
  return <span className={cx('inline-block w-1.5 h-1.5 rounded-full', map[tone], pulse && 'animate-pulse')} />;
};

/* ---------------- KPI card ---------------- */
export const Kpi: React.FC<{
  label: string; value: React.ReactNode; icon: LucideIcon;
  tone?: Tone; delta?: string; deltaGood?: boolean; sub?: React.ReactNode; to?: string;
}> = ({ label, value, icon: Icon, tone = 'brand', delta, deltaGood = true, sub, to }) => (
  <Card flat pad className="kpc-card-hover relative overflow-hidden group">
    {to && <Link href={to} className="absolute inset-0 z-10" aria-label={label} />}
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-[var(--kpc-ink-3)] truncate">{label}</p>
        <p className="kpc-num text-[1.7rem] font-extrabold tracking-tight text-[var(--kpc-ink)] mt-1.5 leading-none">{value}</p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {delta && <span className={cx('text-[0.66rem] font-extrabold px-1.5 py-0.5 rounded-md', deltaGood ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400')}>{delta}</span>}
          {sub && <span className="text-[0.66rem] text-[var(--kpc-ink-3)] truncate">{sub}</span>}
        </div>
      </div>
      <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset', TONE_CLASS[tone])}>
        <Icon className="w-[18px] h-[18px]" />
      </span>
    </div>
  </Card>
);

/* ---------------- table ---------------- */
export interface Col<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  sortVal?: (row: T) => string | number;
  className?: string;
  width?: string;
}
export function CkTable<T>({ cols, rows, rowKey, onRow, empty, dense, className, 'aria-label': ariaLabel }: {
  cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string; onRow?: (r: T) => void;
  empty?: React.ReactNode; dense?: boolean; className?: string; 'aria-label'?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const sorted = [...rows];
  if (sort) {
    const c = cols.find((x) => x.key === sort.key);
    if (c?.sortVal) sorted.sort((a, b) => (c.sortVal!(a) > c.sortVal!(b) ? 1 : c.sortVal!(a) < c.sortVal!(b) ? -1 : 0) * sort.dir);
  }
  return (
    <div className="kpc-tbl-wrap kpc-scroll">
      <table className="kpc-tbl" aria-label={ariaLabel}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined} className={cx(c.align === 'right' && 'text-right', sort?.key === c.key && 'kpc-sorted')}>
                <span className={cx('inline-flex items-center', c.align === 'right' && 'flex-row-reverse')}>
                  {c.header}
                  {c.sortVal && (
                    <button
                      className="kpc-sort"
                      onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}
                      aria-label={`Sort by ${typeof c.header === 'string' ? c.header : c.key}`}
                    >
                      {sort?.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : '↕'}
                    </button>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} onClick={() => onRow?.(r)} tabIndex={onRow ? 0 : undefined}
              onKeyDown={onRow ? (e) => { if (e.key === 'Enter') onRow(r); } : undefined}
              className={cx(onRow && 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500')}>
              {cols.map((c) => (
                <td key={c.key} className={cx(dense && '!py-1.5', c.align === 'right' && 'text-right', c.className)}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
          {!sorted.length && (
            <tr><td colSpan={cols.length}>{empty ?? <EmptyState />}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- controls ---------------- */
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; wrapClass?: string }> = ({ icon, wrapClass, className, ...rest }) => (
  <div className={cx('relative', wrapClass)}>
    {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--kpc-ink-3)] flex">{icon}</span>}
    <input className={cx('kpc-input', icon ? '!pl-8' : '', className)} {...rest} />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...rest }) => (
  <select className={cx('kpc-select !w-auto', className)} {...rest}>{children}</select>
);

export const Seg: React.FC<{ options: { value: string; label: React.ReactNode }[]; value: string; onChange: (v: string) => void; className?: string; ariaLabel?: string }> = ({ options, value, onChange, className, ariaLabel }) => (
  <div className={cx('inline-flex items-center bg-[var(--kpc-bg-2)] border border-[rgba(var(--kpc-ring),0.8)] rounded-lg p-0.5 gap-0.5', className)} role="tablist" aria-label={ariaLabel}>
    {options.map((o) => (
      <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
        className={cx('px-2.5 py-1.5 rounded-md text-[0.7rem] font-bold transition', value === o.value ? 'bg-[var(--kpc-card-solid)] text-[var(--kpc-brand-ink)] shadow-sm border border-[rgba(13,148,136,0.3)]' : 'text-[var(--kpc-ink-3)] hover:text-[var(--kpc-ink)] border border-transparent')}>
        {o.label}
      </button>
    ))}
  </div>
);

export const Tabs: React.FC<{ items: { value: string; label: React.ReactNode; count?: number; dot?: string }[]; value: string; onChange: (v: string) => void; className?: string }> = ({ items, value, onChange, className }) => (
  <div className={cx('flex gap-1 overflow-x-auto kpc-scroll border-b border-[var(--kpc-line)]', className)} role="tablist">
    {items.map((it) => (
      <button key={it.value} role="tab" aria-selected={value === it.value} onClick={() => onChange(it.value)}
        className={cx('px-3 py-2 text-[0.76rem] font-bold whitespace-nowrap border-b-2 -mb-px transition flex items-center gap-1.5',
          value === it.value ? 'border-teal-600 text-[var(--kpc-brand-ink)]' : 'border-transparent text-[var(--kpc-ink-3)] hover:text-[var(--kpc-ink)]')}>
        {it.label}
        {it.count !== undefined && <span className={cx('text-[0.62rem] font-extrabold rounded-full px-1.5 py-px', value === it.value ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300' : 'bg-[rgba(var(--kpc-ring),0.6)]')}>{it.count}</span>}
        {it.dot && <span className={cx('w-1.5 h-1.5 rounded-full', it.dot)} />}
      </button>
    ))}
  </div>
);

/* ---------------- drawer & modal ---------------- */
export const Drawer: React.FC<{ open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({ open, onClose, title, children, footer, wide }) => {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55]">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] kpc-anim-fade" onClick={onClose} aria-hidden />
      <div className={cx('absolute inset-y-0 right-0 bg-[var(--kpc-bg-2)] border-l border-[rgba(var(--kpc-ring),0.7)] shadow-2xl kpc-anim-slide flex flex-col', wide ? 'w-[640px] max-w-[96vw]' : 'w-[440px] max-w-[96vw]')} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Details'}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--kpc-line)]">
          <div className="text-[0.9rem] font-extrabold text-[var(--kpc-ink)]">{title}</div>
          <button onClick={onClose} className="kpc-btn kpc-btn-ghost kpc-btn-icon" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto kpc-scroll px-4 py-4">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-[var(--kpc-line)] flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const Modal: React.FC<{ open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: string }> = ({ open, onClose, title, children, footer, width = 'max-w-lg' }) => {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[56] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[3px] kpc-anim-fade" onClick={onClose} aria-hidden />
      <div className={cx('relative w-full kpc-card kpc-card-flat kpc-anim-rise shadow-2xl', width)} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Dialog'}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--kpc-line)]">
          <div className="text-[0.92rem] font-extrabold text-[var(--kpc-ink)]">{title}</div>
          <button onClick={onClose} className="kpc-btn kpc-btn-ghost kpc-btn-icon" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-4 max-h-[62vh] overflow-y-auto kpc-scroll">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-[var(--kpc-line)] flex items-center justify-end gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
};

/* ---------------- states ---------------- */
export const EmptyState: React.FC<{ title?: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode }> = ({ title, body, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
    <div className="w-11 h-11 rounded-2xl bg-[rgba(var(--kpc-ring),0.5)] flex items-center justify-center mb-3">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-[var(--kpc-ink-3)]"><path d="M9 12h6m-6 4h6M9 8h1M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z"/></svg>
    </div>
    <p className="text-[0.8rem] font-bold text-[var(--kpc-ink-2)]">{title ?? 'Nothing here yet'}</p>
    {body && <p className="text-[0.7rem] text-[var(--kpc-ink-3)] mt-1 max-w-xs">{body}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ title?: React.ReactNode; body?: React.ReactNode; onRetry?: () => void }> = ({ title, body, onRetry }) => (
  <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
    <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
    </div>
    <p className="text-[0.8rem] font-bold text-[var(--kpc-ink-2)]">{title ?? 'Unable to load compliance data.'}</p>
    {body && <p className="text-[0.7rem] text-[var(--kpc-ink-3)] mt-1 max-w-xs">{body}</p>}
    {onRetry && <button onClick={onRetry} className="kpc-btn kpc-btn-outline mt-4"><RotateCw className="w-3.5 h-3.5" /> Retry</button>}
  </div>
);

export const Skel: React.FC<{ className?: string }> = ({ className }) => <div className={cx('kpc-skel', className)} aria-hidden />;

export const PageSkel: React.FC<{ cards?: number }> = ({ cards = 3 }) => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading">
    <div className="flex gap-3"><Skel className="h-4 w-40" /><Skel className="h-4 w-56" /></div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="kpc-card p-4 space-y-2"><Skel className="h-3 w-2/3" /><Skel className="h-7 w-1/2" /><Skel className="h-3 w-1/3" /></div>)}
    </div>
    <div className="kpc-card p-4 space-y-2.5"><Skel className="h-4 w-56" />{Array.from({ length: cards * 2 }).map((_, i) => <Skel key={i} className="h-8 w-full" />)}</div>
  </div>
);

export function useBoot(ms = 420) {
  const [ready, setReady] = useState(false);
  const [fail, setFail] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return { ready, fail, retry: () => { setFail(false); setReady(false); window.setTimeout(() => setReady(true), 300); } };
}

/* ---------------- misc ---------------- */
export const KeyVal: React.FC<{ k: React.ReactNode; v: React.ReactNode; mono?: boolean; strong?: boolean }> = ({ k, v, mono, strong }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-[rgba(var(--kpc-ring),0.35)] last:border-0">
    <span className="text-[0.7rem] text-[var(--kpc-ink-3)]">{k}</span>
    <span className={cx('text-[0.74rem] text-right', strong ? 'font-bold text-[var(--kpc-ink)]' : 'font-semibold text-[var(--kpc-ink-2)]', mono && 'kpc-mono')}>{v}</span>
  </div>
);

export const PageHead: React.FC<{ title: React.ReactNode; sub?: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; actions?: React.ReactNode }> = ({ title, sub, icon: Icon, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600/15 to-emerald-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-600/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
      )}
      <div className="min-w-0">
        <h1 className="kpc-title leading-tight">{title}</h1>
        {sub && <p className="kpc-subtitle mt-1">{sub}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
  </div>
);
