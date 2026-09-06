'use client';

/**
 * Policy & control register — live from risk_rules.
 *
 * Replaces the mock-store policy manual. The register the platform actually
 * enforces is the deployed rule set: each rule's scope, severity, score delta
 * and default action are read from risk_rules. Per-rule versioning is not
 * tracked by the table yet, so no version is displayed rather than an assumed
 * "v1"; the rule set is read-only here because changing a detection threshold
 * is a maker–checker change that belongs to the rule engine, not a console
 * click.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { PolicyRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState, InlineNotice } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

export default function CompliancePoliciesPage() {
  const { t } = useCompliancePortal();
  const policies = useComplianceResource('policies');
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return policies.resource.data;
    return policies.resource.data.filter((row: PolicyRow) =>
      `${row.title} ${row.category} ${row.owner ?? ''}`.toLowerCase().includes(q),
    );
  }, [policies.resource.data, term]);

  return (
    <>
      <PageHead
        title={t('compliance.policies.title')}
        description={t('compliance.policies.subtitle')}
        resource={policies.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={policies.reload}
            pending={policies.isLoading || policies.isRefreshing}
          >
            {policies.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={policies.resource}
        isLoading={policies.isLoading}
        loadingLabel={t('compliance.policies.loading')}
        emptyTitle={t('compliance.policies.empty')}
        emptyBody={t('compliance.policies.emptyBody')}
        filtered={term !== ''}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.policies.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.policies.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={policies.reload}
      >
        <ComplianceTable
          rows={filtered}
          getRowId={(row: PolicyRow) => row.id}
          labels={makeTableLabels(t, t('compliance.policies.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.policies.searchLabel')}
              searchPlaceholder={t('compliance.policies.searchPlaceholder')}
            />
          }
          columns={[
            {
              key: 'rule',
              header: t('compliance.policies.col.rule'),
              primary: true,
              mobileLabel: t('compliance.policies.col.rule'),
              sortValue: (row: PolicyRow) => row.title,
              render: (row: PolicyRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.title}</div>
                  <div className="cmp-ref truncate">{row.category}</div>
                </div>
              ),
            },
            {
              key: 'owner',
              header: t('compliance.policies.col.owner'),
              mobileLabel: t('compliance.policies.col.owner'),
              hideBelow: 'md',
              sortValue: (row: PolicyRow) => row.owner ?? '',
              render: (row: PolicyRow) => <span className="cmp-ref truncate">{row.owner || '—'}</span>,
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: PolicyRow) => row.status,
              render: (row: PolicyRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
            },
            {
              key: 'effective',
              header: t('compliance.policies.col.effective'),
              mobileLabel: t('compliance.policies.col.effective'),
              hideBelow: 'lg',
              sortValue: (row: PolicyRow) => Date.parse(row.effectiveDate ?? '') || 0,
              render: (row: PolicyRow) => <span className="cmp-ref">{row.effectiveDate ? formatDate(row.effectiveDate) : '—'}</span>,
            },
          ]}
        />
      </ResourceState>

      <InlineNotice tone="info">{t('compliance.policies.readOnlyNotice')}</InlineNotice>

      <SourceNotes
        title={t('compliance.policies.sourcesTitle')}
        rows={[
          {
            section: t('compliance.policies.sourcesRows'),
            source: 'GET /api/compliance/data/risk-rules',
            note: t('compliance.policies.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
