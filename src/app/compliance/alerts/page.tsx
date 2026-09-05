'use client';

/**
 * AML alert queue.
 *
 * The queue is read from `AmlAlertEngine` through `/api/aml/alerts`, and the two
 * actions here (`UPDATE_STATUS`, `CONVERT_TO_CASE`) are the engine's own — they
 * mutate the store the case engine and the customer 360 read, so a disposition
 * made here changes what the next screen shows. Anything the engine cannot do
 * (attach a free-text note to an alert, for instance) is not offered: notes
 * belong to the case, which is where the engine keeps them.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, ExternalLink, Filter, RefreshCw } from 'lucide-react';
import { useComplianceAction, useComplianceResource } from '@/services/compliance/hooks';
import { formatMoney, formatDate, humanizeEnum } from '@/services/compliance/format';
import type { AlertRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Button,
  Chip,
  Field,
  KeyList,
  PageHead,
  Provenance,
  SelectInput,
  SlaDue,
  StatusChip,
  TextInput,
} from '@/components/compliance/ui';
import { InlineNotice, ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';
import { Modal, SourceNotes } from '@/components/compliance/ui';

const SEVERITIES = ['ALL', 'P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW'];
const STATUSES = ['ALL', 'NEW', 'QUEUED', 'ASSIGNED', 'IN_REVIEW', 'ESCALATED', 'FALSE_POSITIVE', 'DISMISSED', 'CONVERTED_TO_CASE', 'CLOSED'];
const DISPOSITIONS = ['IN_REVIEW', 'ASSIGNED', 'ESCALATED', 'FALSE_POSITIVE', 'DISMISSED', 'CLOSED'];

export default function AlertsQueuePage() {
  const { t, locale, session } = useCompliancePortal();
  const [severity, setSeverity] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [term, setTerm] = useState('');
  const [dispose, setDispose] = useState<AlertRow | null>(null);

  const query = {
    ...(severity !== 'ALL' ? { severity } : {}),
    ...(status !== 'ALL' ? { status } : {}),
  };
  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('alerts', {
    query: Object.keys(query).length ? query : undefined,
  });
  const action = useComplianceAction();

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return resource.data;
    return resource.data.filter((row) =>
      `${row.reference} ${row.subjectName} ${row.scenarioCode ?? ''} ${row.transactionReference ?? ''}`.toLowerCase().includes(needle),
    );
  }, [resource.data, term]);

  const filtersActive = term.trim().length > 0;

  return (
    <>
      <PageHead
        title={t('compliance.alerts.title')}
        description={t('compliance.alerts.subtitle')}
        resource={resource}
        actions={
          <>
            <Button
              icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={reload}
              pending={isLoading || isRefreshing}
            >
              {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
            <Link href="/compliance/tasks" className="cmp-btn">
              {t('compliance.alerts.myTasks')}
            </Link>
          </>
        }
      />

      {action.status === 'success' ? (
        <InlineNotice tone={action.result?.recorded ? 'info' : 'warning'} icon={<AlertTriangle className="h-4 w-4" />}>
          {action.result?.recorded ? t('compliance.actions.liveOutcome') : t('compliance.actions.demoOutcome')}
        </InlineNotice>
      ) : action.status === 'error' ? (
        <InlineNotice tone="danger">{action.result?.error?.message ?? t('compliance.actions.failedOutcome')}</InlineNotice>
      ) : null}

      <ResourceState
        resource={resource}
        isLoading={isLoading}
        loadingLabel={t('compliance.alerts.loading')}
        emptyTitle={filtersActive ? t('compliance.states.emptyFiltered') : t('compliance.alerts.empty')}
        emptyBody={filtersActive ? undefined : t('compliance.alerts.emptyBody')}
        retryLabel={t('compliance.states.retry')}
        onRetry={reload}
        filtered={filtersActive}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.states.unauthorizedBody')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.alerts.unavailable')}
      >
        <ComplianceTable
          rows={rows}
          columns={[
            {
              key: 'subject',
              header: t('compliance.common.subject'),
              primary: true,
              mobileLabel: t('compliance.alerts.col.severity'),
              sortValue: (row: AlertRow) => row.subjectName,
              render: (row: AlertRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.subjectName}</div>
                  <div className="cmp-ref truncate">
                    {row.reference} · {row.scenarioCode ?? 'scenario not reported'}
                  </div>
                </div>
              ),
            },
            {
              key: 'severity',
              header: t('compliance.alerts.col.severity'),
              mobileLabel: t('compliance.alerts.col.severity'),
              sortValue: (row: AlertRow) => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(row.severity),
              render: (row: AlertRow) => <StatusChip status={row.severity} label={humanizeEnum(row.severity)} severity />,
            },
            {
              key: 'amount',
              header: t('compliance.alerts.col.amount'),
              align: 'end',
              mobileLabel: t('compliance.alerts.col.amount'),
              hideBelow: 'lg',
              sortValue: (row: AlertRow) => row.amount,
              render: (row: AlertRow) => <span className="tabular">{formatMoney(row.amount, row.currency, { locale })}</span>,
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              hideBelow: 'md',
              sortValue: (row: AlertRow) => row.status,
              render: (row: AlertRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
            },
            {
              key: 'sla',
              header: t('compliance.alerts.col.sla'),
              hideBelow: 'lg',
              mobileLabel: t('compliance.alerts.col.sla'),
              sortValue: (row: AlertRow) => row.slaDueAt ?? '',
              render: (row: AlertRow) => (
                <SlaDue
                  dueAt={row.slaDueAt}
                  breached={row.slaBreached}
                  overdueLabel={t('compliance.alerts.slaBreached')}
                  dueLabel={t('compliance.alerts.slaDue')}
                />
              ),
            },
            {
              key: 'triggered',
              header: t('compliance.alerts.col.triggered'),
              hideBelow: 'md',
              sortValue: (row: AlertRow) => row.triggeredAt,
              render: (row: AlertRow) => <span className="text-[12px] text-[var(--foreground-muted)]">{formatDate(row.triggeredAt, 'short', { locale })}</span>,
            },
            {
              key: 'act',
              header: '',
              render: (row: AlertRow) => (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    className="cmp-btn cmp-btn--ghost px-2"
                    onClick={() => setDispose(row)}
                    aria-label={`${t('compliance.alerts.dispose')} ${row.reference}`}
                  >
                    {t('compliance.alerts.dispose')}
                  </button>
                </div>
              ),
            },
          ]}
          getRowId={(row: AlertRow) => row.id}
          getRowHref={(row: AlertRow) => `/compliance/alerts/${encodeURIComponent(row.id)}`}
          getRowTone={(row: AlertRow) => (row.severity === 'CRITICAL' ? 'critical' : row.severity === 'HIGH' ? 'high' : undefined)}
          labels={makeTableLabels(t, t('compliance.alerts.title'))}
          pageSize={12}
          footnote={<Provenance resource={resource} />}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.alerts.searchLabel')}
              searchPlaceholder={t('compliance.alerts.searchPlaceholder')}
              onClear={filtersActive ? () => setTerm('') : undefined}
              clearLabel={t('compliance.states.clearFilters')}
              resultCount={rows.length}
              resultLabel={(count) => t('compliance.alerts.resultCount', { count })}
            >
              {/* Server-side filters: the engine supports severity and status, so
                  these narrow the query rather than re-slicing what arrived. */}
              <label className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--foreground-muted)]">
                <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">{t('compliance.alerts.col.severity')}</span>
                <SelectInput
                  aria-label={t('compliance.alerts.col.severity')}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="h-[38px] w-[150px]"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s === 'ALL' ? t('compliance.alerts.severityAll') : humanizeEnum(s)}
                    </option>
                  ))}
                </SelectInput>
              </label>
              <label className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--foreground-muted)]">
                <span className="sr-only sm:not-sr-only">{t('compliance.common.status')}</span>
                <SelectInput
                  aria-label={t('compliance.common.status')}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-[38px] w-[168px]"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === 'ALL' ? t('compliance.alerts.statusAll') : humanizeEnum(s)}
                    </option>
                  ))}
                </SelectInput>
              </label>
            </TableToolbar>
          }
        />
      </ResourceState>

      <DisposeModal
        row={dispose}
        onClose={() => setDispose(null)}
        action={action}
        onDone={() => {
          setDispose(null);
          reload();
        }}
      />

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.alerts.title'),
            source: 'GET /api/aml/alerts?severity&status → AmlAlertEngine.getAlerts()',
            note: t('compliance.alerts.sourceNote'),
            mode: resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.alerts.dispose'),
            source: 'POST /api/aml/alerts/:id { action: UPDATE_STATUS }',
            note: t('compliance.alerts.sourceNoteStatus'),
            mode: 'live',
          },
          {
            section: t('compliance.alerts.convert'),
            source: 'POST /api/aml/alerts/:id { action: CONVERT_TO_CASE }',
            note: t('compliance.alerts.sourceNoteConvert'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}

const DisposeModal: React.FC<{
  row: AlertRow | null;
  onClose: () => void;
  action: ReturnType<typeof useComplianceAction>;
  onDone: () => void;
}> = ({ row, onClose, action, onDone }) => {
  const { t, session, demoEnabled } = useCompliancePortal();
  const [status, setStatus] = useState('IN_REVIEW');
  const [assignee, setAssignee] = useState('');
  const [convert, setConvert] = useState(false);

  if (!row) return null;
  const email = session?.email ?? '';
  const busy = action.status === 'pending';

  const submit = async () => {
    if (convert) {
      const out = await action.runLive('alerts.convert', row.id, { investigatorEmail: email || 'lead.investigator@koriepay.ng' });
      if (out.ok) onDone();
      return;
    }
    const out = await action.runLive('alerts.status', row.id, {
      status,
      assignedTo: status === 'ASSIGNED' ? assignee.trim() || email || undefined : undefined,
    });
    if (out.ok) onDone();
  };

  return (
    <Modal
      open={Boolean(row)}
      onClose={onClose}
      title={t('compliance.alerts.disposeTitle')}
      description={t('compliance.alerts.disposeBody', { reference: row.reference })}
      closeLabel={t('compliance.shell.close')}
      footer={
        <>
          <Button onClick={onClose}>{t('compliance.actions.cancel')}</Button>
          <Button variant="primary" onClick={submit} pending={busy || action.showPending}>
            {convert ? t('compliance.alerts.convert') : t('compliance.alerts.confirmDispose')}
            {!busy ? <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <KeyList
          items={[
            { term: t('compliance.common.subject'), value: row.subjectName },
            { term: t('compliance.alerts.col.amount'), value: formatMoney(row.amount, row.currency), mono: false },
            { term: t('compliance.alerts.col.severity'), value: <StatusChip status={row.severity} label={humanizeEnum(row.severity)} severity /> },
            { term: t('compliance.common.status'), value: <StatusChip status={row.status} label={humanizeEnum(row.status)} /> },
          ]}
        />

        <label className="flex items-start gap-2 rounded-[10px] border border-[var(--border)] p-2.5">
          <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            <span className="block text-[12.5px] font-bold text-[var(--foreground)]">{t('compliance.alerts.convert')}</span>
            <span className="block text-[11.5px] text-[var(--foreground-muted)]">{t('compliance.alerts.convertHint')}</span>
          </span>
        </label>

        {!convert ? (
          <>
            <Field label={t('compliance.alerts.outcome')} htmlFor="dispose-status">
              <SelectInput id="dispose-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {DISPOSITIONS.map((s) => (
                  <option key={s} value={s}>
                    {humanizeEnum(s)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            {status === 'ASSIGNED' ? (
              <Field
                label={t('compliance.alerts.assignee')}
                htmlFor="dispose-assignee"
                hint={t('compliance.alerts.assigneeHint', { email: email || t('compliance.shell.notReported') })}
              >
                <TextInput
                  id="dispose-assignee"
                  type="email"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder={email || 'officer@koriepay.com'}
                />
              </Field>
            ) : null}
          </>
        ) : null}

        <InlineNotice tone={demoEnabled ? 'warning' : 'info'}>
          {t('compliance.alerts.disposeFootnote')}{' '}
          <Chip tone={demoEnabled ? 'medium' : 'clear'}>{demoEnabled ? 'Demo' : 'Live'}</Chip>{' '}
          {t('compliance.alerts.disposeEngineNote')}
        </InlineNotice>

        {action.status === 'error' ? (
          <p role="alert" className="text-[12px] font-semibold" style={{ color: 'var(--sev-critical)' }}>
            {action.result?.error?.message ?? t('compliance.actions.failedOutcome')}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
