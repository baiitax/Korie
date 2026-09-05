'use client';

/* Small shared list/workspace helpers for compliance pages. */
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/components/compliance/ui/Ck';

export function usePaging<T>(rows: T[], pageSize = 8) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(page, pages - 1);
  const slice = rows.slice(safe * pageSize, (safe + 1) * pageSize);
  const reset = () => setPage(0);
  return { slice, page: safe, pages, pageSize, setPage, reset, shown: slice.length };
}

export const Paginator: React.FC<{ page: number; pages: number; total: number; shown: number; setPage: (n: number) => void; label?: string }> = ({ page, pages, total, shown, setPage }) => (
  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-[var(--kpc-line)] flex-wrap">
    <p className="text-[0.66rem] text-[var(--kpc-ink-3)] font-semibold">
      Showing <span className="kpc-num text-[var(--kpc-ink-2)]">{shown}</span> of <span className="kpc-num text-[var(--kpc-ink-2)]">{total}</span> sample rows
    </p>
    <div className="flex items-center gap-1">
      <button disabled={page === 0} onClick={() => setPage(page - 1)} className="kpc-btn kpc-btn-ghost kpc-btn-icon kpc-btn-sm" aria-label="Previous page"><ChevronLeft className="w-3.5 h-3.5" /></button>
      <span className="text-[0.68rem] font-extrabold text-[var(--kpc-ink-2)] px-1 kpc-num">{page + 1} / {pages}</span>
      <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="kpc-btn kpc-btn-ghost kpc-btn-icon kpc-btn-sm" aria-label="Next page"><ChevronRight className="w-3.5 h-3.5" /></button>
    </div>
  </div>
);

/* Row render helpers for dense tables */
export const NameCell: React.FC<{ name: string; sub: string; onClick?: () => void }> = ({ name, sub, onClick }) => (
  <div className="min-w-0">
    <button onClick={onClick} className="block text-[0.78rem] font-bold text-[var(--kpc-ink)] truncate max-w-[200px] hover:text-[var(--kpc-brand-ink)] hover:underline underline-offset-2">{name}</button>
    <span className="block text-[0.64rem] kpc-mono text-[var(--kpc-ink-3)]">{sub}</span>
  </div>
);

export const Money: React.FC<{ amount: number; currency: 'XOF' | 'NGN'; fmt: (a: number, c: 'XOF' | 'NGN') => string; strong?: boolean }> = ({ amount, currency, fmt, strong }) => (
  <span className={cx('kpc-mono whitespace-nowrap', strong ? 'text-[0.76rem] font-extrabold text-[var(--kpc-ink)]' : 'text-[0.74rem] font-bold text-[var(--kpc-ink-2)]')}>
    {fmt(amount, currency)}
  </span>
);

export const Age: React.FC<{ iso: string; rel: (s: string) => string }> = ({ iso, rel }) => (
  <span className="kpc-mono text-[0.68rem] text-[var(--kpc-ink-3)] whitespace-nowrap">{rel(iso)}</span>
);

export function useNowTick(ms = 60_000) {
  // forces re-render so relative times stay fresh
  const [, set] = useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => set((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

export const DemoStrip: React.FC<{ t: Record<string, any> }> = ({ t }) => (
  <div className="flex items-center gap-2 text-[0.64rem] font-bold text-[var(--kpc-ink-3)]">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
    {t.common.demoNote}
  </div>
);

export function chipTxt(v: string, t: Record<string, any>): string {
  const map: Record<string, string> = {
    VERIFIED: t.kycCommon.verified, PENDING: t.kycCommon.pending, IN_REVIEW: t.kycCommon.inReview,
    REJECTED: t.kycCommon.rejected, EXPIRED: t.kycCommon.expired, INFORMATION_REQUESTED: t.kycCommon.informationRequested,
    NOT_STARTED: '\u2014', ACTIVE: t.common.active, DORMANT: t.common.dormant, FROZEN: t.common.frozen,
    RESTRICTED: t.common.restricted, OPEN: t.statuses.open, ACKNOWLEDGED: t.statuses.acknowledged,
    INVESTIGATING: t.statuses.investigating, ESCALATED: t.statuses.escalated, RESOLVED: t.statuses.resolved,
    DISMISSED: t.statuses.dismissed, SETTLED: t.statuses.cleared, FLAGGED: t.txnP.suspicious,
    BLOCKED: t.txnP.blocked, CLEARED: t.txnP.cleared, CONFIRMED_MATCH: t.common.confirmed,
    FALSE_POSITIVE: t.common.falsePositive, POTENTIAL_MATCH: t.common.potential, UNDER_REVIEW: t.common.underReview,
    SYNCED: t.common.connected, ERROR: t.common.errors, APPROVED: t.common.approved, DENIED: t.common.denied,
    SUCCESS: t.common.operational, FAILED: t.common.errors,
  };
  return map[v] ?? v.replace(/_/g, ' ');
}

export function useSafeParams() {
  // small hook over next/navigation not needed server-side; kept for symmetry
  return undefined as never;
}
