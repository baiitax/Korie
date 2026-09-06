'use client';

/**
 * KYC review queue — live from the master identity table.
 *
 * The previous version of this screen rendered the legacy mock store's
 * verification records (with invented NIN/BVN masks and address states). This
 * version reads identity_persons through the compliance data plane; fields the
 * identity table does not carry (NIN/BVN masks, address verification) are not
 * shown at all rather than invented, and the deep review lives on the customer
 * file, which is where the document vault is read per identity.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { KycRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

const KYC_TIERS = ['TIER_1', 'TIER_2', 'TIER_3'] as const;
const KYC_STATUSES = ['PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED'] as const;

export default function KycPage() {
  const { t } = useCompliancePortal();
  const kyc = useComplianceResource('kyc');
  const [term, setTerm] = useState('');
  const [tier, setTier] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return kyc.resource.data.filter((row: KycRow) => {
      if (tier !== 'ALL' && row.tier !== tier) return false;
      if (status !== 'ALL' && row.status !== status) return false;
      if (!q) return true;
      return `${row.customerName} ${row.identityReference} ${row.countryCode ?? ''}`.toLowerCase().includes(q);
    });
  }, [kyc.resource.data, term, tier, status]);

  return (
    <>
      <PageHead
        title={t('compliance.kyc.title')}
        description={t('compliance.kyc.subtitle')}
        resource={kyc.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={kyc.reload}
            pending={kyc.isLoading || kyc.isRefreshing}
          >
            {kyc.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={kyc.resource}
        isLoading={kyc.isLoading}
        loadingLabel={t('compliance.kyc.loading')}
        emptyTitle={t('compliance.kyc.empty')}
        emptyBody={t('compliance.kyc.emptyBody')}
        filtered={term !== '' || tier !== 'ALL' || status !== 'ALL'}
        onClearFilters={() => {
          setTerm('');
          setTier('ALL');
          setStatus('ALL');
        }}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.kyc.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.kyc.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={kyc.reload}
      >
        <ComplianceTable
          rows={filtered}
          getRowId={(row: KycRow) => row.id}
          getRowHref={(row: KycRow) => `/compliance/customers/${row.id}`}
          labels={makeTableLabels(t, t('compliance.kyc.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.kyc.searchLabel')}
              searchPlaceholder={t('compliance.kyc.searchPlaceholder')}
            >
              <select
                aria-label={t('compliance.kyc.tierFilter')}
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="cmp-input max-w-[190px]"
              >
                <option value="ALL">{t('compliance.kyc.allTiers')}</option>
                {KYC_TIERS.map((s) => (
                  <option key={s} value={s}>{humanizeEnum(s)}</option>
                ))}
              </select>
              <select
                aria-label={t('compliance.kyc.statusFilter')}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="cmp-input max-w-[210px]"
              >
                <option value="ALL">{t('compliance.kyc.allStatuses')}</option>
                {KYC_STATUSES.map((s) => (
                  <option key={s} value={s}>{humanizeEnum(s)}</option>
                ))}
              </select>
            </TableToolbar>
          }
          columns={[
            {
              key: 'customer',
              header: t('compliance.kyc.col.customer'),
              primary: true,
              mobileLabel: t('compliance.kyc.col.customer'),
              sortValue: (row: KycRow) => row.customerName,
              render: (row: KycRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.customerName}</div>
                  <div className="cmp-ref truncate">{row.identityReference}</div>
                </div>
              ),
            },
            {
              key: 'tier',
              header: t('compliance.kyc.col.tier'),
              mobileLabel: t('compliance.kyc.col.tier'),
              sortValue: (row: KycRow) => row.tier,
              render: (row: KycRow) => <Chip tone="neutral">{humanizeEnum(row.tier)}</Chip>,
            },
            {
              key: 'country',
              header: t('compliance.common.jurisdiction'),
              mobileLabel: t('compliance.common.jurisdiction'),
              hideBelow: 'md',
              sortValue: (row: KycRow) => row.countryCode,
              render: (row: KycRow) => <span className="cmp-ref">{row.countryCode || '—'}</span>,
            },
            {
              key: 'risk',
              header: t('compliance.common.risk'),
              mobileLabel: t('compliance.common.risk'),
              hideBelow: 'md',
              sortValue: (row: KycRow) => row.riskLevel,
              render: (row: KycRow) =>
                row.riskLevel ? <StatusChip status={row.riskLevel} label={humanizeEnum(row.riskLevel)} severity={row.riskLevel === 'HIGH' || row.riskLevel === 'CRITICAL'} /> : <span className="cmp-ref">—</span>,
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: KycRow) => row.status,
              render: (row: KycRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
            },
            {
              key: 'updated',
              header: t('compliance.common.updated'),
              mobileLabel: t('compliance.common.updated'),
              hideBelow: 'lg',
              sortValue: (row: KycRow) => Date.parse(row.updatedAt) || 0,
              render: (row: KycRow) => <span className="cmp-ref">{formatDate(row.updatedAt)}</span>,
            },
            {
              key: 'open',
              header: '',
              render: (row: KycRow) => (
                <Link href={`/compliance/customers/${row.id}`} className="cmp-btn inline-flex">
                  {t('compliance.kyc.openFile')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ),
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.kyc.sourcesTitle')}
        rows={[
          {
            section: t('compliance.kyc.sourcesRows'),
            source: 'GET /api/compliance/data/identity-persons',
            note: t('compliance.kyc.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
