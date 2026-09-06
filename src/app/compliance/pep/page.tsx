'use client';

/**
 * PEP register — the AML profiles that carry a PEP flag.
 *
 * The register is a filter over aml_customer_profiles (is_pep). With no
 * flagged profiles it is an honest empty state — not a demo list of
 * fictional politicians, which is what the previous mock screen showed.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { AmlProfileRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

export default function PepPage() {
  const { t } = useCompliancePortal();
  const profiles = useComplianceResource('amlProfiles');
  const [term, setTerm] = useState('');

  const flagged = useMemo(() => {
    const q = term.trim().toLowerCase();
    return profiles.resource.data
      .filter((row: AmlProfileRow) => row.isPep)
      .filter((row: AmlProfileRow) => !q || row.customerId.toLowerCase().includes(q));
  }, [profiles.resource.data, term]);

  return (
    <>
      <PageHead
        title={t('compliance.pep.title')}
        description={t('compliance.pep.subtitle')}
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
        loadingLabel={t('compliance.pep.loading')}
        emptyTitle={t('compliance.pep.empty')}
        emptyBody={t('compliance.pep.emptyBody')}
        filtered={term !== ''}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.pep.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.pep.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={profiles.reload}
      >
        <ComplianceTable
          rows={flagged}
          getRowId={(row: AmlProfileRow) => row.id}
          labels={makeTableLabels(t, t('compliance.pep.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.pep.searchLabel')}
              searchPlaceholder={t('compliance.pep.searchPlaceholder')}
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
                  <div className="cmp-ref truncate">{row.id.slice(0, 8)}</div>
                </div>
              ),
            },
            {
              key: 'jurisdiction',
              header: t('compliance.common.jurisdiction'),
              mobileLabel: t('compliance.common.jurisdiction'),
              sortValue: (row: AmlProfileRow) => row.jurisdiction,
              render: (row: AmlProfileRow) => <Chip tone="neutral">{row.jurisdiction}</Chip>,
            },
            {
              key: 'category',
              header: t('compliance.pep.col.category'),
              mobileLabel: t('compliance.pep.col.category'),
              sortValue: (row: AmlProfileRow) => row.pepCategory ?? '',
              render: (row: AmlProfileRow) => <span className="cmp-ref">{row.pepCategory ? humanizeEnum(row.pepCategory) : '—'}</span>,
            },
            {
              key: 'tier',
              header: t('compliance.common.risk'),
              mobileLabel: t('compliance.common.risk'),
              sortValue: (row: AmlProfileRow) => row.riskTier,
              render: (row: AmlProfileRow) => <StatusChip status={row.riskTier} label={humanizeEnum(row.riskTier)} severity={row.riskTier === 'HIGH' || row.riskTier === 'CRITICAL'} />,
            },
            {
              key: 'evaluated',
              header: t('compliance.pep.col.evaluated'),
              mobileLabel: t('compliance.pep.col.evaluated'),
              hideBelow: 'lg',
              sortValue: (row: AmlProfileRow) => Date.parse(row.lastEvaluatedAt ?? '') || 0,
              render: (row: AmlProfileRow) => <span className="cmp-ref">{row.lastEvaluatedAt ? formatDate(row.lastEvaluatedAt) : '—'}</span>,
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.pep.sourcesTitle')}
        rows={[
          {
            section: t('compliance.pep.sourcesRows'),
            source: 'GET /api/compliance/data/aml-customer-profiles',
            note: t('compliance.pep.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
