'use client';

/**
 * Regulatory reporting.
 *
 * Two live reads sit side by side: what has been filed (`GET
 * /api/v1/regulatory/reports`, the snapshot the reporting service actually sent)
 * and what is owed (`GET /api/v1/regulatory/obligations`, with the due dates the
 * regulator set). Corrections are shown too — `GET /api/v1/regulatory/restatements`
 * carries the original versus amended figures, so a restated filing is visible
 * here instead of quietly replaced.
 *
 * This page reads; it does not file. Every regulatory route in the deployment is
 * GET-only, so a "submit" button would either do nothing or write to the wrong
 * place. The officer gets the acknowledgement token and snapshot hash that the
 * filing produced, and the numbers are in the regulator's own units.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { ArrowRight, FileCheck2, RefreshCw, Repeat } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, fromMinor, humanizeEnum } from '@/services/compliance/format';
import type { ObligationRow, ReportRow, RestatementRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Button,
  Chip,
  Drawer,
  KeyList,
  PageHead,
  Panel,
  Provenance,
  SourceNotes,
  StatusChip,
} from '@/components/compliance/ui';
import { InlineNotice, ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, makeTableLabels } from '@/components/compliance/ui';

export default function ReportsPage() {
  const { t, locale } = useCompliancePortal();
  const reports = useComplianceResource('reports');
  const obligations = useComplianceResource('calendar');
  const restatements = useComplianceResource('restatements');
  const [openReport, setOpenReport] = useState<ReportRow | null>(null);
  const [openRestatement, setOpenRestatement] = useState<RestatementRow | null>(null);

  const upcoming = useMemo(
    () =>
      obligations.resource.data
        .filter((row: ObligationRow) => !['SUBMITTED', 'ACKNOWLEDGED', 'COMPLETED', 'FILED'].includes(row.status))
        .sort((a: ObligationRow, b: ObligationRow) => Date.parse(a.dueDate) - Date.parse(b.dueDate)),
    [obligations.resource.data],
  );

  const filedThisPeriod = reports.resource.data.filter((row: ReportRow) => ['SUBMITTED', 'ACKNOWLEDGED', 'APPROVED'].includes(row.status)).length;

  return (
    <>
      <PageHead
        title={t('compliance.reports.title')}
        description={t('compliance.reports.subtitle')}
        resource={reports.resource}
        actions={
          <>
            <Link href="/compliance/calendar" className="cmp-btn">
              {t('compliance.nav.calendar')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Button
              icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => {
                reports.reload();
                obligations.reload();
                restatements.reload();
              }}
              pending={reports.isLoading || reports.isRefreshing}
            >
              {reports.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
          </>
        }
      />

      {restatements.resource.data.length > 0 ? (
        <InlineNotice tone="warning" icon={<Repeat className="h-4 w-4" aria-hidden="true" />}>
          {t('compliance.reports.restatementNotice', { count: restatements.resource.data.length })}
        </InlineNotice>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <ResourceState
            resource={reports.resource}
            isLoading={reports.isLoading}
            loadingLabel={t('compliance.reports.loading')}
            emptyTitle={t('compliance.reports.empty')}
            emptyBody={t('compliance.reports.emptyBody')}
            retryLabel={t('compliance.states.retry')}
            onRetry={reports.reload}
            unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
            unauthorizedBody={t('compliance.reports.unauthorized')}
            unavailableTitle={t('compliance.states.unavailableTitle')}
            unavailableBody={t('compliance.reports.unavailable')}
          >
            <ComplianceTable
              rows={reports.resource.data}
              columns={[
                {
                  key: 'report',
                  header: t('compliance.reports.col.report'),
                  primary: true,
                  mobileLabel: t('compliance.reports.col.report'),
                  sortValue: (row: ReportRow) => row.reportType,
                  render: (row: ReportRow) => (
                    <div className="min-w-0">
                      <div className="cmp-cell-strong truncate">{row.reportType}</div>
                      <div className="cmp-ref truncate">
                        {row.reference} · {row.period}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'regulator',
                  header: t('compliance.reports.col.regulator'),
                  mobileLabel: t('compliance.reports.col.regulator'),
                  hideBelow: 'md',
                  sortValue: (row: ReportRow) => row.regulator,
                  render: (row: ReportRow) => (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Chip tone="neutral">{row.regulator}</Chip>
                      <span className="text-[11.5px] text-[var(--foreground-muted)]">{row.jurisdiction ?? ''}</span>
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: t('compliance.common.status'),
                  mobileLabel: t('compliance.common.status'),
                  sortValue: (row: ReportRow) => row.status,
                  render: (row: ReportRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
                },
                {
                  key: 'dual',
                  header: t('compliance.reports.col.dual'),
                  hideBelow: 'lg',
                  sortValue: (row: ReportRow) => row.checker ?? '',
                  render: (row: ReportRow) => (
                    <div className="text-[11.5px] leading-[1.35] text-[var(--foreground-muted)]">
                      <div>
                        <span className="font-semibold text-[var(--foreground)]">{t('compliance.reports.maker')}</span> {row.maker ?? t('compliance.shell.notReported')}
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--foreground)]">{t('compliance.reports.checker')}</span> {row.checker ?? t('compliance.shell.notReported')}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'submitted',
                  header: t('compliance.reports.col.submitted'),
                  hideBelow: 'md',
                  sortValue: (row: ReportRow) => row.submittedAt ?? '',
                  render: (row: ReportRow) => (row.submittedAt ? formatDate(row.submittedAt, 'short', { locale }) : t('compliance.shell.notReported')),
                },
                {
                  key: 'act',
                  header: '',
                  render: (row: ReportRow) => (
                    <button type="button" className="cmp-btn cmp-btn--ghost px-2" onClick={() => setOpenReport(row)}>
                      {t('compliance.reports.open')}
                    </button>
                  ),
                },
              ]}
              getRowId={(row: ReportRow) => row.id}
              labels={makeTableLabels(t, t('compliance.reports.title'))}
              pageSize={10}
              initialSort={{ key: 'submitted', dir: 'desc' }}
              footnote={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Provenance resource={reports.resource} detail={t('compliance.reports.provenanceDetail')} />
                  <span className="text-[11.5px] tabular text-[var(--foreground-muted)]">
                    {t('compliance.reports.filedCount', { filed: filedThisPeriod, total: reports.resource.data.length })}
                  </span>
                </div>
              }
            />
          </ResourceState>

          <Panel
            title={t('compliance.reports.restatementsTitle')}
            actions={
              <Link href="/compliance/audit" className="cmp-btn cmp-btn--ghost px-2">
                {t('compliance.nav.audit')}
              </Link>
            }
            footnote={<Provenance resource={restatements.resource} detail={t('compliance.reports.provenanceRestatements')} />}
          >
            {restatements.isLoading ? (
              <p className="text-[12.5px] text-[var(--foreground-muted)]">{t('compliance.states.loading')}</p>
            ) : restatements.resource.data.length === 0 ? (
              <p className="text-[12.5px] text-[var(--foreground-muted)]">{t('compliance.reports.noRestatements')}</p>
            ) : (
              <ul className="space-y-2">
                {restatements.resource.data.map((row: RestatementRow) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setOpenRestatement(row)}
                      className="w-full rounded-[var(--cmp-radius-sm)] border border-[var(--border)] p-2.5 text-left transition-colors hover:border-[var(--border-strong)]"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <Chip tone="high" icon={<Repeat className="h-3 w-3" aria-hidden="true" />}>
                          {t('compliance.reports.restated')}
                        </Chip>
                        <span className="text-[13px] font-bold text-[var(--foreground)]">{row.obligationCode}</span>
                        <span className="cmp-ref">{row.period}</span>
                        <span className="ml-auto text-[11.5px] text-[var(--foreground-muted)]">{formatDate(row.createdAt, 'short', { locale })}</span>
                      </span>
                      <span className="mt-1 block truncate text-[12px] text-[var(--foreground-muted)]">{row.reason}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={t('compliance.reports.dueTitle')} footnote={<Provenance resource={obligations.resource} />}>
            {obligations.isLoading ? (
              <p className="text-[12.5px] text-[var(--foreground-muted)]">{t('compliance.states.loading')}</p>
            ) : upcoming.length === 0 ? (
              <p className="text-[12.5px] text-[var(--foreground-muted)]">{t('compliance.reports.dueEmpty')}</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 6).map((row: ObligationRow) => (
                  <li key={row.id} className="rounded-[10px] border border-[var(--border)] p-2.5">
                    <div className="text-[12.5px] font-semibold text-[var(--foreground)]">{row.title}</div>
                    <div className="cmp-ref mt-0.5 flex flex-wrap items-center gap-1.5">
                      {row.regulator} · {row.frequency ? humanizeEnum(row.frequency) : '—'}
                      <StatusChip status={row.status} label={humanizeEnum(row.status)} />
                    </div>
                    <div className="mt-1 text-[11.5px] text-[var(--foreground-muted)]">
                      {t('compliance.reports.dueOn', { date: formatDate(row.dueDate, 'date', { locale }) })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('compliance.reports.readOnlyTitle')}>
            <p className="text-[12.5px] leading-[1.55] text-[var(--foreground-muted)]">{t('compliance.reports.readOnlyBody')}</p>
          </Panel>
        </div>
      </div>

      <Drawer
        open={Boolean(openReport)}
        onClose={() => setOpenReport(null)}
        closeLabel={t('compliance.shell.close')}
        title={openReport ? t('compliance.reports.drawerTitle', { type: openReport.reportType }) : ''}
        subtitle={openReport ? `${openReport.reference} · ${openReport.period}` : undefined}
        eyebrow={openReport ? <StatusChip status={openReport.status} label={humanizeEnum(openReport.status)} /> : undefined}
        actions={
          <Link href="/compliance/calendar" className="cmp-btn">
            {t('compliance.reports.openCalendar')}
          </Link>
        }
      >
        {openReport ? (
          <div className="space-y-4">
            <Panel title={t('compliance.reports.filing')}>
              <KeyList
                items={[
                  { term: t('compliance.reports.col.regulator'), value: `${openReport.regulator}${openReport.jurisdiction ? ` · ${openReport.jurisdiction}` : ''}` },
                  { term: t('compliance.reports.obligation'), value: <span className="cmp-ref">{openReport.obligationCode ?? t('compliance.shell.notReported')}</span> },
                  { term: t('compliance.reports.maker'), value: openReport.maker ?? t('compliance.shell.notReported') },
                  { term: t('compliance.reports.checker'), value: openReport.checker ?? t('compliance.shell.notReported') },
                  { term: t('compliance.reports.submitted'), value: openReport.submittedAt ? formatDate(openReport.submittedAt, 'full', { locale }) : t('compliance.shell.notReported') },
                  { term: t('compliance.reports.approved'), value: openReport.approvedAt ? formatDate(openReport.approvedAt, 'full', { locale }) : t('compliance.shell.notReported') },
                  { term: t('compliance.reports.ack'), value: openReport.acknowledgement ? <span className="cmp-ref">{openReport.acknowledgement}</span> : t('compliance.shell.notReported') },
                  { term: t('compliance.reports.reconciliation'), value: openReport.reconciliation ? humanizeEnum(openReport.reconciliation) : t('compliance.shell.notReported') },
                  { term: t('compliance.reports.snapshot'), value: <span className="cmp-ref break-all">{openReport.snapshotHash ?? t('compliance.shell.notReported')}</span>, span: true },
                ]}
              />
            </Panel>

            <Panel title={t('compliance.reports.financials')}>
              {openReport.financials?.length ? (
                <ul className="divide-y divide-[var(--border)]">
                  {openReport.financials.map((entry) => (
                    <li key={entry.label} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="text-[12.5px] text-[var(--foreground-muted)]">{entry.label}</span>
                      <span className="tabular text-[13px] font-semibold text-[var(--foreground)]">
                        {formatMoney(entry.amount, entry.currency, { locale })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12.5px] text-[var(--foreground-muted)]">{t('compliance.reports.noFinancials')}</p>
              )}
            </Panel>

            <InlineNotice tone="neutral" icon={<FileCheck2 className="h-4 w-4" aria-hidden="true" />}>
              {t('compliance.reports.filingFootnote')}
            </InlineNotice>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={Boolean(openRestatement)}
        onClose={() => setOpenRestatement(null)}
        closeLabel={t('compliance.shell.close')}
        title={openRestatement ? t('compliance.reports.restatementTitle') : ''}
        subtitle={openRestatement ? `${openRestatement.obligationCode} · ${openRestatement.period}` : undefined}
        eyebrow={openRestatement ? <Chip tone="high" icon={<Repeat className="h-3 w-3" aria-hidden="true" />}>{t('compliance.reports.restated')}</Chip> : undefined}
      >
        {openRestatement ? (
          <div className="space-y-4">
            <Panel title={t('compliance.reports.reason')}>
              <p className="text-[13px] leading-[1.55] text-[var(--foreground)]">{openRestatement.reason}</p>
            </Panel>
            <Panel title={t('compliance.reports.deltas')}>
              {openRestatement.deltas.length ? (
                <ul className="overflow-hidden rounded-[10px] border border-[var(--border)]">
                  {openRestatement.deltas.map((delta) => (
                    <li key={delta.metric} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-b border-[var(--border)] px-2.5 py-2 last:border-b-0">
                      <span className="min-w-0 truncate text-[12.5px] text-[var(--foreground)]">{delta.metric}</span>
                      <span className="tabular text-[12px] text-[var(--foreground-muted)] line-through">{formatMoney(fromMinor(delta.original) ?? 0, 'NGN', { locale })}</span>
                      <span className="tabular text-[12.5px] font-bold text-[var(--foreground)]">{formatMoney(fromMinor(delta.amended) ?? 0, 'NGN', { locale })}</span>
                      <span
                        className="col-span-3 text-[11.5px] font-semibold tabular"
                        style={{ color: delta.delta < 0 ? 'var(--sev-high)' : 'var(--sev-medium)' }}
                      >
                        {delta.delta < 0 ? '−' : '+'}
                        {formatMoney(Math.abs(fromMinor(delta.delta) ?? 0), 'NGN', { locale })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12.5px] text-[var(--foreground-muted)]">{t('compliance.reports.noDeltas')}</p>
              )}
            </Panel>
            <Panel title={t('compliance.reports.provenance')}>
              <KeyList
                items={[
                  { term: t('compliance.reports.approvedBy'), value: openRestatement.approvedBy || t('compliance.shell.notReported') },
                  { term: t('compliance.reports.original'), value: <span className="cmp-ref">{openRestatement.originalRef}</span> },
                  { term: t('compliance.reports.amended'), value: <span className="cmp-ref">{openRestatement.amendedRef}</span> },
                  { term: t('compliance.reports.raised'), value: formatDate(openRestatement.createdAt, 'full', { locale }) },
                ]}
              />
            </Panel>
          </div>
        ) : null}
      </Drawer>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.reports.title'),
            source: 'GET /api/v1/regulatory/reports → RegulatoryReportingEngine snapshots',
            note: t('compliance.reports.sourceNoteReports'),
            mode: reports.resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.reports.dueTitle'),
            source: 'GET /api/v1/regulatory/obligations → obligation ledger',
            note: t('compliance.reports.sourceNoteObligations'),
            mode: 'live',
          },
          {
            section: t('compliance.reports.restatementTitle'),
            source: 'GET /api/v1/regulatory/restatements → RestatementEngine.getRestatements()',
            note: t('compliance.reports.sourceNoteRestatements'),
            mode: 'live',
          },
          {
            section: t('compliance.reports.readOnlyTitle'),
            source: '—',
            note: t('compliance.reports.sourceNoteReadOnly'),
            mode: 'none',
          },
        ]}
      />
    </>
  );
}
