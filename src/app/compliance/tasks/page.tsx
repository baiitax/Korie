'use client';

/**
 * The officer's own work list.
 *
 * There is no tasks endpoint in the compliance service, so this list is
 * *derived* — every row is a pointer into a live queue (an alert waiting for
 * triage, a case awaiting a second signature, an obligation due inside the
 * window, a PAM request in the approver role) rather than a record somebody
 * typed into a task table. That is the honest version of a to-do list: when the
 * underlying queue moves, the row disappears on the next read, and completing
 * the work means acting in the module that owns it.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { ArrowRight, CircleDashed, Flag, ListChecks, RefreshCw } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { TaskRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, Panel, Provenance, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { InlineNotice, ResourceState } from '@/components/compliance/ui';
import { EmptyState, LoadingBlock } from '@/components/compliance/ui';

const KIND_ORDER: TaskRow['kind'][] = ['ALERT_TRIAGE', 'CASE_REVIEW', 'DECISION_CHECK', 'APPROVAL', 'OBLIGATION', 'INFORMATION_REQUEST'];

const KIND_LABEL: Record<TaskRow['kind'], string> = {
  ALERT_TRIAGE: 'compliance.tasks.kind.ALERT_TRIAGE',
  CASE_REVIEW: 'compliance.tasks.kind.CASE_REVIEW',
  DECISION_CHECK: 'compliance.tasks.kind.DECISION_CHECK',
  APPROVAL: 'compliance.tasks.kind.APPROVAL',
  OBLIGATION: 'compliance.tasks.kind.OBLIGATION',
  INFORMATION_REQUEST: 'compliance.tasks.kind.INFORMATION_REQUEST',
};

export default function TasksPage() {
  const { t, locale, session } = useCompliancePortal();
  const [mineOnly, setMineOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('tasks');

  const rows = useMemo(() => {
    const email = (session?.email ?? '').toLowerCase();
    return resource.data.filter((row) => {
      if (overdueOnly && !row.overdue) return false;
      if (!mineOnly || !email) return true;
      return (row.assignedTo ?? '').toLowerCase().includes(email.split('@')[0]);
    });
  }, [resource.data, mineOnly, overdueOnly, session?.email]);

  const grouped = useMemo(
    () =>
      KIND_ORDER.map((kind) => ({
        kind,
        rows: rows.filter((row: TaskRow) => row.kind === kind),
      })).filter((group) => group.rows.length > 0),
    [rows],
  );

  const overdueCount = rows.filter((row) => row.overdue).length;
  const filtersActive = mineOnly || overdueOnly;

  return (
    <>
      <PageHead
        title={t('compliance.tasks.title')}
        description={t('compliance.tasks.subtitle')}
        resource={resource}
        actions={
          <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={reload} pending={isLoading || isRefreshing}>
            {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <Panel
        title={t('compliance.tasks.filters')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="cmp-btn" aria-pressed={mineOnly} onClick={() => setMineOnly((v) => !v)}>
              <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
              {t('compliance.tasks.mine')}
            </button>
            <button type="button" className="cmp-btn" aria-pressed={overdueOnly} onClick={() => setOverdueOnly((v) => !v)}>
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              {t('compliance.tasks.overdue')}
            </button>
            {filtersActive ? (
              <button
                type="button"
                className="cmp-btn cmp-btn--ghost"
                onClick={() => {
                  setMineOnly(false);
                  setOverdueOnly(false);
                }}
              >
                {t('compliance.states.clearFilters')}
              </button>
            ) : null}
          </div>
        }
        footnote={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Provenance resource={resource} detail={t('compliance.tasks.derivedDetail')} />
            <span className="text-[11.5px] tabular text-[var(--foreground-muted)]">
              {t('compliance.tasks.count', { count: rows.length })}
              {overdueCount > 0 ? ` · ${t('compliance.tasks.overdueCount', { count: overdueCount })}` : ''}
            </span>
          </div>
        }
      >
        {isLoading ? (
          <LoadingBlock label={t('compliance.tasks.loading')} variant="cards" rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtersActive ? t('compliance.states.emptyFiltered') : t('compliance.tasks.empty')}
            body={filtersActive ? undefined : t('compliance.tasks.emptyBody')}
            filtered={filtersActive}
            onClear={
              filtersActive
                ? () => {
                    setMineOnly(false);
                    setOverdueOnly(false);
                  }
                : undefined
            }
            clearLabel={t('compliance.states.clearFilters')}
          />
        ) : (
          <div className="space-y-4">
            {grouped.map(({ kind, rows: bucket }) => (
              <section key={kind} aria-labelledby={`task-group-${kind}`}>
                <h2 id={`task-group-${kind}`} className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                  <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                  {t(KIND_LABEL[kind])}
                  <span className="tabular">({bucket.length})</span>
                </h2>
                <ul className="space-y-2">
                  {bucket.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        className="flex flex-wrap items-center gap-2 rounded-[var(--cmp-radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 transition-colors hover:border-[var(--border-strong)]"
                      >
                        <StatusChip status={row.priority} label={humanizeEnum(row.priority)} severity={row.priority === 'URGENT' || row.priority === 'HIGH'} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">{row.title}</span>
                          <span className="cmp-ref block truncate">
                            {row.subjectRef ?? t('compliance.tasks.noReference')} ·{' '}
                            {row.overdue ? (
                              <span className="font-bold" style={{ color: 'var(--sev-critical)' }}>
                                {t('compliance.tasks.overdueSince', { date: formatDate(row.dueAt, 'short', { locale }) })}
                              </span>
                            ) : row.dueAt ? (
                              t('compliance.tasks.due', { date: formatDate(row.dueAt, 'short', { locale }) })
                            ) : (
                              t('compliance.tasks.noDueDate')
                            )}
                          </span>
                        </span>
                        {row.assignedTo ? <Chip tone="neutral">{row.assignedTo}</Chip> : null}
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--foreground-muted)]" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>

      <InlineNotice tone="info">{t('compliance.tasks.workNote')}</InlineNotice>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.tasks.title'),
            source: 'deriveTasks() ← alerts + cases + obligations + PAM approvals',
            note: t('compliance.tasks.sourceNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
