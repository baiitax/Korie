'use client';

/**
 * Cases — live from aml_cases.
 *
 * Replaces the mock-store list. Cases come from the case table (reference,
 * subject, priority, status, exposure, lead investigator); the detail
 * workspace (notes, decision) is /compliance/cases/[id], which is also
 * DB-backed. "Open a case" happens from an alert through the audited
 * convert-to-case action — a case born without an alert behind it is not a
 * workflow this deployment records, so the button does not exist here.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, fromMinor, humanizeEnum } from '@/services/compliance/format';
import type { CaseRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

const CASE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'ESCALATED', 'PENDING_DECISION', 'CLOSED'] as const;
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

export default function CasesPage() {
  const { t } = useCompliancePortal();
  const cases = useComplianceResource('cases');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [priority, setPriority] = useState<string>('ALL');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return cases.resource.data.filter((row: CaseRow) => {
      if (status !== 'ALL' && row.status !== status) return false;
      if (priority !== 'ALL' && row.priority !== priority) return false;
      if (!q) return true;
      return `${row.reference} ${row.title} ${row.subjectId} ${row.leadInvestigator}`.toLowerCase().includes(q);
    });
  }, [cases.resource.data, term, status, priority]);

  return (
    <>
      <PageHead
        title={t('compliance.cases.title')}
        description={t('compliance.cases.subtitle')}
        resource={cases.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={cases.reload}
            pending={cases.isLoading || cases.isRefreshing}
          >
            {cases.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={cases.resource}
        isLoading={cases.isLoading}
        loadingLabel={t('compliance.cases.loading')}
        emptyTitle={t('compliance.cases.empty')}
        emptyBody={t('compliance.cases.emptyBody')}
        filtered={term !== '' || status !== 'ALL' || priority !== 'ALL'}
        onClearFilters={() => {
          setTerm('');
          setStatus('ALL');
          setPriority('ALL');
        }}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.cases.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.cases.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={cases.reload}
      >
        <ComplianceTable
          rows={filtered}
          getRowId={(row: CaseRow) => row.id}
          getRowHref={(row: CaseRow) => `/compliance/cases/${row.id}`}
          getRowTone={(row: CaseRow) => (row.priority === 'CRITICAL' ? 'critical' : row.priority === 'HIGH' ? 'high' : undefined)}
          labels={makeTableLabels(t, t('compliance.cases.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.cases.searchLabel')}
              searchPlaceholder={t('compliance.cases.searchPlaceholder')}
            >
              <select
                aria-label={t('compliance.common.status')}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="cmp-input max-w-[200px]"
              >
                <option value="ALL">{t('compliance.cases.allStatuses')}</option>
                {CASE_STATUSES.map((s) => (
                  <option key={s} value={s}>{humanizeEnum(s)}</option>
                ))}
              </select>
              <select
                aria-label={t('compliance.cases.col.priority')}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="cmp-input max-w-[170px]"
              >
                <option value="ALL">{t('compliance.cases.allPriorities')}</option>
                {PRIORITIES.map((s) => (
                  <option key={s} value={s}>{humanizeEnum(s)}</option>
                ))}
              </select>
            </TableToolbar>
          }
          columns={[
            {
              key: 'reference',
              header: t('compliance.cases.col.reference'),
              primary: true,
              mobileLabel: t('compliance.cases.col.reference'),
              sortValue: (row: CaseRow) => row.reference,
              render: (row: CaseRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.reference}</div>
                  <div className="cmp-ref truncate">{row.title}</div>
                </div>
              ),
            },
            {
              key: 'subject',
              header: t('compliance.cases.col.subject'),
              mobileLabel: t('compliance.cases.col.subject'),
              hideBelow: 'md',
              sortValue: (row: CaseRow) => row.subjectId,
              render: (row: CaseRow) => <span className="cmp-ref truncate">{row.subjectId}</span>,
            },
            {
              key: 'priority',
              header: t('compliance.cases.col.priority'),
              mobileLabel: t('compliance.cases.col.priority'),
              sortValue: (row: CaseRow) => row.priority,
              render: (row: CaseRow) => <StatusChip status={row.priority} label={humanizeEnum(row.priority)} severity={row.priority === 'CRITICAL' || row.priority === 'HIGH'} />,
            },
            {
              key: 'status',
              header: t('compliance.common.status'),
              mobileLabel: t('compliance.common.status'),
              sortValue: (row: CaseRow) => row.status,
              render: (row: CaseRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
            },
            {
              key: 'exposure',
              header: t('compliance.common.exposure'),
              mobileLabel: t('compliance.common.exposure'),
              hideBelow: 'lg',
              sortValue: (row: CaseRow) => row.exposureAmount,
              render: (row: CaseRow) => (
                <span className="tabular">
                  {formatMoney(fromMinor(row.exposureAmount), row.currency)}
                </span>
              ),
            },
            {
              key: 'investigator',
              header: t('compliance.cases.col.investigator'),
              mobileLabel: t('compliance.cases.col.investigator'),
              hideBelow: 'lg',
              sortValue: (row: CaseRow) => row.leadInvestigator,
              render: (row: CaseRow) => <span className="cmp-ref truncate">{row.leadInvestigator}</span>,
            },
            {
              key: 'created',
              header: t('compliance.cases.col.created'),
              mobileLabel: t('compliance.cases.col.created'),
              hideBelow: 'lg',
              sortValue: (row: CaseRow) => Date.parse(row.createdAt) || 0,
              render: (row: CaseRow) => <span className="cmp-ref">{formatDate(row.createdAt)}</span>,
            },
            {
              key: 'open',
              header: '',
              render: (row: CaseRow) => (
                <Link href={`/compliance/cases/${row.id}`} className="cmp-btn inline-flex">
                  {t('compliance.cases.openCase')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ),
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.cases.sourcesTitle')}
        rows={[
          {
            section: t('compliance.cases.sourcesRows'),
            source: 'GET /api/compliance/data/aml-cases',
            note: t('compliance.cases.sourcesNote'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
