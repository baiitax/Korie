'use client';

/**
 * KYB review queue — live from the master identity organizations table.
 *
 * Replaces the mock-store version. Verification state, risk level and entity
 * status come from identity_organizations; where the organization has not
 * declared a trading name or industry, the row says nothing rather than
 * guessing a sector.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { KybRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

const KYB_STATUSES = ['PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED'] as const;

export default function KybPage() {
  const { t } = useCompliancePortal();
  const kyb = useComplianceResource('kyb');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return kyb.resource.data.filter((row: KybRow) => {
      if (status !== 'ALL' && row.kybStatus !== status) return false;
      if (!q) return true;
      return `${row.legalName} ${row.tradingName ?? ''} ${row.identityReference} ${row.registrationNumber}`.toLowerCase().includes(q);
    });
  }, [kyb.resource.data, term, status]);

  return (
    <>
      <PageHead
        title={t('compliance.kyb.title')}
        description={t('compliance.kyb.subtitle')}
        resource={kyb.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={kyb.reload}
            pending={kyb.isLoading || kyb.isRefreshing}
          >
            {kyb.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={kyb.resource}
        isLoading={kyb.isLoading}
        loadingLabel={t('compliance.kyb.loading')}
        emptyTitle={t('compliance.kyb.empty')}
        emptyBody={t('compliance.kyb.emptyBody')}
        filtered={term !== '' || status !== 'ALL'}
        onClearFilters={() => {
          setTerm('');
          setStatus('ALL');
        }}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.kyb.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.kyb.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={kyb.reload}
      >
        <ComplianceTable
          rows={filtered}
          getRowId={(row: KybRow) => row.id}
          labels={makeTableLabels(t, t('compliance.kyb.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.kyb.searchLabel')}
              searchPlaceholder={t('compliance.kyb.searchPlaceholder')}
            >
              <select
                aria-label={t('compliance.kyb.statusFilter')}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="cmp-input max-w-[210px]"
              >
                <option value="ALL">{t('compliance.kyb.allStatuses')}</option>
                {KYB_STATUSES.map((s) => (
                  <option key={s} value={s}>{humanizeEnum(s)}</option>
                ))}
              </select>
            </TableToolbar>
          }
          columns={[
            {
              key: 'org',
              header: t('compliance.kyb.col.org'),
              primary: true,
              mobileLabel: t('compliance.kyb.col.org'),
              sortValue: (row: KybRow) => row.legalName,
              render: (row: KybRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.legalName}</div>
                  <div className="cmp-ref truncate">
                    {row.identityReference}
                    {row.tradingName ? ` · ${row.tradingName}` : ''}
                  </div>
                </div>
              ),
            },
            {
              key: 'registration',
              header: t('compliance.kyb.col.registration'),
              mobileLabel: t('compliance.kyb.col.registration'),
              hideBelow: 'md',
              sortValue: (row: KybRow) => row.registrationNumber,
              render: (row: KybRow) => <span className="cmp-ref">{row.registrationNumber || '—'}</span>,
            },
            {
              key: 'country',
              header: t('compliance.common.jurisdiction'),
              mobileLabel: t('compliance.common.jurisdiction'),
              hideBelow: 'md',
              sortValue: (row: KybRow) => row.countryCode,
              render: (row: KybRow) => <span className="cmp-ref">{row.countryCode || '—'}</span>,
            },
            {
              key: 'risk',
              header: t('compliance.common.risk'),
              mobileLabel: t('compliance.common.risk'),
              hideBelow: 'md',
              sortValue: (row: KybRow) => row.riskLevel,
              render: (row: KybRow) =>
                row.riskLevel ? <StatusChip status={row.riskLevel} label={humanizeEnum(row.riskLevel)} severity={row.riskLevel === 'HIGH' || row.riskLevel === 'CRITICAL'} /> : <span className="cmp-ref">—</span>,
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: KybRow) => row.kybStatus,
              render: (row: KybRow) => <StatusChip status={row.kybStatus} label={humanizeEnum(row.kybStatus)} />,
            },
            {
              key: 'updated',
              header: t('compliance.common.updated'),
              mobileLabel: t('compliance.common.updated'),
              hideBelow: 'lg',
              sortValue: (row: KybRow) => Date.parse(row.updatedAt) || 0,
              render: (row: KybRow) => <span className="cmp-ref">{formatDate(row.updatedAt)}</span>,
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.kyb.sourcesTitle')}
        rows={[
          {
            section: t('compliance.kyb.sourcesRows'),
            source: 'GET /api/compliance/data/identity-organizations',
            note: t('compliance.kyb.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
