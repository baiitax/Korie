'use client';

/**
 * Account restrictions — live from customer_account_restrictions, with a real
 * lift action.
 *
 * The previous screen listed the mock store's restrictions. This one reads the
 * enforcement register: every ACTIVE restriction on a customer account, who
 * applied it, and whether it has been lifted and by whom. "Lift restriction"
 * is a real, audited PATCH (is_active=false, lifted_by stamped from the
 * verified session, before/after state written to audit_events) — it is
 * offered only for restrictions that are currently active.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw, ShieldOff } from 'lucide-react';
import { useComplianceResource, useComplianceAction } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { RestrictionRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { complianceFetch } from '@/lib/compliancePortalClient';
import { Button, Chip, PageHead, SourceNotes, StatusChip, Modal } from '@/components/compliance/ui';
import { ResourceState, InlineNotice } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

export default function ComplianceRestrictionsPage() {
  const { t } = useCompliancePortal();
  const restrictions = useComplianceResource('restrictions');
  const action = useComplianceAction();
  const [term, setTerm] = useState('');
  const [lifting, setLifting] = useState<RestrictionRow | null>(null);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return restrictions.resource.data;
    return restrictions.resource.data.filter((row: RestrictionRow) =>
      `${row.subjectId} ${row.type} ${row.reason}`.toLowerCase().includes(q),
    );
  }, [restrictions.resource.data, term]);

  const confirmLift = async () => {
    if (!lifting) return;
    const out = await action.run(async () => {
      const res = await complianceFetch(`/api/compliance/data/customer-restrictions/${encodeURIComponent(lifting.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false, notes: `Lifted from the compliance console. Original reason: ${lifting.reason}` }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.status === 'error') {
        return {
          ok: false,
          recorded: false,
          source: 'live' as const,
          error: { code: `HTTP_${res.status}`, message: payload?.error?.message ?? 'The lift was refused.' },
        };
      }
      return { ok: true, recorded: true, source: 'live' as const, value: payload?.record, error: undefined };
    });
    if (out.ok) {
      setLifting(null);
      restrictions.reload();
    }
  };

  return (
    <>
      <PageHead
        title={t('compliance.restrictions.title')}
        description={t('compliance.restrictions.subtitle')}
        resource={restrictions.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={restrictions.reload}
            pending={restrictions.isLoading || restrictions.isRefreshing}
          >
            {restrictions.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      {action.result?.error ? (
        <InlineNotice tone="danger">{action.result.error.message}</InlineNotice>
      ) : null}
      {action.result?.ok ? <InlineNotice tone="info">{t('compliance.actions.liveOutcome')}</InlineNotice> : null}

      <ResourceState
        resource={restrictions.resource}
        isLoading={restrictions.isLoading}
        loadingLabel={t('compliance.restrictions.loading')}
        emptyTitle={t('compliance.restrictions.empty')}
        emptyBody={t('compliance.restrictions.emptyBody')}
        filtered={term !== ''}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.restrictions.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.restrictions.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={restrictions.reload}
      >
        <ComplianceTable
          rows={filtered}
          getRowId={(row: RestrictionRow) => row.id}
          getRowTone={(row: RestrictionRow) => (row.status === 'ACTIVE' && (row.type.includes('FREEZE') || row.type.includes('BLOCK')) ? 'critical' : undefined)}
          labels={makeTableLabels(t, t('compliance.restrictions.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.restrictions.searchLabel')}
              searchPlaceholder={t('compliance.restrictions.searchPlaceholder')}
            />
          }
          columns={[
            {
              key: 'account',
              header: t('compliance.restrictions.col.account'),
              primary: true,
              mobileLabel: t('compliance.restrictions.col.account'),
              sortValue: (row: RestrictionRow) => row.subjectId,
              render: (row: RestrictionRow) => (
                <div className="min-w-0">
                  <div className="cmp-ref truncate">{row.subjectId}</div>
                  <div className="cmp-ref truncate">{row.id.slice(0, 8)}</div>
                </div>
              ),
            },
            {
              key: 'type',
              header: t('compliance.restrictions.col.type'),
              mobileLabel: t('compliance.restrictions.col.type'),
              sortValue: (row: RestrictionRow) => row.type,
              render: (row: RestrictionRow) => <Chip tone="neutral">{humanizeEnum(row.type)}</Chip>,
            },
            {
              key: 'reason',
              header: t('compliance.restrictions.col.reason'),
              mobileLabel: t('compliance.restrictions.col.reason'),
              hideBelow: 'md',
              sortValue: (row: RestrictionRow) => row.reason,
              render: (row: RestrictionRow) => <span className="text-[12px] text-[var(--foreground-muted)]">{row.reason || '—'}</span>,
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: RestrictionRow) => row.status,
              render: (row: RestrictionRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} severity={row.status === 'ACTIVE'} />,
            },
            {
              key: 'applied',
              header: t('compliance.restrictions.col.applied'),
              mobileLabel: t('compliance.restrictions.col.applied'),
              hideBelow: 'lg',
              sortValue: (row: RestrictionRow) => Date.parse(row.appliedAt ?? '') || 0,
              render: (row: RestrictionRow) => (
                <div className="min-w-0">
                  <div className="cmp-ref">{row.appliedAt ? formatDate(row.appliedAt) : '—'}</div>
                  <div className="cmp-ref truncate">{row.makerName ?? ''}</div>
                </div>
              ),
            },
            {
              key: 'lift',
              header: '',
              render: (row: RestrictionRow) =>
                row.status === 'ACTIVE' ? (
                  <Button variant="danger" icon={<ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setLifting(row)}>
                    {t('compliance.restrictions.lift')}
                  </Button>
                ) : (
                  <span className="cmp-ref">{row.checkerName ? `${t('compliance.restrictions.liftedBy')} ${row.checkerName}` : ''}</span>
                ),
            },
          ]}
        />
      </ResourceState>

      <Modal
        open={lifting !== null}
        onClose={() => setLifting(null)}
        title={t('compliance.restrictions.liftConfirmTitle')}
        closeLabel={t('compliance.actions.cancel')}
        footer={
          <>
            <Button onClick={() => setLifting(null)}>{t('compliance.actions.cancel')}</Button>
            <Button variant="danger" pending={action.showPending} onClick={confirmLift}>
              {action.showPending ? t('compliance.actions.saving') : t('compliance.restrictions.liftConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-[var(--foreground-muted)]">
          {t('compliance.restrictions.liftConfirmBody', {
            type: lifting ? humanizeEnum(lifting.type) : '',
            account: lifting?.subjectId ?? '',
          })}
        </p>
      </Modal>

      <SourceNotes
        title={t('compliance.restrictions.sourcesTitle')}
        rows={[
          {
            section: t('compliance.restrictions.sourcesRows'),
            source: 'GET /api/compliance/data/customer-restrictions',
            note: t('compliance.restrictions.sourcesNote'),
            mode: 'live',
          },
          {
            section: t('compliance.restrictions.sourcesLift'),
            source: 'PATCH /api/compliance/data/customer-restrictions/:id',
            note: t('compliance.restrictions.sourcesLiftNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
