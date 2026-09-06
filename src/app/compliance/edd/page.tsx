'use client';

/**
 * Enhanced due diligence — the high-risk tail of the AML profile register.
 *
 * EDD applies to profiles whose AML tier is HIGH or CRITICAL. The queue is a
 * filter over aml_customer_profiles; with no high-risk profiles it is an
 * honest empty state, and the full register behind it stays readable from the
 * customer file.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { AmlProfileRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

export default function EddPage() {
  const { t } = useCompliancePortal();
  const profiles = useComplianceResource('amlProfiles');
  const [term, setTerm] = useState('');

  const queue = useMemo(() => {
    const q = term.trim().toLowerCase();
    return profiles.resource.data
      .filter((row: AmlProfileRow) => row.riskTier === 'HIGH' || row.riskTier === 'CRITICAL' || row.isPep || row.hasAdverseMedia)
      .filter((row: AmlProfileRow) => !q || row.customerId.toLowerCase().includes(q));
  }, [profiles.resource.data, term]);

  return (
    <>
      <PageHead
        title={t('compliance.edd.title')}
        description={t('compliance.edd.subtitle')}
        resource={profiles.resource}
        actions={
          <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={profiles.reload} pending={profiles.isLoading || profiles.isRefreshing}>
            {profiles.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={profiles.resource}
        isLoading={profiles.isLoading}
        loadingLabel={t('compliance.edd.loading')}
        emptyTitle={t('compliance.edd.empty')}
        emptyBody={t('compliance.edd.emptyBody')}
        filtered={term !== ''}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.edd.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.edd.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={profiles.reload}
      >
        <ComplianceTable
          rows={queue}
          getRowId={(row: AmlProfileRow) => row.id}
          getRowHref={(row: AmlProfileRow) => `/compliance/customers/${row.customerId}`}
          labels={makeTableLabels(t, t('compliance.edd.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.edd.searchLabel')}
              searchPlaceholder={t('compliance.edd.searchPlaceholder')}
            />
          }
          columns={[
            {
              key: 'customer',
              header: t('compliance.common.subject'),
              primary: true,
              mobileLabel: t('compliance.common.subject'),
              sortValue: (row: AmlProfileRow) => row.customerId,
              render: (row: AmlProfileRow) => (
                <div className="min-w-0">
                  <div className="cmp-ref truncate">{row.customerId}</div>
                  <div className="cmp-ref truncate">{row.jurisdiction}</div>
                </div>
              ),
            },
            {
              key: 'tier',
              header: t('compliance.common.risk'),
              mobileLabel: t('compliance.common.risk'),
              sortValue: (row: AmlProfileRow) => row.riskTier,
              render: (row: AmlProfileRow) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusChip status={row.riskTier} label={humanizeEnum(row.riskTier)} severity={row.riskTier === 'HIGH' || row.riskTier === 'CRITICAL'} />
                  {row.isPep ? <Chip tone="high">PEP</Chip> : null}
                  {row.hasAdverseMedia ? <Chip tone="medium">{t('compliance.edd.adverseMedia')}</Chip> : null}
                </div>
              ),
            },
            {
              key: 'score',
              header: t('compliance.edd.col.score'),
              mobileLabel: t('compliance.edd.col.score'),
              hideBelow: 'md',
              sortValue: (row: AmlProfileRow) => row.riskScore ?? -1,
              render: (row: AmlProfileRow) => <span className="tabular">{typeof row.riskScore === 'number' ? row.riskScore : '—'}</span>,
            },
            {
              key: 'evaluated',
              header: t('compliance.edd.col.evaluated'),
              mobileLabel: t('compliance.edd.col.evaluated'),
              hideBelow: 'lg',
              sortValue: (row: AmlProfileRow) => Date.parse(row.lastEvaluatedAt ?? '') || 0,
              render: (row: AmlProfileRow) => <span className="cmp-ref">{row.lastEvaluatedAt ? formatDate(row.lastEvaluatedAt) : '—'}</span>,
            },
            {
              key: 'open',
              header: '',
              render: (row: AmlProfileRow) => (
                <Link href={`/compliance/customers/${row.customerId}`} className="cmp-btn inline-flex">
                  {t('compliance.edd.openFile')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ),
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.edd.sourcesTitle')}
        rows={[
          {
            section: t('compliance.edd.sourcesRows'),
            source: 'GET /api/compliance/data/aml-customer-profiles',
            note: t('compliance.edd.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
