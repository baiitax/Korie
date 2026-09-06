'use client';

/**
 * Agent KYC register — live from the agents table.
 *
 * Replaces the mock agent list. Agent onboarding state (tier, status, KYC
 * status) comes from the agency register; the count is whatever the register
 * actually holds.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { AgentRegisterRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

export default function AgentKycPage() {
  const { t } = useCompliancePortal();
  const agents = useComplianceResource('agentRegister');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return agents.resource.data.filter((row: AgentRegisterRow) => {
      if (status !== 'ALL' && row.status !== status) return false;
      if (!q) return true;
      return `${row.agentCode} ${row.agentName} ${row.businessName ?? ''} ${row.email ?? ''} ${row.country}`.toLowerCase().includes(q);
    });
  }, [agents.resource.data, term, status]);

  const statuses = useMemo(
    () => Array.from(new Set(agents.resource.data.map((row: AgentRegisterRow) => row.status))).sort(),
    [agents.resource.data],
  );

  return (
    <>
      <PageHead
        title={t('compliance.agents.title')}
        description={t('compliance.agents.subtitle')}
        resource={agents.resource}
        actions={
          <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={agents.reload} pending={agents.isLoading || agents.isRefreshing}>
            {agents.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={agents.resource}
        isLoading={agents.isLoading}
        loadingLabel={t('compliance.agents.loading')}
        emptyTitle={t('compliance.agents.empty')}
        emptyBody={t('compliance.agents.emptyBody')}
        filtered={term !== '' || status !== 'ALL'}
        onClearFilters={() => {
          setTerm('');
          setStatus('ALL');
        }}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.agents.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.agents.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={agents.reload}
      >
        <ComplianceTable
          rows={filtered}
          getRowId={(row: AgentRegisterRow) => row.id}
          labels={makeTableLabels(t, t('compliance.agents.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.agents.searchLabel')}
              searchPlaceholder={t('compliance.agents.searchPlaceholder')}
            >
              <select
                aria-label={t('compliance.common.status')}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="cmp-input max-w-[190px]"
              >
                <option value="ALL">{t('compliance.agents.allStatuses')}</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{humanizeEnum(s)}</option>
                ))}
              </select>
            </TableToolbar>
          }
          columns={[
            {
              key: 'agent',
              header: t('compliance.agents.col.agent'),
              primary: true,
              mobileLabel: t('compliance.agents.col.agent'),
              sortValue: (row: AgentRegisterRow) => row.agentName,
              render: (row: AgentRegisterRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.agentName}</div>
                  <div className="cmp-ref truncate">
                    {row.agentCode}
                    {row.businessName ? ` · ${row.businessName}` : ''}
                  </div>
                </div>
              ),
            },
            {
              key: 'country',
              header: t('compliance.common.jurisdiction'),
              mobileLabel: t('compliance.common.jurisdiction'),
              hideBelow: 'md',
              sortValue: (row: AgentRegisterRow) => row.country,
              render: (row: AgentRegisterRow) => <Chip tone="neutral">{row.country}</Chip>,
            },
            {
              key: 'tier',
              header: t('compliance.kyc.col.tier'),
              mobileLabel: t('compliance.kyc.col.tier'),
              hideBelow: 'md',
              sortValue: (row: AgentRegisterRow) => row.tier ?? '',
              render: (row: AgentRegisterRow) => <span className="cmp-ref">{row.tier ? humanizeEnum(row.tier) : '—'}</span>,
            },
            {
              key: 'kyc',
              header: t('compliance.agents.col.kyc'),
              mobileLabel: t('compliance.agents.col.kyc'),
              sortValue: (row: AgentRegisterRow) => row.kycStatus ?? '',
              render: (row: AgentRegisterRow) =>
                row.kycStatus ? <StatusChip status={row.kycStatus} label={humanizeEnum(row.kycStatus)} /> : <span className="cmp-ref">—</span>,
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: AgentRegisterRow) => row.status,
              render: (row: AgentRegisterRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
            },
            {
              key: 'created',
              header: t('compliance.cases.col.created'),
              mobileLabel: t('compliance.cases.col.created'),
              hideBelow: 'lg',
              sortValue: (row: AgentRegisterRow) => Date.parse(row.createdAt ?? '') || 0,
              render: (row: AgentRegisterRow) => <span className="cmp-ref">{row.createdAt ? formatDate(row.createdAt) : '—'}</span>,
            },
            {
              key: 'open',
              header: '',
              render: (row: AgentRegisterRow) => (
                <Link href={`/compliance/customers/${row.id}`} className="cmp-btn inline-flex">
                  {t('compliance.agents.openFile')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ),
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.agents.sourcesTitle')}
        rows={[
          {
            section: t('compliance.agents.sourcesRows'),
            source: 'GET /api/compliance/data/agents',
            note: t('compliance.agents.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
