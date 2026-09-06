'use client';

/**
 * High-risk merchant intelligence — live from merchant_intelligence_profiles.
 *
 * Replaces the mock merchant watchlist. Growth, dispute ratio and processing
 * margin come from the intelligence profile table; with no profiles
 * registered, the screen says so instead of inventing merchants.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, humanizeEnum } from '@/services/compliance/format';
import type { MerchantProfileRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

export default function MerchantsPage() {
  const { t } = useCompliancePortal();
  const merchants = useComplianceResource('merchantProfiles');
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return merchants.resource.data;
    return merchants.resource.data.filter((row: MerchantProfileRow) => row.businessName.toLowerCase().includes(q));
  }, [merchants.resource.data, term]);

  return (
    <>
      <PageHead
        title={t('compliance.merchants.title')}
        description={t('compliance.merchants.subtitle')}
        resource={merchants.resource}
        actions={
          <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={merchants.reload} pending={merchants.isLoading || merchants.isRefreshing}>
            {merchants.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={merchants.resource}
        isLoading={merchants.isLoading}
        loadingLabel={t('compliance.merchants.loading')}
        emptyTitle={t('compliance.merchants.empty')}
        emptyBody={t('compliance.merchants.emptyBody')}
        filtered={term !== ''}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.merchants.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.merchants.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={merchants.reload}
      >
        <ComplianceTable
          rows={filtered}
          getRowId={(row: MerchantProfileRow) => row.id}
          getRowTone={(row: MerchantProfileRow) => ((row.disputeRatioPct ?? 0) >= 3 ? 'high' : undefined)}
          labels={makeTableLabels(t, t('compliance.merchants.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.merchants.searchLabel')}
              searchPlaceholder={t('compliance.merchants.searchPlaceholder')}
            />
          }
          columns={[
            {
              key: 'merchant',
              header: t('compliance.merchants.col.merchant'),
              primary: true,
              mobileLabel: t('compliance.merchants.col.merchant'),
              sortValue: (row: MerchantProfileRow) => row.businessName,
              render: (row: MerchantProfileRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.businessName}</div>
                  <div className="cmp-ref truncate">{row.id.slice(0, 8)}</div>
                </div>
              ),
            },
            {
              key: 'gmv',
              header: t('compliance.merchants.col.gmv'),
              mobileLabel: t('compliance.merchants.col.gmv'),
              hideBelow: 'md',
              sortValue: (row: MerchantProfileRow) => row.monthlyGmv ?? -1,
              render: (row: MerchantProfileRow) => (
                <span className="tabular">{typeof row.monthlyGmv === 'number' ? formatMoney(row.monthlyGmv, 'NGN') : '—'}</span>
              ),
            },
            {
              key: 'disputes',
              header: t('compliance.merchants.col.disputes'),
              mobileLabel: t('compliance.merchants.col.disputes'),
              sortValue: (row: MerchantProfileRow) => row.disputeRatioPct ?? -1,
              render: (row: MerchantProfileRow) => (
                <span className={`tabular ${typeof row.disputeRatioPct === 'number' && row.disputeRatioPct >= 3 ? 'font-bold text-red-600' : ''}`}>
                  {typeof row.disputeRatioPct === 'number' ? `${row.disputeRatioPct}%` : '—'}
                </span>
              ),
            },
            {
              key: 'growth',
              header: t('compliance.merchants.col.growth'),
              mobileLabel: t('compliance.merchants.col.growth'),
              hideBelow: 'lg',
              sortValue: (row: MerchantProfileRow) => row.growthTrendPct ?? -999,
              render: (row: MerchantProfileRow) => (
                <span className="tabular">{typeof row.growthTrendPct === 'number' ? `${row.growthTrendPct > 0 ? '+' : ''}${row.growthTrendPct}%` : '—'}</span>
              ),
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: MerchantProfileRow) => row.status ?? '',
              render: (row: MerchantProfileRow) =>
                row.status ? <StatusChip status={row.status} label={humanizeEnum(row.status)} /> : <Chip tone="neutral">{t('compliance.shell.notReported')}</Chip>,
            },
            {
              key: 'updated',
              header: t('compliance.common.updated'),
              mobileLabel: t('compliance.common.updated'),
              hideBelow: 'lg',
              sortValue: (row: MerchantProfileRow) => Date.parse(row.updatedAt ?? '') || 0,
              render: (row: MerchantProfileRow) => <span className="cmp-ref">{row.updatedAt ? formatDate(row.updatedAt) : '—'}</span>,
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.merchants.sourcesTitle')}
        rows={[
          {
            section: t('compliance.merchants.sourcesRows'),
            source: 'GET /api/compliance/data/merchant-profiles',
            note: t('compliance.merchants.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
