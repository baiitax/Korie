'use client';

/**
 * Privileged-access approvals.
 *
 * These rows are real just-in-time elevation requests from
 * `PrivilegedAccessEngine` (`GET /api/security/pam/requests`). The one action
 * this screen offers — approve — is the engine's own dual-authorization call,
 * and the separation-of-duties rule is enforced *server-side*: the requester is
 * refused as their own checker. The form repeats that rule locally so the
 * officer learns before submitting, never instead of the check.
 *
 * There is deliberately no "decline" button. The deployment has no decline
 * endpoint, so a decline would be a UI state that nothing remembers — which in
 * an access-approval queue is worse than no button at all.
 */

import React, { useMemo, useState } from 'react';
import { BadgeCheck, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { approvePamRequest } from '@/services/compliance/mutations';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { ApprovalRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Button,
  Chip,
  Field,
  KeyList,
  Modal,
  PageHead,
  Panel,
  Provenance,
  SlaDue,
  SourceNotes,
  StatusChip,
  TextInput,
} from '@/components/compliance/ui';
import { InlineNotice, ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

const OPEN_STATES = ['PENDING', 'REQUESTED', 'SUBMITTED', 'UNDER_REVIEW'];

export default function ApprovalsPage() {
  const { t, locale, session } = useCompliancePortal();
  const [term, setTerm] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const [target, setTarget] = useState<ApprovalRow | null>(null);
  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('approvals');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return resource.data.filter((row) => {
      if (openOnly && !OPEN_STATES.includes(row.status)) return false;
      if (!needle) return true;
      return `${row.reference} ${row.requester} ${row.requestedAccess} ${row.reason ?? ''}`.toLowerCase().includes(needle);
    });
  }, [resource.data, term, openOnly]);

  const openCount = resource.data.filter((row) => OPEN_STATES.includes(row.status)).length;
  const filtersActive = term.trim().length > 0 || openOnly;
  const checker = (session?.email ?? '').toLowerCase();
  const selfApproval = Boolean(target && checker && target.requester.toLowerCase() === checker);

  const approve = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    const result = await approvePamRequest(target.id, session?.email ?? 'checker@koriepay.com');
    setBusy(false);
    if (!result.ok) {
      setError([result.error?.message, result.error?.hint].filter(Boolean).join(' '));
      return;
    }
    setDone(
      t('compliance.approvals.approved', {
        reference: target.reference,
        until: result.value?.expiresAt ? formatDate(result.value.expiresAt, 'short', { locale }) : t('compliance.shell.notReported'),
      }),
    );
    setTarget(null);
    reload();
  };

  return (
    <>
      <PageHead
        title={t('compliance.approvals.title')}
        description={t('compliance.approvals.subtitle')}
        resource={resource}
        actions={
          <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={reload} pending={isLoading || isRefreshing}>
            {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      {done ? (
        <InlineNotice tone="info" icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}>
          {done}
        </InlineNotice>
      ) : null}

      <ResourceState
        resource={resource}
        isLoading={isLoading}
        loadingLabel={t('compliance.approvals.loading')}
        emptyTitle={filtersActive ? t('compliance.states.emptyFiltered') : t('compliance.approvals.empty')}
        emptyBody={filtersActive ? undefined : t('compliance.approvals.emptyBody')}
        retryLabel={t('compliance.states.retry')}
        onRetry={reload}
        filtered={filtersActive}
        onClearFilters={() => {
          setTerm('');
          setOpenOnly(false);
        }}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.approvals.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.approvals.unavailable')}
      >
        <ComplianceTable
          rows={rows}
          columns={[
            {
              key: 'reference',
              header: t('compliance.approvals.col.reference'),
              primary: true,
              mobileLabel: t('compliance.approvals.col.reference'),
              sortValue: (row: ApprovalRow) => row.reference,
              render: (row: ApprovalRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.reference}</div>
                  <div className="cmp-ref truncate">{row.ticket ? `ticket ${row.ticket}` : 'no change ticket'}</div>
                </div>
              ),
            },
            {
              key: 'requester',
              header: t('compliance.approvals.col.requester'),
              mobileLabel: t('compliance.approvals.col.requester'),
              sortValue: (row: ApprovalRow) => row.requester,
              render: (row: ApprovalRow) => (
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-[var(--foreground)]">{row.requester || t('compliance.shell.notReported')}</div>
                  <div className="truncate text-[11.5px] text-[var(--foreground-muted)]">{row.reason ?? t('compliance.approvals.noReason')}</div>
                </div>
              ),
            },
            {
              key: 'access',
              header: t('compliance.approvals.col.access'),
              mobileLabel: t('compliance.approvals.col.access'),
              hideBelow: 'md',
              sortValue: (row: ApprovalRow) => row.requestedAccess,
              render: (row: ApprovalRow) => <Chip tone="medium">{humanizeEnum(row.requestedAccess)}</Chip>,
            },
            {
              key: 'duration',
              header: t('compliance.approvals.col.duration'),
              align: 'end',
              hideBelow: 'lg',
              sortValue: (row: ApprovalRow) => row.durationMinutes ?? -1,
              render: (row: ApprovalRow) =>
                typeof row.durationMinutes === 'number' ? (
                  <span className="tabular text-[12.5px]">{t('compliance.approvals.minutes', { minutes: row.durationMinutes })}</span>
                ) : (
                  <span className="text-[12px] text-[var(--text-disabled)]">{t('compliance.shell.notReported')}</span>
                ),
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: ApprovalRow) => row.status,
              render: (row: ApprovalRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} severity={OPEN_STATES.includes(row.status)} />,
            },
            {
              key: 'lease',
              header: t('compliance.approvals.col.lease'),
              hideBelow: 'lg',
              sortValue: (row: ApprovalRow) => row.expiresAt ?? '',
              render: (row: ApprovalRow) =>
                row.expiresAt ? (
                  <span className="flex flex-col items-end gap-0.5">
                    <SlaDue
                      dueAt={row.expiresAt}
                      breached={Date.parse(row.expiresAt) < Date.now() && row.status === 'APPROVED'}
                      overdueLabel={t('compliance.approvals.leaseExpired')}
                      dueLabel={t('compliance.approvals.leaseUntil')}
                    />
                    {row.decidedBy ? <span className="text-[11px] text-[var(--foreground-muted)]">✓ {row.decidedBy}</span> : null}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--text-disabled)]">{t('compliance.shell.notReported')}</span>
                ),
            },
            {
              key: 'act',
              header: '',
              render: (row: ApprovalRow) =>
                OPEN_STATES.includes(row.status) ? (
                  <button type="button" className="cmp-btn cmp-btn--ghost px-2" onClick={() => { setTarget(row); setError(null); }}>
                    {t('compliance.approvals.approve')}
                  </button>
                ) : null,
            },
          ]}
          getRowId={(row: ApprovalRow) => row.id}
          labels={makeTableLabels(t, t('compliance.approvals.title'))}
          pageSize={12}
          initialSort={{ key: 'status', dir: 'asc' }}
          footnote={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Provenance resource={resource} detail={t('compliance.approvals.provenanceDetail')} />
              <span className="text-[11.5px] tabular text-[var(--foreground-muted)]">{t('compliance.approvals.openCount', { count: openCount })}</span>
            </div>
          }
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.approvals.searchLabel')}
              searchPlaceholder={t('compliance.approvals.searchPlaceholder')}
              onClear={
                filtersActive
                  ? () => {
                      setTerm('');
                      setOpenOnly(false);
                    }
                  : undefined
              }
              clearLabel={t('compliance.states.clearFilters')}
              resultCount={rows.length}
              resultLabel={(count) => t('compliance.approvals.resultCount', { count })}
            >
              <button type="button" className="cmp-btn" aria-pressed={openOnly} onClick={() => setOpenOnly((v) => !v)}>
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {t('compliance.approvals.openOnly')}
              </button>
            </TableToolbar>
          }
        />
      </ResourceState>

      <Panel title={t('compliance.approvals.rulesTitle')}>
        <div className="grid gap-2 md:grid-cols-2">
          {[
            { term: t('compliance.approvals.rule1'), value: t('compliance.approvals.rule1Body') },
            { term: t('compliance.approvals.rule2'), value: t('compliance.approvals.rule2Body') },
            { term: t('compliance.approvals.rule3'), value: t('compliance.approvals.rule3Body') },
            { term: t('compliance.approvals.rule4'), value: t('compliance.approvals.rule4Body') },
          ].map((rule) => (
            <div key={rule.term} className="rounded-[10px] border border-[var(--border)] p-2.5">
              <div className="text-[12.5px] font-bold text-[var(--foreground)]">{rule.term}</div>
              <div className="mt-0.5 text-[11.5px] leading-[1.5] text-[var(--foreground-muted)]">{rule.value}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={t('compliance.approvals.approveTitle')}
        description={target ? t('compliance.approvals.approveBody', { reference: target.reference }) : ''}
        closeLabel={t('compliance.shell.close')}
        footer={
          <>
            <Button onClick={() => setTarget(null)}>{t('compliance.actions.cancel')}</Button>
            <Button variant="primary" onClick={approve} pending={busy} disabled={selfApproval}>
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t('compliance.approvals.approve')}
            </Button>
          </>
        }
      >
        {target ? (
          <div className="space-y-3">
            <KeyList
              items={[
                { term: t('compliance.approvals.col.requester'), value: target.requester },
                { term: t('compliance.approvals.col.access'), value: humanizeEnum(target.requestedAccess) },
                { term: t('compliance.approvals.col.duration'), value: typeof target.durationMinutes === 'number' ? t('compliance.approvals.minutes', { minutes: target.durationMinutes }) : t('compliance.shell.notReported') },
                { term: t('compliance.approvals.reason'), value: target.reason ?? t('compliance.approvals.noReason') },
                { term: t('compliance.approvals.col.reference'), value: <span className="cmp-ref">{target.reference}</span> },
              ]}
            />
            <Field
              label={t('compliance.approvals.checker')}
              htmlFor="pam-checker"
              hint={t('compliance.approvals.checkerHint', { email: session?.email ?? t('compliance.shell.notReported') })}
              error={selfApproval ? t('compliance.approvals.selfApprovalBlocked') : undefined}
            >
              <TextInput id="pam-checker" value={session?.email ?? ''} readOnly className="opacity-70" />
            </Field>
            <InlineNotice tone="neutral">{t('compliance.approvals.approveFootnote')}</InlineNotice>
            {error ? (
              <p role="alert" className="text-[12px] font-semibold" style={{ color: 'var(--sev-critical)' }}>
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.approvals.title'),
            source: 'GET /api/security/pam/requests → PrivilegedAccessEngine.getRequests()',
            note: t('compliance.approvals.sourceNoteList'),
            mode: resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.approvals.approve'),
            source: 'POST /api/security/pam/requests/:id/approve { checkerEmail }',
            note: t('compliance.approvals.sourceNoteApprove'),
            mode: 'live',
          },
          {
            section: t('compliance.approvals.declineSection'),
            source: '—',
            note: t('compliance.approvals.sourceNoteDecline'),
            mode: 'none',
          },
        ]}
      />
    </>
  );
}
