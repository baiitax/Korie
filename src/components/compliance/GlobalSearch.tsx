'use client';

/**
 * Global compliance search.
 *
 * One palette for the whole portal: type a name, a reference, a case number or a
 * deadline and jump straight to it. It reads the same collections the queues read
 * — the alert engine, the case engine, master identity and the obligation
 * register — through the same service, so it can never surface a record the
 * officer could not otherwise see, and it can never invent one either.
 *
 * A group whose source failed says "unavailable" instead of showing nothing and
 * letting the officer conclude the record does not exist. That distinction is the
 * whole point of a search box in an investigation tool.
 */

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileCheck2, FileText, Inbox, Search, Users } from 'lucide-react';
import { loadComplianceResource } from '@/services/compliance/service';
import { rowMatchesJurisdiction, getJurisdiction } from '@/services/compliance/jurisdiction';
import type { ComplianceResource } from '@/services/compliance/types';
import { useCompliancePortal } from './CompliancePortal';
import { Chip, Provenance } from './ui/Primitives';

type GroupId = 'customers' | 'alerts' | 'cases' | 'obligations';

interface Hit {
  id: string;
  group: GroupId;
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
}

const GROUP_META: Record<GroupId, { label: string; icon: typeof Users }> = {
  customers: { label: 'Customers', icon: Users },
  alerts: { label: 'AML alerts', icon: AlertTriangle },
  cases: { label: 'Cases', icon: Inbox },
  obligations: { label: 'Deadlines', icon: FileCheck2 },
};

export const ComplianceGlobalSearch: React.FC = () => {
  const { t, searchOpen, setSearchOpen, locale } = useCompliancePortal();
  const [term, setTerm] = useState('');
  const [index, setIndex] = useState<Record<GroupId, ComplianceResource<any>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // ⌘K / Ctrl+K opens it from anywhere in the portal, "/" from a non-input.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName ?? '');
      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape' && searchOpen) setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, setSearchOpen]);

  const openIndex = useCallback(async () => {
    setLoading(true);
    try {
      const [customers, alerts, cases, obligations] = await Promise.all([
        loadComplianceResource('customers'),
        loadComplianceResource('alerts'),
        loadComplianceResource('cases'),
        loadComplianceResource('calendar'),
      ]);
      setIndex({ customers, alerts, cases, obligations });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    if (!index) void openIndex();
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [searchOpen, index, openIndex]);

  const hits = useMemo<Hit[]>(() => {
    if (!index) return [];
    const needle = term.trim().toLowerCase();
    const scope = getJurisdiction();
    const out: Hit[] = [];

    const push = (group: GroupId, resource: ComplianceResource<any>, map: (row: any) => Hit) => {
      const rows = (resource.data ?? []).filter((row: any) => rowMatchesJurisdiction(row, scope));
      const matches = needle
        ? rows.filter((row: any) => `${map(row).title} ${map(row).subtitle} ${map(row).meta ?? ''}`.toLowerCase().includes(needle))
        : rows.slice(0, 4);
      matches.slice(0, 6).forEach((row: any) => out.push(map(row)));
    };

    push('customers', index.customers, (r) => ({
      id: `c-${r.id}`,
      group: 'customers',
      title: r.fullName,
      subtitle: `${r.identityReference} · ${r.kycTier || 'tier not reported'}`,
      meta: `${r.email} ${r.phone}`,
      href: `/compliance/customers/${encodeURIComponent(r.id)}`,
    }));
    push('alerts', index.alerts, (r) => ({
      id: `a-${r.id}`,
      group: 'alerts',
      title: r.reference,
      subtitle: `${r.subjectName} · ${r.severity.toLowerCase()} · ${r.status.replace(/_/g, ' ').toLowerCase()}`,
      meta: `${r.scenarioCode ?? ''} ${r.transactionReference ?? ''}`,
      href: `/compliance/alerts/${encodeURIComponent(r.id)}`,
    }));
    push('cases', index.cases, (r) => ({
      id: `k-${r.id}`,
      group: 'cases',
      title: r.reference,
      subtitle: `${r.title} · ${r.status.replace(/_/g, ' ').toLowerCase()}`,
      meta: r.subjectName,
      href: `/compliance/cases/${encodeURIComponent(r.id)}`,
    }));
    push('obligations', index.obligations, (r) => ({
      id: `o-${r.id}`,
      group: 'obligations',
      title: r.title,
      subtitle: `${r.regulator} · due ${r.dueDate ? String(r.dueAt ?? r.dueDate).slice(0, 10) : 'not reported'}`,
      meta: r.status,
      href: '/compliance/calendar',
    }));

    return out;
  }, [index, term]);

  useEffect(() => setActive(0), [term]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(hits.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter' && hits[active]) {
      event.preventDefault();
      window.location.href = hits[active].href;
    }
  };

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!searchOpen) return null;

  const grouped = (['customers', 'alerts', 'cases', 'obligations'] as GroupId[]).map((group) => ({
    group,
    rows: hits.filter((h) => h.group === group),
  }));

  return (
    <div className="fixed inset-0" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}>
      <div className="cmp-scrim" onMouseDown={() => setSearchOpen(false)} aria-hidden="true" />
      <div className="cmp-palette" role="dialog" aria-modal="true" aria-label={t('compliance.search.title')}>
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <Search className="h-4 w-4 flex-none text-[var(--muted)]" aria-hidden="true" />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onKeyDown}
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmp-search-results"
            aria-label={t('compliance.search.label')}
            placeholder={t('compliance.search.placeholder')}
            className="h-9 w-full min-w-0 border-0 bg-transparent text-[14px] text-[var(--foreground)] outline-none placeholder:text-[var(--text-disabled)]"
          />
          <button type="button" className="cmp-btn cmp-btn--ghost" onClick={() => setSearchOpen(false)}>
            {t('compliance.shell.close')}
          </button>
        </div>

        <div id="cmp-search-results" ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2" role="listbox" aria-label={t('compliance.search.results')}>
          {loading && !index ? (
            <p className="px-2 py-6 text-center text-[12.5px] text-[var(--foreground-muted)]" role="status">
              {t('compliance.search.loading')}
            </p>
          ) : !hits.length ? (
            <div className="px-2 py-6 text-center">
              <p className="text-[13px] font-bold text-[var(--foreground)]">
                {term.trim() ? t('compliance.search.noMatch') : t('compliance.search.startTyping')}
              </p>
              <p className="mx-auto mt-1 max-w-[42ch] text-[12px] text-[var(--foreground-muted)]">{t('compliance.search.noMatchBody')}</p>
            </div>
          ) : (
            grouped.map(({ group, rows }) => {
              const sourceState = index?.[group]?.status;
              const sourceDown = index && sourceState !== 'ready' && sourceState !== 'empty';
              if (rows.length)
                return (
                <div key={`g-${group}`} className="mb-1.5">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">
                      {t(`compliance.search.group.${group}`)}
                    </span>
                    <span className="text-[10.5px] tabular text-[var(--muted)]">{rows.length}</span>
                  </div>
                  <ul>
                    {rows.map((hit) => {
                      const index = hits.indexOf(hit);
                      return (
                        <li key={hit.id}>
                          <Link
                            href={hit.href}
                            data-index={index}
                            role="option"
                            aria-selected={index === active}
                            onMouseEnter={() => setActive(index)}
                            className={`flex items-center gap-2.5 rounded-[10px] px-2 py-2 ${
                              index === active ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--surface-2)]'
                            }`}
                          >
                            <span className="grid h-7 w-7 flex-none place-items-center rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground-muted)]">
                              {React.createElement(GROUP_META[hit.group].icon, { className: 'h-3.5 w-3.5' })}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-bold text-[var(--foreground)]">{hit.title}</span>
                              <span className="block truncate text-[11.5px] text-[var(--foreground-muted)]">{hit.subtitle}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                );
              if (sourceDown)
                return (
                  <p key={group} className="px-2 py-1.5 text-[11.5px] text-[var(--muted)]">
                    {t(`compliance.search.group.${group}`)}: {t('compliance.search.unavailable')}
                  </p>
                );
              return null;
            })
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
          <div className="flex items-center gap-1.5">
            {index ? <Provenance resource={{ source: Object.values(index).some((r) => r.source === 'demo') ? 'demo' : 'live', derived: true }} /> : null}
            <Chip>
              <FileText className="h-3 w-3" aria-hidden="true" />
              {t('compliance.search.scope')}
            </Chip>
          </div>
          <p className="text-[11px] text-[var(--muted)]" translate="no">
            ↑ ↓ · Enter · Esc
          </p>
        </footer>
      </div>
    </div>
  );
};
