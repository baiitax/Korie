'use client';

/**
 * Regulatory obligation calendar — live from regulatory_obligations.
 *
 * Replaces the mock event list. The register carries the real filing
 * obligations (regulator, jurisdiction, frequency, due date, status, owner).
 * "Mark completed" is a real audited PATCH of the obligation's status — the
 * previous button wrote to the in-memory mock store and told the officer it
 * was done.
 */

import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, RefreshCw } from 'lucide-react';
import { useComplianceResource, useComplianceAction } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { ObligationRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { complianceFetch } from '@/lib/compliancePortalClient';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState, InlineNotice } from '@/components/compliance/ui';
import { ComplianceTable, makeTableLabels } from '@/components/compliance/ui';

export default function ComplianceCalendarPage() {
  const { t } = useCompliancePortal();
  const calendar = useComplianceResource('calendar');
  const action = useComplianceAction();
  const [completing, setCompleting] = useState<ObligationRow | null>(null);

  const sorted = useMemo(
    () =>
      [...calendar.resource.data].sort(
        (a: ObligationRow, b: ObligationRow) => (Date.parse(a.dueDate) || 0) - (Date.parse(b.dueDate) || 0),
      ),
    [calendar.resource.data],
  );

  const markCompleted = async () => {
    if (!completing) return;
    const target = completing;
    const out = await action.run(async () => {
      const res = await complianceFetch(`/api/compliance/data/regulatory-obligations/${encodeURIComponent(target.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'SUBMITTED' }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.status === 'error') {
        return {
          ok: false,
          recorded: false,
          source: 'live' as const,
          error: { code: `HTTP_${res.status}`, message: payload?.error?.message ?? 'The update was refused.' },
        };
      }
      return { ok: true, recorded: true, source: 'live' as const, value: payload?.record, error: undefined };
    });
    if (out.ok) {
      setCompleting(null);
      calendar.reload();
    }
  };

  return (
    <>
      <PageHead
        title={t('compliance.calendar.title')}
        description={t('compliance.calendar.subtitle')}
        resource={calendar.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={calendar.reload}
            pending={calendar.isLoading || calendar.isRefreshing}
          >
            {calendar.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      {action.result?.error ? <InlineNotice tone="danger">{action.result.error.message}</InlineNotice> : null}

      <ResourceState
        resource={calendar.resource}
        isLoading={calendar.isLoading}
        loadingLabel={t('compliance.calendar.loading')}
        emptyTitle={t('compliance.calendar.empty')}
        emptyBody={t('compliance.calendar.emptyBody')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.calendar.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.calendar.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={calendar.reload}
      >
        <div className="space-y-3">
          {sorted.map((row: ObligationRow) => {
            const TERMINAL = ['SUBMITTED', 'ACKNOWLEDGED', 'APPROVED'];
            const overdue = !TERMINAL.includes(row.status) && Date.parse(row.dueDate) < Date.now();
            return (
              <div
                key={row.id}
                className={`cmp-card flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center ${
                  overdue ? 'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20' : ''
                }`}
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="neutral">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" /> {row.regulator}
                    </Chip>
                    {row.jurisdiction ? <span className="cmp-ref">{row.jurisdiction}</span> : null}
                    {row.frequency ? <span className="cmp-ref">{humanizeEnum(row.frequency)}</span> : null}
                    <StatusChip
                      status={overdue ? 'OVERDUE' : row.status}
                      label={overdue ? t('compliance.calendar.overdue') : humanizeEnum(row.status)}
                      severity={overdue}
                    />
                  </div>
                  <div className="cmp-cell-strong">{row.title}</div>
                  <div className="text-[12px] text-[var(--foreground-muted)]">
                    {t('compliance.calendar.due', { date: formatDate(row.dueDate) })}
                    {row.owner ? ` · ${row.owner}` : ''}
                    {row.code ? ` · ${row.code}` : ''}
                  </div>
                </div>
                {!TERMINAL.includes(row.status) ? (
                  <Button
                    icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => setCompleting(row)}
                    pending={action.showPending && completing?.id === row.id}
                  >
                    {t('compliance.calendar.markCompleted')}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </ResourceState>

      {completing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="cmp-card w-full max-w-md p-5">
            <h2 className="cmp-card__title">{t('compliance.calendar.confirmTitle')}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--foreground-muted)]">
              {t('compliance.calendar.confirmBody', { title: completing.title })}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setCompleting(null)}>{t('compliance.actions.cancel')}</Button>
              <Button variant="primary" pending={action.showPending} onClick={markCompleted}>
                {action.showPending ? t('compliance.actions.saving') : t('compliance.calendar.confirm')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <SourceNotes
        title={t('compliance.calendar.sourcesTitle')}
        rows={[
          {
            section: t('compliance.calendar.sourcesRows'),
            source: 'GET /api/compliance/data/regulatory-obligations',
            note: t('compliance.calendar.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
