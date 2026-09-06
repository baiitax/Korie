'use client';

/**
 * Audit trail — live from audit_events.
 *
 * The previous version of this screen printed mock entries with a hard-coded
 * "VERIFIED SHA-256" integrity badge on every row. This version reads the real
 * append-only audit_events table (every compliance and admin mutation lands
 * there with before/after state), and the integrity column says what is
 * actually recorded: an event hash when the row carries one, nothing
 * otherwise. No badge is printed that the database cannot back.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { AuditRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

export default function ComplianceAuditPage() {
  const { t } = useCompliancePortal();
  const audit = useComplianceResource('audit', { query: { limit: '200' } });
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return audit.resource.data;
    return audit.resource.data.filter((row: AuditRow) =>
      `${row.action} ${row.actor} ${row.entityType} ${row.entityId} ${row.summary ?? ''}`.toLowerCase().includes(q),
    );
  }, [audit.resource.data, term]);

  return (
    <>
      <PageHead
        title={t('compliance.audit.title')}
        description={t('compliance.audit.subtitle')}
        resource={audit.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={audit.reload}
            pending={audit.isLoading || audit.isRefreshing}
          >
            {audit.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={audit.resource}
        isLoading={audit.isLoading}
        loadingLabel={t('compliance.audit.loading')}
        emptyTitle={t('compliance.audit.empty')}
        emptyBody={t('compliance.audit.emptyBody')}
        filtered={term !== ''}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.audit.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.audit.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={audit.reload}
      >
        <ComplianceTable
          rows={filtered}
          getRowId={(row: AuditRow) => row.id}
          labels={makeTableLabels(t, t('compliance.audit.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.audit.searchLabel')}
              searchPlaceholder={t('compliance.audit.searchPlaceholder')}
            />
          }
          columns={[
            {
              key: 'at',
              header: t('compliance.audit.col.at'),
              primary: true,
              mobileLabel: t('compliance.audit.col.at'),
              sortValue: (row: AuditRow) => Date.parse(row.at) || 0,
              render: (row: AuditRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong">{formatDate(row.at)}</div>
                  <div className="cmp-ref truncate">{row.id.slice(0, 8)}</div>
                </div>
              ),
            },
            {
              key: 'action',
              header: t('compliance.audit.col.action'),
              mobileLabel: t('compliance.audit.col.action'),
              sortValue: (row: AuditRow) => row.action,
              render: (row: AuditRow) => <Chip tone="neutral">{row.action}</Chip>,
            },
            {
              key: 'actor',
              header: t('compliance.audit.col.actor'),
              mobileLabel: t('compliance.audit.col.actor'),
              hideBelow: 'md',
              sortValue: (row: AuditRow) => row.actor,
              render: (row: AuditRow) => <span className="cmp-ref truncate">{row.actor}</span>,
            },
            {
              key: 'entity',
              header: t('compliance.audit.col.entity'),
              mobileLabel: t('compliance.audit.col.entity'),
              hideBelow: 'md',
              sortValue: (row: AuditRow) => `${row.entityType}${row.entityId}`,
              render: (row: AuditRow) => (
                <div className="min-w-0">
                  <div className="cmp-ref truncate">{row.entityType}</div>
                  <div className="cmp-ref truncate">{row.entityId}</div>
                </div>
              ),
            },
            {
              key: 'integrity',
              header: t('compliance.audit.col.integrity'),
              mobileLabel: t('compliance.audit.col.integrity'),
              hideBelow: 'lg',
              sortValue: (row: AuditRow) => row.integrity ?? '',
              render: (row: AuditRow) =>
                row.integrity ? <StatusChip status="VERIFIED" label={row.integrity} /> : <span className="cmp-ref">{t('compliance.audit.noHash')}</span>,
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.audit.sourcesTitle')}
        rows={[
          {
            section: t('compliance.audit.sourcesRows'),
            source: 'GET /api/compliance/data/audit-events',
            note: t('compliance.audit.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
