'use client';

/**
 * Officer register — live from workforce_identities.
 *
 * The previous version of this screen offered a "Switch Session to this
 * Officer" button over mock officers: a frontend-only permission model that
 * taught officers roles are cosmetic. That control is gone. What remains is
 * the real register — who holds a workforce identity, in which department and
 * country, whether MFA is enforced, and their lifecycle status — read from
 * the database. Access itself is decided exclusively by the server on every
 * request.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { humanizeEnum } from '@/services/compliance/format';
import type { OfficerRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState, InlineNotice } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

export default function ComplianceTeamPage() {
  const { t } = useCompliancePortal();
  const officers = useComplianceResource('officers');
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return officers.resource.data;
    return officers.resource.data.filter((row: OfficerRow) =>
      `${row.name} ${row.email} ${row.role} ${row.jurisdiction}`.toLowerCase().includes(q),
    );
  }, [officers.resource.data, term]);

  return (
    <>
      <PageHead
        title={t('compliance.officers.title')}
        description={t('compliance.officers.subtitle')}
        resource={officers.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={officers.reload}
            pending={officers.isLoading || officers.isRefreshing}
          >
            {officers.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <InlineNotice tone="info">{t('compliance.officers.noSwitchNotice')}</InlineNotice>

      <ResourceState
        resource={officers.resource}
        isLoading={officers.isLoading}
        loadingLabel={t('compliance.officers.loading')}
        emptyTitle={t('compliance.officers.empty')}
        emptyBody={t('compliance.officers.emptyBody')}
        filtered={term !== ''}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.officers.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.officers.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={officers.reload}
      >
        <ComplianceTable
          rows={filtered}
          getRowId={(row: OfficerRow) => row.id}
          labels={makeTableLabels(t, t('compliance.officers.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.officers.searchLabel')}
              searchPlaceholder={t('compliance.officers.searchPlaceholder')}
            />
          }
          columns={[
            {
              key: 'officer',
              header: t('compliance.officers.col.officer'),
              primary: true,
              mobileLabel: t('compliance.officers.col.officer'),
              sortValue: (row: OfficerRow) => row.name,
              render: (row: OfficerRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.name}</div>
                  <div className="cmp-ref truncate">{row.email}</div>
                </div>
              ),
            },
            {
              key: 'department',
              header: t('compliance.officers.col.department'),
              mobileLabel: t('compliance.officers.col.department'),
              sortValue: (row: OfficerRow) => row.role,
              render: (row: OfficerRow) => <Chip tone="neutral">{humanizeEnum(row.role)}</Chip>,
            },
            {
              key: 'jurisdiction',
              header: t('compliance.common.jurisdiction'),
              mobileLabel: t('compliance.common.jurisdiction'),
              hideBelow: 'md',
              sortValue: (row: OfficerRow) => row.jurisdiction,
              render: (row: OfficerRow) => <span className="cmp-ref">{row.jurisdiction}</span>,
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: OfficerRow) => row.status,
              render: (row: OfficerRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.officers.sourcesTitle')}
        rows={[
          {
            section: t('compliance.officers.sourcesRows'),
            source: 'GET /api/compliance/data/workforce-identities',
            note: t('compliance.officers.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
