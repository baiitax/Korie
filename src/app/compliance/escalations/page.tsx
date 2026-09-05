'use client';

/**
 * Consumer escalations — the complaints that landed on the compliance desk.
 *
 * Rows come from `ComplaintDisputeEngine` through `GET /api/complaints`, with
 * its own `?status &priority &country` filters used server-side. Transitions are
 * the engine's `TRANSITION_STATUS`, which owns the assignment, the resolution
 * timestamp and the SLA outcome.
 *
 * Two absences are deliberate and stated on screen: the engine's transition
 * takes a `notes` field it never persists (so this form does not offer one), and
 * the route's `COMPENSATE` action is not wired here because it trusts an amount
 * typed into the request body. Redress is settled in the module that can verify
 * the figure.
 */

import React, { useMemo, useState } from 'react';
import { ArrowRight, Flag, MessageSquareOff, RefreshCw, Wallet } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { transitionEscalation } from '@/services/compliance/mutations';
import { formatDate, formatMoney, humanizeEnum } from '@/services/compliance/format';
import type { EscalationRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Button,
  Chip,
  Drawer,
  Field,
  KeyList,
  PageHead,
  Panel,
  Provenance,
  SelectInput,
  SlaDue,
  SourceNotes,
  StatusChip,
  TextInput,
} from '@/components/compliance/ui';
import { InlineNotice, ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

const STATUSES = ['OPENED', 'ACKNOWLEDGED', 'CLASSIFIED', 'ASSIGNED', 'INVESTIGATING', 'PENDING_CUSTOMER', 'PENDING_PROVIDER', 'RESOLUTION_PROPOSED', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const OPEN = STATUSES.slice(0, 8);

export default function EscalationsPage() {
  const { t, locale, session } = useCompliancePortal();
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [open, setOpen] = useState<EscalationRow | null>(null);
  const [next, setNext] = useState('INVESTIGATING');
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const query = {
    ...(status !== 'ALL' ? { status } : {}),
    ...(priority !== 'ALL' ? { priority } : {}),
  };
  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('escalations', {
    query: Object.keys(query).length ? query : undefined,
  });

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return resource.data;
    return resource.data.filter((row) => `${row.reference} ${row.subject} ${row.category} ${row.assignedTo ?? ''}`.toLowerCase().includes(needle));
  }, [resource.data, term]);

  const filtersActive = term.trim().length > 0;
  const breached = resource.data.filter((row) => row.slaBreached).length;

  const transition = async () => {
    if (!open) return;
    setBusy(true);
    setError(null);
    const result = await transitionEscalation(open.id, next, assignee.trim() || undefined);
    setBusy(false);
    if (!result.ok) {
      setError([result.error?.message, result.error?.hint].filter(Boolean).join(' '));
      return;
    }
    setDone(t('compliance.escalations.transitioned', { reference: open.reference, status: humanizeEnum(next) }));
    setOpen(null);
    reload();
  };

  return (
    <>
      <PageHead
        title={t('compliance.escalations.title')}
        description={t('compliance.escalations.subtitle')}
        resource={resource}
        actions={
          <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={reload} pending={isLoading || isRefreshing}>
            {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      {breached > 0 ? (
        <InlineNotice tone="danger" icon={<Flag className="h-4 w-4" aria-hidden="true" />}>
          {t('compliance.escalations.breachedNotice', { count: breached })}
        </InlineNotice>
      ) : null}
      {done ? <InlineNotice tone="info">{done}</InlineNotice> : null}

      <ResourceState
        resource={resource}
        isLoading={isLoading}
        loadingLabel={t('compliance.escalations.loading')}
        emptyTitle={filtersActive ? t('compliance.states.emptyFiltered') : t('compliance.escalations.empty')}
        emptyBody={filtersActive ? undefined : t('compliance.escalations.emptyBody')}
        retryLabel={t('compliance.states.retry')}
        onRetry={reload}
        filtered={filtersActive}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.escalations.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.escalations.unavailable')}
      >
        <ComplianceTable
          rows={rows}
          columns={[
            {
              key: 'subject',
              header: t('compliance.escalations.col.subject'),
              primary: true,
              mobileLabel: t('compliance.escalations.col.subject'),
              sortValue: (row: EscalationRow) => row.subject,
              render: (row: EscalationRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.subject}</div>
                  <div className="cmp-ref truncate">
                    {row.reference} · {humanizeEnum(row.category)}
                  </div>
                </div>
              ),
            },
            {
              key: 'priority',
              header: t('compliance.escalations.col.priority'),
              mobileLabel: t('compliance.escalations.col.priority'),
              sortValue: (row: EscalationRow) => PRIORITIES.indexOf(row.priority),
              render: (row: EscalationRow) => <StatusChip status={row.priority} label={humanizeEnum(row.priority)} severity={row.priority === 'URGENT' || row.priority === 'HIGH'} />,
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: EscalationRow) => row.status,
              render: (row: EscalationRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
            },
            {
              key: 'amount',
              header: t('compliance.escalations.col.amount'),
              align: 'end',
              hideBelow: 'md',
              sortValue: (row: EscalationRow) => row.amount ?? -1,
              render: (row: EscalationRow) =>
                typeof row.amount === 'number' ? (
                  <span className="tabular">{formatMoney(row.amount, row.currency ?? 'NGN', { locale })}</span>
                ) : (
                  <span className="text-[12px] text-[var(--text-disabled)]">{t('compliance.shell.notReported')}</span>
                ),
            },
            {
              key: 'channel',
              header: t('compliance.escalations.col.channel'),
              hideBelow: 'lg',
              sortValue: (row: EscalationRow) => row.channel ?? '',
              render: (row: EscalationRow) => (row.channel ? <Chip tone="neutral">{row.channel}</Chip> : <span className="text-[12px] text-[var(--text-disabled)]">—</span>),
            },
            {
              key: 'sla',
              header: t('compliance.escalations.col.sla'),
              hideBelow: 'md',
              sortValue: (row: EscalationRow) => row.slaDueAt ?? '',
              render: (row: EscalationRow) => (
                <SlaDue dueAt={row.slaDueAt} breached={Boolean(row.slaBreached)} overdueLabel={t('compliance.escalations.slaBreached')} dueLabel={t('compliance.escalations.slaDue')} />
              ),
            },
            {
              key: 'act',
              header: '',
              render: (row: EscalationRow) => (
                <button
                  type="button"
                  className="cmp-btn cmp-btn--ghost px-2"
                  onClick={() => {
                    setOpen(row);
                    setError(null);
                    setNext(OPEN.includes(row.status) ? 'INVESTIGATING' : 'RESOLVED');
                  }}
                >
                  {t('compliance.escalations.transition')}
                </button>
              ),
            },
          ]}
          getRowId={(row: EscalationRow) => row.id}
          getRowTone={(row: EscalationRow) => (row.slaBreached ? 'critical' : undefined)}
          labels={makeTableLabels(t, t('compliance.escalations.title'))}
          pageSize={12}
          footnote={<Provenance resource={resource} detail={t('compliance.escalations.provenanceDetail')} />}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.escalations.searchLabel')}
              searchPlaceholder={t('compliance.escalations.searchPlaceholder')}
              onClear={filtersActive ? () => setTerm('') : undefined}
              clearLabel={t('compliance.states.clearFilters')}
              resultCount={rows.length}
              resultLabel={(count) => t('compliance.escalations.resultCount', { count })}
            >
              <SelectInput aria-label={t('compliance.common.status')} value={status} onChange={(e) => setStatus(e.target.value)} className="h-[38px] w-[178px]">
                <option value="ALL">{t('compliance.escalations.statusAll')}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanizeEnum(s)}
                  </option>
                ))}
              </SelectInput>
              <SelectInput aria-label={t('compliance.escalations.col.priority')} value={priority} onChange={(e) => setPriority(e.target.value)} className="h-[38px] w-[140px]">
                <option value="ALL">{t('compliance.escalations.priorityAll')}</option>
                {PRIORITIES.map((s) => (
                  <option key={s} value={s}>
                    {humanizeEnum(s)}
                  </option>
                ))}
              </SelectInput>
            </TableToolbar>
          }
        />
      </ResourceState>

      <Panel title={t('compliance.escalations.whatThisIsNot')}>
        <ul className="space-y-2">
          {[
            { icon: <MessageSquareOff className="h-3.5 w-3.5" aria-hidden="true" />, text: t('compliance.escalations.noNotesNote') },
            { icon: <Wallet className="h-3.5 w-3.5" aria-hidden="true" />, text: t('compliance.escalations.noCompensationNote') },
          ].map((item) => (
            <li key={item.text} className="flex items-start gap-2 text-[12.5px] leading-[1.55] text-[var(--foreground-muted)]">
              <span className="mt-0.5 text-[var(--foreground)]">{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>
      </Panel>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        closeLabel={t('compliance.shell.close')}
        title={open ? t('compliance.escalations.drawerTitle', { reference: open.reference }) : ''}
        subtitle={open ? `${open.subject} · ${formatDate(open.raisedAt, 'full', { locale })}` : undefined}
        eyebrow={open ? <StatusChip status={open.status} label={humanizeEnum(open.status)} /> : undefined}
        actions={
          <Button variant="primary" onClick={transition} pending={busy} disabled={!OPEN.includes(open?.status ?? '') && open?.status !== 'PENDING_CUSTOMER' && open?.status !== 'PENDING_PROVIDER'}>
            {t('compliance.escalations.confirmTransition')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        }
      >
        {open ? (
          <div className="space-y-4">
            <Panel title={t('compliance.escalations.complaint')}>
              <p className="text-[13px] leading-[1.55] text-[var(--foreground)]">{open.description ?? t('compliance.shell.notReported')}</p>
            </Panel>

            <Panel title={t('compliance.escalations.facts')}>
              <KeyList
                items={[
                  { term: t('compliance.escalations.col.priority'), value: <StatusChip status={open.priority} label={humanizeEnum(open.priority)} severity={open.priority === 'URGENT'} /> },
                  { term: t('compliance.escalations.col.amount'), value: typeof open.amount === 'number' ? formatMoney(open.amount, open.currency ?? 'NGN', { locale }) : t('compliance.shell.notReported') },
                  { term: t('compliance.escalations.col.channel'), value: open.channel ?? t('compliance.shell.notReported') },
                  { term: t('compliance.escalations.col.assigned'), value: open.assignedTo ?? t('compliance.shell.notReported') },
                  { term: t('compliance.escalations.col.jurisdiction'), value: open.jurisdiction ?? t('compliance.shell.notReported') },
                  { term: t('compliance.escalations.linked'), value: open.linkedRef ? <span className="cmp-ref">{open.linkedRef}</span> : t('compliance.shell.notReported') },
                  {
                    term: t('compliance.escalations.col.sla'),
                    value: (
                      <SlaDue dueAt={open.slaDueAt} breached={Boolean(open.slaBreached)} overdueLabel={t('compliance.escalations.slaBreached')} dueLabel={t('compliance.escalations.slaDue')} />
                    ),
                  },
                ]}
              />
            </Panel>

            <Panel title={t('compliance.escalations.transition')}>
              <div className="space-y-3">
                <Field label={t('compliance.escalations.nextStatus')} htmlFor="esc-status" hint={t('compliance.escalations.nextStatusHint')}>
                  <SelectInput id="esc-status" value={next} onChange={(e) => setNext(e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {humanizeEnum(s)}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field
                  label={t('compliance.escalations.assignee')}
                  htmlFor="esc-assignee"
                  hint={t('compliance.escalations.assigneeHint', { email: session?.email ?? t('compliance.shell.notReported') })}
                >
                  <TextInput id="esc-assignee" type="email" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder={session?.email ?? 'officer@koriepay.com'} />
                </Field>
                <InlineNotice tone="neutral">{t('compliance.escalations.transitionFootnote')}</InlineNotice>
                {error ? (
                  <p role="alert" className="text-[12px] font-semibold" style={{ color: 'var(--sev-critical)' }}>
                    {error}
                  </p>
                ) : null}
              </div>
            </Panel>
          </div>
        ) : null}
      </Drawer>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.escalations.title'),
            source: 'GET /api/complaints?status&priority → ComplaintDisputeEngine.getComplaints()',
            note: t('compliance.escalations.sourceNoteList'),
            mode: resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.escalations.transition'),
            source: "PATCH /api/complaints/:id { action: 'TRANSITION_STATUS', status, assignedToEmail }",
            note: t('compliance.escalations.sourceNoteTransition'),
            mode: 'live',
          },
          {
            section: t('compliance.escalations.noCompensationNote'),
            source: '—',
            note: t('compliance.escalations.sourceNoteCompensation'),
            mode: 'none',
          },
        ]}
      />
    </>
  );
}
