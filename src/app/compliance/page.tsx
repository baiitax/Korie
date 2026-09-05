'use client';

/**
 * Compliance dashboard.
 *
 * The reading order is the desk's priority order, not a grid of decorative
 * counters: what is on fire, what is waiting on you, what the queues look like,
 * how the money moved, what is due next — and a data sheet at the bottom that
 * states where each number came from.
 *
 * Nothing on this page is typed by hand. Every figure is either an answer from
 * the AML engines / master identity / health endpoint, or it is absent and
 * marked absent. When the counters cannot be read, the strip says so instead of
 * showing zeros, because a zero and an unknown look identical until somebody
 * acts on the wrong one.
 */

import Link from 'next/link';
import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Cpu,
  Inbox,
  ListChecks,
  OctagonAlert,
  RefreshCw,
  Scale,
  ShieldAlert,
  TimerReset,
} from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatMoney, formatDate, humanizeEnum } from '@/services/compliance/format';
import type { AlertRow, CaseRow, ObligationRow, TaskRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Button,
  Chip,
  Kpi,
  PageHead,
  Panel,
  Provenance,
  StatusChip,
} from '@/components/compliance/ui/Primitives';
import { ResourceState, SectionSkeleton, InlineNotice } from '@/components/compliance/ui/StateViews';
import { ComplianceTable, makeTableLabels } from '@/components/compliance/ui/Table';
import { SourceNotes } from '@/components/compliance/ui/Primitives';

export default function ComplianceDashboardPage() {
  const { t, locale, summary, summaryLoading, summaryError, summaryProvenance, refreshSummary, jurisdiction, mode } =
    useCompliancePortal();

  const tasks = useComplianceResource('tasks');
  const alerts = useComplianceResource('alerts');
  const cases = useComplianceResource('cases');
  const obligations = useComplianceResource('calendar');
  const health = useComplianceResource('systemHealth');

  const refreshAll = () => {
    refreshSummary();
    tasks.reload();
    alerts.reload();
    cases.reload();
    obligations.reload();
    health.reload();
  };

  const critical = summary?.criticalAlerts ?? 0;
  const breached = summary?.slaBreached ?? 0;
  const hasRisk = critical > 0 || breached > 0 || (summary?.overdueObligations ?? 0) > 0;

  return (
    <>
      <PageHead
        title={t('compliance.dashboard.title')}
        description={t('compliance.dashboard.subtitle')}
        resource={summaryProvenance}
        detail={mode === 'demo' ? t('compliance.shell.demoBuildDetail') : t('compliance.shell.liveBuildDetail')}
        actions={
          <>
            <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={refreshAll} pending={summaryLoading}>
              {summaryLoading ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
            <Link href="/compliance/work-queue" className="cmp-btn" data-variant="primary">
              <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              {t('compliance.dashboard.openQueue')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </>
        }
      />

      {/* ── Critical risk strip ─────────────────────────────────────────── */}
      {summaryLoading && !summary ? (
        <div className="cmp-card p-3">
          <SectionSkeleton label={t('compliance.states.loading')} rows={1} />
        </div>
      ) : summaryError || !summary ? (
        <InlineNotice tone="danger" icon={<OctagonAlert className="h-4 w-4" />}>
          <strong className="text-[var(--foreground)]">{t('compliance.dashboard.countersDownTitle')}</strong>{' '}
          {t('compliance.dashboard.countersDownBody')}
        </InlineNotice>
      ) : hasRisk ? (
        <section className="cmp-card p-3.5" style={{ borderColor: 'var(--sev-critical-border)', background: 'var(--sev-critical-soft)' }}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-[18px] w-[18px] flex-none" style={{ color: 'var(--sev-critical)' }} aria-hidden="true" />
              <div>
                <p className="text-[13px] font-extrabold" style={{ color: 'var(--sev-critical)' }}>
                  {t('compliance.dashboard.criticalTitle', { count: critical })}
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--foreground-muted)]">{t('compliance.dashboard.criticalBody')}</p>
              </div>
            </div>
            <ul className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/compliance/alerts?severity=CRITICAL" className="cmp-btn" data-variant="danger">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('compliance.dashboard.openCritical')}
                </Link>
              </li>
              <li>
                <Link href="/compliance/tasks" className="cmp-btn">
                  <TimerReset className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('compliance.dashboard.breachedCount', { count: breached })}
                </Link>
              </li>
              {summary.overdueObligations > 0 ? (
                <li>
                  <Link href="/compliance/calendar" className="cmp-btn">
                    <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('compliance.dashboard.overdueObligations', { count: summary.overdueObligations })}
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        </section>
      ) : (
        <InlineNotice tone="info" icon={<ClipboardCheck className="h-4 w-4" />}>
          {t('compliance.dashboard.allClear', { at: formatDate(new Date().toISOString(), 'full', { locale }) })}
        </InlineNotice>
      )}

      {/* ── Attention: the counters that change what someone does next ──── */}
      {summaryLoading && !summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="cmp-kpi">
              <div className="cmp-skeleton-line" style={{ width: '55%', height: 10 }} />
              <div className="cmp-skeleton-line mt-2" style={{ width: '38%', height: 26 }} />
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label={t('compliance.dashboard.kpi.openAlerts')}
            value={summary.openAlerts}
            note={t('compliance.dashboard.kpi.ofWhichCritical', { count: summary.criticalAlerts })}
            tone={summary.criticalAlerts > 0 ? 'critical' : 'neutral'}
            icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
            href="/compliance/alerts"
          />
          <Kpi
            label={t('compliance.dashboard.kpi.openCases')}
            value={summary.openCases}
            note={t('compliance.dashboard.kpi.awaitingDecision', { count: summary.awaitingDecision })}
            tone={summary.awaitingDecision > 0 ? 'attention' : 'neutral'}
            icon={<Inbox className="h-3.5 w-3.5" aria-hidden="true" />}
            href="/compliance/cases"
          />
          <Kpi
            label={t('compliance.dashboard.kpi.backlog')}
            value={summary.taskCount}
            note={t('compliance.dashboard.kpi.slaBreached', { count: summary.slaBreached })}
            tone={summary.slaBreached > 0 ? 'attention' : 'neutral'}
            icon={<ListChecks className="h-3.5 w-3.5" aria-hidden="true" />}
            href="/compliance/tasks"
          />
          <Kpi
            label={t('compliance.dashboard.kpi.approvals')}
            value={summary.pendingApprovals}
            note={t('compliance.dashboard.kpi.makerChecker')}
            icon={<ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />}
            href="/compliance/approvals"
          />
          <Kpi
            label={t('compliance.dashboard.kpi.kycBacklog')}
            value={summary.kycBacklog}
            note={t('compliance.dashboard.kpi.kybBacklog', { count: summary.kybBacklog })}
            icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
            href="/compliance/kyc"
          />
          <Kpi
            label={t('compliance.dashboard.kpi.highRisk')}
            value={summary.highRiskEntities}
            note={t('compliance.dashboard.kpi.highRiskSplit', {
              customers: summary.highRiskCustomers,
              businesses: summary.highRiskBusinesses,
            })}
            icon={<Scale className="h-3.5 w-3.5" aria-hidden="true" />}
            href="/compliance/risk"
          />
          <Kpi
            label={t('compliance.dashboard.kpi.oldest')}
            value={summary.queueOldestHours === undefined ? t('compliance.shell.notReported') : `${summary.queueOldestHours}h`}
            note={t('compliance.dashboard.kpi.oldestNote')}
            icon={<TimerReset className="h-3.5 w-3.5" aria-hidden="true" />}
            href="/compliance/work-queue"
          />
          <Kpi
            label={t('compliance.dashboard.kpi.sanctions')}
            value={summary.sanctionsPotentialMatches ?? t('compliance.shell.notConnected')}
            note={
              summary.sanctionsPotentialMatches === undefined
                ? t('compliance.dashboard.kpi.sanctionsNote')
                : t('compliance.dashboard.kpi.sanctionsRunning')
            }
            tone={summary.sanctionsPotentialMatches ? 'critical' : 'neutral'}
            icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
            href="/compliance/sanctions"
          />
        </div>
      ) : null}

      {/* ── What to work on first + platform state ──────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          title={t('compliance.dashboard.workQueue')}
          subtitle={t('compliance.dashboard.workQueueSub')}
          flush
          actions={
            <>
              <Provenance resource={tasks.resource} />
              <Link href="/compliance/tasks" className="cmp-btn cmp-btn--ghost">
                {t('compliance.dashboard.viewAll')}
              </Link>
            </>
          }
        >
          <div className="p-3">
            <ResourceState
              resource={tasks.resource}
              isLoading={tasks.isLoading}
              loadingLabel={t('compliance.dashboard.loadingWork')}
              emptyTitle={t('compliance.dashboard.workEmpty')}
              emptyBody={t('compliance.dashboard.workEmptyBody')}
              retryLabel={t('compliance.states.retry')}
              onRetry={tasks.reload}
              skeletonRows={4}
              unavailableTitle={t('compliance.states.unavailableTitle')}
              unavailableBody={t('compliance.dashboard.workUnavailable')}
            >
              <ul className="space-y-2">
                {tasks.resource.data.slice(0, 6).map((task: TaskRow) => (
                  <li key={task.id}>
                    <Link
                      href={task.href}
                      className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border)] p-2.5 transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <span className="mt-0.5 flex-none">
                        <Chip tone={task.priority === 'URGENT' ? 'critical' : task.priority === 'HIGH' ? 'high' : 'neutral'}>
                          {humanizeEnum(task.kind)}
                        </Chip>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-[var(--foreground)]">{task.title}</span>
                        <span className="mt-0.5 block text-[11.5px] text-[var(--foreground-muted)]">
                          {task.subjectRef ? <span className="cmp-ref mr-2">{task.subjectRef}</span> : null}
                          {task.dueAt ? formatDate(task.dueAt, 'short', { locale }) : t('compliance.shell.notReported')}
                          {task.assignedTo ? ` · ${task.assignedTo}` : ''}
                        </span>
                      </span>
                      {task.overdue ? (
                        <span className="flex-none">
                          <Chip tone="critical">{t('compliance.dashboard.overdue')}</Chip>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </ResourceState>
          </div>
        </Panel>

        <Panel
          title={t('compliance.dashboard.platform')}
          subtitle={t('compliance.dashboard.platformSub')}
          actions={<Provenance resource={health.resource} />}
        >
          <ResourceState
            resource={health.resource}
            isLoading={health.isLoading}
            loadingLabel={t('compliance.dashboard.loadingPlatform')}
            emptyTitle={t('compliance.dashboard.platformUnknown')}
            emptyBody={t('compliance.dashboard.platformUnknownBody')}
            retryLabel={t('compliance.states.retry')}
            onRetry={health.reload}
            skeleton="detail"
            skeletonRows={2}
            unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
            unavailableTitle={t('compliance.states.unavailableTitle')}
            unavailableBody={t('compliance.dashboard.platformUnavailable')}
          >
            {(() => {
              const report = health.resource.data[0];
              if (!report) return null;
              const rails = report.providers;
              const connected = rails.filter((p) => p.status === 'CONNECTED').length;
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={report.platformStatus} label={humanizeEnum(report.platformStatus)} severity={report.platformStatus !== 'OPERATIONAL'} />
                    {report.safeMode ? <Chip tone="critical">{t('compliance.dashboard.safeMode')}</Chip> : null}
                    <Chip tone={report.ledger.status === 'BALANCED' ? 'clear' : 'critical'}>
                      {report.ledger.status === 'BALANCED' ? t('compliance.dashboard.ledgerBalanced') : t('compliance.dashboard.ledgerImbalance')}
                    </Chip>
                    <Chip tone={report.database.status === 'HEALTHY' ? 'clear' : 'high'}>
                      {t('compliance.dashboard.dbLatency', {
                        read: report.database.readLatencyMs,
                        write: report.database.writeLatencyMs,
                      })}
                    </Chip>
                  </div>

                  <div>
                    <p className="cmp-dl__term mb-1">{t('compliance.dashboard.rails')}</p>
                    {rails.length ? (
                      <ul className="space-y-1">
                        {rails.slice(0, 5).map((provider) => (
                          <li key={provider.code} className="flex items-center justify-between gap-2 text-[12px]">
                            <span className="min-w-0 truncate text-[var(--foreground)]">
                              {provider.name}
                              <span className="ml-1.5 text-[11px] text-[var(--muted)]">{provider.country}</span>
                            </span>
                            <StatusChip status={provider.status} label={humanizeEnum(provider.status)} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[12px] text-[var(--foreground-muted)]">{t('compliance.dashboard.noRails')}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                      {t('compliance.dashboard.railsSummary', { connected, total: rails.length })}
                    </p>
                  </div>

                  <Link href="/compliance/system-health" className="cmp-btn w-full">
                    <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('compliance.dashboard.openHealth')}
                  </Link>
                </div>
              );
            })()}
          </ResourceState>
        </Panel>
      </div>

      {/* ── Queues, sortable where the officer needs it ─────────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title={t('compliance.dashboard.recentAlerts')}
          subtitle={t('compliance.dashboard.recentAlertsSub')}
          flush
          actions={
            <>
              <Provenance resource={alerts.resource} />
              <Link href="/compliance/alerts" className="cmp-btn cmp-btn--ghost">
                {t('compliance.dashboard.viewAll')}
              </Link>
            </>
          }
        >
          <div className="p-3">
            <ResourceState
              resource={alerts.resource}
              isLoading={alerts.isLoading}
              loadingLabel={t('compliance.dashboard.loadingAlerts')}
              emptyTitle={t('compliance.dashboard.alertsEmpty')}
              emptyBody={t('compliance.dashboard.alertsEmptyBody')}
              retryLabel={t('compliance.states.retry')}
              onRetry={alerts.reload}
              unavailableTitle={t('compliance.states.unavailableTitle')}
              unavailableBody={t('compliance.dashboard.alertsUnavailable')}
            >
              <ComplianceTable
                rows={alerts.resource.data}
                columns={[
                  {
                    key: 'ref',
                    header: t('compliance.dashboard.col.alert'),
                    primary: true,
                    sortValue: (row: AlertRow) => row.reference,
                    render: (row: AlertRow) => (
                      <div className="min-w-0">
                        <div className="cmp-cell-strong truncate">{row.subjectName}</div>
                        <div className="cmp-ref truncate">{row.reference}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'severity',
                    header: t('compliance.common.severity'),
                    mobileLabel: t('compliance.common.severity'),
                    sortValue: (row: AlertRow) => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(row.severity),
                    render: (row: AlertRow) => <StatusChip status={row.severity} label={humanizeEnum(row.severity)} severity />,
                  },
                  {
                    key: 'amount',
                    header: t('compliance.common.amount'),
                    align: 'end',
                    hideBelow: 'lg',
                    mobileLabel: t('compliance.common.amount'),
                    sortValue: (row: AlertRow) => row.amount,
                    render: (row: AlertRow) => <span className="tabular">{formatMoney(row.amount, row.currency, { locale })}</span>,
                  },
                  {
                    key: 'status',
                    header: t('compliance.common.status'),
                    hideBelow: 'md',
                    sortValue: (row: AlertRow) => row.status,
                    render: (row: AlertRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
                  },
                ]}
                getRowId={(row: AlertRow) => row.id}
                getRowHref={(row: AlertRow) => `/compliance/alerts/${encodeURIComponent(row.id)}`}
                getRowTone={(row: AlertRow) => (row.severity === 'CRITICAL' ? 'critical' : undefined)}
                pageSize={5}
                labels={makeTableLabels(t, t('compliance.dashboard.recentAlerts'))}
              />
            </ResourceState>
          </div>
        </Panel>

        <Panel
          title={t('compliance.dashboard.recentCases')}
          subtitle={t('compliance.dashboard.recentCasesSub')}
          flush
          actions={
            <>
              <Provenance resource={cases.resource} />
              <Link href="/compliance/cases" className="cmp-btn cmp-btn--ghost">
                {t('compliance.dashboard.viewAll')}
              </Link>
            </>
          }
        >
          <div className="p-3">
            <ResourceState
              resource={cases.resource}
              isLoading={cases.isLoading}
              loadingLabel={t('compliance.dashboard.loadingCases')}
              emptyTitle={t('compliance.dashboard.casesEmpty')}
              emptyBody={t('compliance.dashboard.casesEmptyBody')}
              retryLabel={t('compliance.states.retry')}
              onRetry={cases.reload}
              unavailableTitle={t('compliance.states.unavailableTitle')}
              unavailableBody={t('compliance.dashboard.casesUnavailable')}
            >
              <ComplianceTable
                rows={cases.resource.data}
                columns={[
                  {
                    key: 'case',
                    header: t('compliance.dashboard.col.case'),
                    primary: true,
                    sortValue: (row: CaseRow) => row.reference,
                    render: (row: CaseRow) => (
                      <div className="min-w-0">
                        <div className="cmp-cell-strong truncate">{row.title}</div>
                        <div className="cmp-ref truncate">
                          {row.reference} · {row.subjectName}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'exposure',
                    header: t('compliance.common.exposure'),
                    align: 'end',
                    hideBelow: 'md',
                    mobileLabel: t('compliance.common.exposure'),
                    sortValue: (row: CaseRow) => row.exposureAmount,
                    render: (row: CaseRow) => <span className="tabular">{formatMoney(row.exposureAmount, row.currency, { locale })}</span>,
                  },
                  {
                    key: 'status',
                    header: t('compliance.common.status'),
                    mobileLabel: t('compliance.common.status'),
                    sortValue: (row: CaseRow) => row.status,
                    render: (row: CaseRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
                  },
                ]}
                getRowId={(row: CaseRow) => row.id}
                getRowHref={(row: CaseRow) => `/compliance/cases/${encodeURIComponent(row.id)}#overview`}
                getRowTone={(row: CaseRow) => (row.slaBreached ? 'high' : undefined)}
                pageSize={5}
                labels={makeTableLabels(t, t('compliance.dashboard.recentCases'))}
              />
            </ResourceState>
          </div>
        </Panel>
      </div>

      {/* ── Shape of the risk: volume, mix, deadlines ───────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel
          title={t('compliance.dashboard.volume')}
          subtitle={t('compliance.dashboard.volumeSub')}
          actions={<Provenance resource={{ ...alerts.resource, derived: true }} />}
        >
          {summary ? (
            <VolumeChart
              rows={summary.volumeByDay}
              currencyTotals={{ ngn: summary.totalNgnAmount, xof: summary.totalXofAmount }}
              mix={summary.alertMix}
              labels={{
                title: t('compliance.dashboard.volumeAria'),
                empty: t('compliance.dashboard.volumeEmpty'),
                ngn: t('compliance.dashboard.volumeNgn'),
                xof: t('compliance.dashboard.volumeXof'),
                mix: t('compliance.dashboard.mix'),
              }}
            />
          ) : (
            <SectionSkeleton label={t('compliance.states.loading')} rows={3} variant="detail" />
          )}
        </Panel>

        <Panel title={t('compliance.dashboard.nextDeadlines')} subtitle={t('compliance.dashboard.nextDeadlinesSub')} actions={<Provenance resource={obligations.resource} />}>
          <ResourceState
            resource={obligations.resource}
            isLoading={obligations.isLoading}
            loadingLabel={t('compliance.dashboard.loadingDeadlines')}
            emptyTitle={t('compliance.dashboard.deadlinesEmpty')}
            emptyBody={t('compliance.dashboard.deadlinesEmptyBody')}
            retryLabel={t('compliance.states.retry')}
            onRetry={obligations.reload}
            skeletonRows={3}
            unavailableTitle={t('compliance.states.unavailableTitle')}
            unavailableBody={t('compliance.dashboard.deadlinesUnavailable')}
          >
            <ul className="space-y-2">
              {[...obligations.resource.data]
                .sort((a: ObligationRow, b: ObligationRow) => (a.dueDate < b.dueDate ? -1 : 1))
                .slice(0, 5)
                .map((row) => {
                  const overdue = Date.parse(row.dueDate) < Date.now() && !['COMPLETED', 'SUBMITTED', 'ACKNOWLEDGED'].includes(row.status);
                  return (
                    <li key={row.id} className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-bold text-[var(--foreground)]">{row.title}</span>
                        <span className="block text-[11.5px] text-[var(--foreground-muted)]">
                          {row.regulator} · {formatDate(row.dueDate, 'day', { locale })}
                        </span>
                      </span>
                      <StatusChip status={overdue ? 'OVERDUE' : row.status} label={humanizeEnum(overdue ? 'OVERDUE' : row.status)} />
                    </li>
                  );
                })}
            </ul>
          </ResourceState>
        </Panel>
      </div>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.dashboard.col.alert'),
            source: 'GET /api/aml/alerts → AmlAlertEngine',
            note: t('compliance.dashboard.sourcesAlerts'),
            mode: alerts.resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.dashboard.recentCases'),
            source: 'GET /api/aml/cases → AmlCaseManagementEngine',
            note: t('compliance.dashboard.sourcesCases'),
            mode: 'live',
          },
          {
            section: t('compliance.dashboard.kpi.backlog'),
            source: t('compliance.dashboard.sourcesDerived'),
            note: t('compliance.dashboard.sourcesDerivedNote'),
            mode: 'live',
          },
          {
            section: t('compliance.dashboard.platform'),
            source: 'GET /api/health → HealthCheckEngine.getDeepHealth',
            note: t('compliance.dashboard.sourcesHealth'),
            mode: 'live',
          },
          {
            section: t('compliance.dashboard.kpi.kycBacklog'),
            source: 'GET /api/core/v1/identity/persons + /documents',
            note: t('compliance.dashboard.sourcesKyc'),
            mode: 'live',
          },
          {
            section: t('compliance.dashboard.kpi.sanctions'),
            source: t('compliance.dashboard.sourcesSanctions'),
            note: t('compliance.dashboard.sourcesSanctionsNote'),
            mode: 'none',
          },
        ]}
      />
      <p className="pb-2 text-[11px] text-[var(--muted)]">
        {t('compliance.dashboard.footnote', { jurisdiction: jurisdiction.toUpperCase(), mode })}
      </p>
    </>
  );
}

/**
 * Alert volume by day. Counts only: NGN and XOF amounts are never summed into
 * one bar, so the money is reported as two separate totals underneath.
 */
const VolumeChart: React.FC<{
  rows: { date: string; count: number; ngnAmount: number; xofAmount: number }[];
  currencyTotals: { ngn: number; xof: number };
  mix: { label: string; value: number }[];
  labels: { title: string; empty: string; ngn: string; xof: string; mix: string };
}> = ({ rows, currencyTotals, mix, labels }) => {
  if (!rows.length)
    return (
      <div>
        <p className="py-2 text-[12.5px] text-[var(--foreground-muted)]">{labels.empty}</p>
        {mix.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {mix.map((row) => (
              <li key={row.label}>
                <Chip tone={row.label === 'CRITICAL' ? 'critical' : row.label === 'HIGH' ? 'high' : row.label === 'MEDIUM' ? 'medium' : 'low'}>
                  {row.label} · {row.value}
                </Chip>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div>
      <div className="flex h-[132px] items-end gap-1.5" role="img" aria-label={labels.title}>
        {rows.map((row) => (
          <div key={row.date} className="flex min-w-0 max-w-[46px] flex-1 flex-col items-center gap-1.5" title={`${row.date} · ${row.count} open alerts`}>
            <span
              className="w-full rounded-t-[4px]"
              style={{
                height: `${Math.max(8, Math.round((row.count / max) * 96))}px`,
                background: 'var(--brand-primary)',
                opacity: 0.35 + 0.65 * (row.count / max),
              }}
              aria-hidden="true"
            />
            <span className="cmp-ref text-[9.5px]" translate="no">
              {row.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <p className="cmp-dl__term mb-1">{labels.mix}</p>
        {mix.length ? (
          <ul className="space-y-1.5">
            {mix.map((row) => (
              <li key={row.label} className="flex items-center gap-2">
                <span className="w-[74px] flex-none text-[11.5px] font-semibold text-[var(--foreground-muted)]">{row.label}</span>
                <span className="h-[7px] min-w-[4px] flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(6, Math.round((row.value / Math.max(...mix.map((m) => m.value), 1)) * 100))}%`,
                      background:
                        row.label === 'CRITICAL'
                          ? 'var(--sev-critical)'
                          : row.label === 'HIGH'
                            ? 'var(--sev-high)'
                            : row.label === 'MEDIUM'
                              ? 'var(--sev-medium)'
                              : 'var(--sev-low)',
                    }}
                    aria-hidden="true"
                  />
                </span>
                <span className="w-[28px] flex-none text-right text-[11.5px] tabular font-bold">{row.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-[var(--foreground-muted)]">{labels.empty}</p>
        )}
      </div>
      <ul className="mt-2 grid gap-1 text-[12px] sm:grid-cols-2">
        <li className="flex items-center justify-between gap-2 rounded-[8px] bg-[var(--surface-2)] px-2 py-1.5">
          <span className="text-[var(--foreground-muted)]">{labels.ngn}</span>
          <span className="tabular font-bold">{formatMoney(currencyTotals.ngn, 'NGN')}</span>
        </li>
        <li className="flex items-center justify-between gap-2 rounded-[8px] bg-[var(--surface-2)] px-2 py-1.5">
          <span className="text-[var(--foreground-muted)]">{labels.xof}</span>
          <span className="tabular font-bold">{formatMoney(currencyTotals.xof, 'XOF')}</span>
        </li>
      </ul>
    </div>
  );
};
