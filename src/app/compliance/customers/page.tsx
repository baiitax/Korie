'use client';

/**
 * The customer register an investigator uses.
 *
 * Identity comes from master identity (`/api/core/v1/identity/persons`), and
 * the two columns that make an officer click a row — open AML alerts and open
 * cases — are joined from the live AML queues in the same request cycle
 * (`loadCustomers`). Nothing here pretends to be a balance or a transaction
 * list: this portal does not hold customer money, and an investigator who needs
 * the ledger follows the reference into the module that owns it.
 *
 * Phone numbers are shown masked. The identity reference (KID-…) is the string
 * to quote in an email or a regulator response.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { RefreshCw, ShieldAlert, TriangleAlert, UserCheck } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, humanizeEnum, maskIdentifier } from '@/services/compliance/format';
import type { CustomerRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, Provenance, SelectInput, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

const KYC_STATES = ['ALL', 'VERIFIED', 'PENDING', 'REJECTED', 'NOT_STARTED'];

export default function CustomersPage() {
  const { t, locale } = useCompliancePortal();
  const [term, setTerm] = useState('');
  const [kyc, setKyc] = useState('ALL');
  const [riskOnly, setRiskOnly] = useState(false);
  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('customers');

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return resource.data.filter((row) => {
      if (kyc !== 'ALL' && row.kycStatus !== kyc) return false;
      if (riskOnly && row.riskLevel !== 'HIGH' && row.riskLevel !== 'CRITICAL' && !row.hasOpenAlerts) return false;
      if (!needle) return true;
      return `${row.fullName} ${row.identityReference} ${row.email} ${row.phone}`.toLowerCase().includes(needle);
    });
  }, [resource.data, term, kyc, riskOnly]);

  const filtersActive = term.trim().length > 0 || kyc !== 'ALL' || riskOnly;

  return (
    <>
      <PageHead
        title={t('compliance.customers.title')}
        description={t('compliance.customers.subtitle')}
        resource={resource}
        actions={
          <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={reload} pending={isLoading || isRefreshing}>
            {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={resource}
        isLoading={isLoading}
        loadingLabel={t('compliance.customers.loading')}
        emptyTitle={filtersActive ? t('compliance.states.emptyFiltered') : t('compliance.customers.empty')}
        emptyBody={filtersActive ? undefined : t('compliance.customers.emptyBody')}
        retryLabel={t('compliance.states.retry')}
        onRetry={reload}
        filtered={filtersActive}
        onClearFilters={() => {
          setTerm('');
          setKyc('ALL');
          setRiskOnly(false);
        }}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.customers.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.customers.unavailable')}
      >
        <ComplianceTable
          rows={rows}
          columns={[
            {
              key: 'subject',
              header: t('compliance.customers.col.subject'),
              primary: true,
              mobileLabel: t('compliance.customers.col.subject'),
              sortValue: (row: CustomerRow) => row.fullName,
              render: (row: CustomerRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.fullName}</div>
                  <div className="cmp-ref truncate">
                    {row.identityReference} · {maskIdentifier(row.phone)}
                  </div>
                </div>
              ),
            },
            {
              key: 'kyc',
              header: t('compliance.customers.col.kyc'),
              mobileLabel: t('compliance.customers.col.kyc'),
              sortValue: (row: CustomerRow) => row.kycStatus,
              render: (row: CustomerRow) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusChip status={row.kycStatus} label={humanizeEnum(row.kycStatus)} />
                  <Chip tone="neutral">{humanizeEnum(row.kycTier)}</Chip>
                </div>
              ),
            },
            {
              key: 'risk',
              header: t('compliance.customers.col.risk'),
              mobileLabel: t('compliance.customers.col.risk'),
              sortValue: (row: CustomerRow) => row.amlProfile?.riskScore ?? -1,
              render: (row: CustomerRow) => (
                <div className="flex items-center gap-1.5">
                  <StatusChip status={row.riskLevel} label={humanizeEnum(row.riskLevel)} severity={row.riskLevel === 'HIGH' || row.riskLevel === 'CRITICAL'} />
                  {typeof row.amlProfile?.riskScore === 'number' ? (
                    <span className="tabular text-[11.5px] text-[var(--foreground-muted)]">{row.amlProfile.riskScore}</span>
                  ) : (
                    <span className="text-[11.5px] text-[var(--text-disabled)]">{t('compliance.customers.noScore')}</span>
                  )}
                </div>
              ),
            },
            {
              key: 'queues',
              header: t('compliance.customers.col.queues'),
              hideBelow: 'md',
              mobileLabel: t('compliance.customers.col.queues'),
              sortValue: (row: CustomerRow) => (row.hasOpenAlerts ? 1 : 0) + (row.openCaseCount ?? 0),
              render: (row: CustomerRow) => (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {row.hasOpenAlerts ? (
                    <Chip tone="high" icon={<TriangleAlert className="h-3 w-3" aria-hidden="true" />}>
                      {t('compliance.customers.openAlerts')}
                    </Chip>
                  ) : null}
                  {(row.openCaseCount ?? 0) > 0 ? (
                    <Chip tone="medium" icon={<ShieldAlert className="h-3 w-3" aria-hidden="true" />}>
                      {t('compliance.customers.openCases', { count: row.openCaseCount ?? 0 })}
                    </Chip>
                  ) : null}
                  {!row.hasOpenAlerts && !(row.openCaseCount ?? 0) ? (
                    <span className="text-[11.5px] text-[var(--text-disabled)]">{t('compliance.customers.clearQueues')}</span>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'updated',
              header: t('compliance.customers.col.updated'),
              hideBelow: 'lg',
              sortValue: (row: CustomerRow) => row.updatedAt,
              render: (row: CustomerRow) => (
                <span className="text-[12px] text-[var(--foreground-muted)]">{formatDate(row.updatedAt, 'short', { locale })}</span>
              ),
            },
            {
              key: 'act',
              header: '',
              render: (row: CustomerRow) => (
                <Link
                  href={`/compliance/customers/${encodeURIComponent(row.id)}`}
                  className="cmp-btn cmp-btn--ghost px-2"
                  aria-label={`${t('compliance.customers.openFile')} ${row.fullName}`}
                >
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('compliance.customers.openFile')}
                </Link>
              ),
            },
          ]}
          getRowId={(row: CustomerRow) => row.id}
          getRowHref={(row: CustomerRow) => `/compliance/customers/${encodeURIComponent(row.id)}`}
          getRowTone={(row: CustomerRow) => (row.hasOpenAlerts ? 'critical' : undefined)}
          labels={makeTableLabels(t, t('compliance.customers.title'))}
          pageSize={15}
          footnote={<Provenance resource={resource} detail={t('compliance.customers.provenanceDetail')} />}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.customers.searchLabel')}
              searchPlaceholder={t('compliance.customers.searchPlaceholder')}
              onClear={
                filtersActive
                  ? () => {
                      setTerm('');
                      setKyc('ALL');
                      setRiskOnly(false);
                    }
                  : undefined
              }
              clearLabel={t('compliance.states.clearFilters')}
              resultCount={rows.length}
              resultLabel={(count) => t('compliance.customers.resultCount', { count })}
            >
              <SelectInput aria-label={t('compliance.customers.col.kyc')} value={kyc} onChange={(e) => setKyc(e.target.value)} className="h-[38px] w-[150px]">
                {KYC_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? t('compliance.customers.kycAll') : humanizeEnum(s)}
                  </option>
                ))}
              </SelectInput>
              <button type="button" className="cmp-btn" aria-pressed={riskOnly} onClick={() => setRiskOnly((v) => !v)}>
                {t('compliance.customers.riskOnly')}
              </button>
            </TableToolbar>
          }
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.customers.col.subject'),
            source: 'GET /api/core/v1/identity/persons → MasterIdentityEngine.getAllPersons()',
            note: t('compliance.customers.sourceNoteIdentity'),
            mode: 'live',
          },
          {
            section: t('compliance.customers.col.queues'),
            source: 'GET /api/aml/alerts + GET /api/aml/cases, joined by subject id',
            note: t('compliance.customers.sourceNoteQueues'),
            mode: resource.error?.code === 'PARTIAL_JOIN' ? 'demo' : 'live',
          },
        ]}
      />
    </>
  );
}
