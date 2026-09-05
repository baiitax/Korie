'use client';

/**
 * Notification centre — queue events, not decoration.
 *
 * Every row here is derived from live state (an open critical alert, a case
 * waiting on a decision, a regulatory deadline inside a week) and each one links
 * to the record that caused it. There is no "mark as read" that hides something
 * the officer still owes work on: "read" only clears the badge, and a row
 * reappears if the underlying condition is still true next time it is checked.
 */

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, ExternalLink, OctagonAlert, AlertCircle, Info } from 'lucide-react';
import { useCompliancePortal } from './CompliancePortal';
import { Provenance } from './ui/Primitives';
import { SectionSkeleton } from './ui/StateViews';
import { formatDate, formatRelative } from '@/services/compliance/format';
import type { NotificationRow } from '@/services/compliance/types';

const KIND_META = {
  CRITICAL: { icon: OctagonAlert, color: 'var(--sev-critical)', bg: 'var(--sev-critical-soft)' },
  ATTENTION: { icon: AlertCircle, color: 'var(--sev-high)', bg: 'var(--sev-high-soft)' },
  INFORMATIONAL: { icon: Info, color: 'var(--brand-primary)', bg: 'var(--brand-soft)' },
} as const;

export const NotificationCenter: React.FC = () => {
  const {
    t,
    notifications,
    notificationsLoading,
    unreadCount,
    markNotificationsRead,
    locale,
  } = useCompliancePortal();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="cmp-btn cmp-btn--icon cmp-btn--ghost relative"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          unreadCount
            ? `${t('compliance.shell.notifications')} · ${t('compliance.shell.unreadCount', { count: unreadCount })}`
            : t('compliance.shell.notifications')
        }
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full px-[3px] text-[10px] font-extrabold tabular text-white"
            style={{ background: 'var(--sev-critical)' }}
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t('compliance.notifications.title')}
          className="cmp-menu right-0 top-[calc(100%+8px)] w-[min(420px,calc(100vw-24px))] p-0"
        >
          <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
            <div className="min-w-0">
              <h2 className="text-[13.5px] font-bold text-[var(--foreground)]">{t('compliance.notifications.title')}</h2>
              <p className="text-[11.5px] text-[var(--muted)]">{t('compliance.notifications.subtitle')}</p>
            </div>
            <button type="button" className="cmp-btn cmp-btn--ghost" onClick={close} aria-label={t('compliance.shell.close')}>
              {t('compliance.shell.close')}
            </button>
          </header>

          <div className="max-h-[52vh] overflow-y-auto p-2">
            {notificationsLoading && !notifications.length ? (
              <div className="p-1">
                <SectionSkeleton label={t('compliance.notifications.loading')} rows={4} />
              </div>
            ) : !notifications.length ? (
              <div className="px-2 py-6 text-center">
                <p className="text-[13px] font-bold text-[var(--foreground)]">{t('compliance.notifications.emptyTitle')}</p>
                <p className="mx-auto mt-1 max-w-[34ch] text-[12px] text-[var(--foreground-muted)]">
                  {t('compliance.notifications.emptyBody')}
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {notifications.map((row) => (
                  <NotificationItem key={row.id} row={row} locale={locale} t={t} onDone={close} />
                ))}
              </ul>
            )}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
            <Provenance resource={{ source: notifications[0] ? 'live' : 'live', derived: true }} />
            <button
              type="button"
              className="cmp-btn"
              onClick={markNotificationsRead}
              disabled={!unreadCount}
              title={t('compliance.notifications.markHint')}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {t('compliance.notifications.markRead')}
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

const NotificationItem: React.FC<{
  row: NotificationRow;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onDone: () => void;
}> = ({ row, locale, t, onDone }) => {
  const meta = KIND_META[row.kind] ?? KIND_META.INFORMATIONAL;
  const Icon = meta.icon;
  return (
    <li>
      <Link
        href={row.href}
        onClick={onDone}
        className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-2.5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
      >
        <span
          className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-[8px]"
          style={{ background: meta.bg, color: meta.color }}
          aria-hidden="true"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-bold text-[var(--foreground)]">{row.title}</span>
            <span className="cmp-chip flex-none" style={{ fontSize: 10 }}>
              {row.kind === 'CRITICAL' ? t('compliance.notifications.kindCritical') : row.kind === 'ATTENTION' ? t('compliance.notifications.kindAttention') : t('compliance.notifications.kindInfo')}
            </span>
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-[var(--foreground-muted)]">{row.body}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--muted)]">
            <span title={formatDate(row.at, 'full', { locale })}>{formatRelative(row.at, { locale })}</span>
            <span aria-hidden="true">·</span>
            <span>{row.sourceLabel}</span>
          </span>
        </span>
        <ExternalLink className="mt-1 h-3.5 w-3.5 flex-none text-[var(--muted)]" aria-hidden="true" />
      </Link>
    </li>
  );
};
