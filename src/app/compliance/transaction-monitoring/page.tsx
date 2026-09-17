'use client';

/**
 * Transaction monitoring — real telemetry (PS-5 fix, roadmap 2.2).
 *
 * Two live reads, no mock feed:
 *   1. `aml-alerts` — the monitoring scenarios that actually fired
 *      (scenario, severity, what happened, why it is suspicious), each
 *      linking to its alert investigation.
 *   2. `risk-decisions` — the risk engine's persisted decision log
 *      (decision, composite score, rule hits, latency) for every payment
 *      the engine evaluated.
 *
 * With nothing flowing (no alerts, no decisions in the window) the page says
 * so — an honest zero, never a fabricated busy feed. The old screen showed
 * five invented transactions with fictional customer names.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, formatRelative, humanizeEnum, shortRef } from '@/services/compliance/format';
import type { AlertRow, MonitoringRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Button,
  Chip,
  KeyList,
  PageHead,
  Panel,
  SourceNotes,
  StatusChip,
} from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';

const OPEN_ALERT_STATUSES = ['NEW', 'OPEN', 'IN_REVIEW', 'ACKNOWLEDGED', 'TRIAGE'];
const DECISIONS = ['PASS', 'FLAG', 'BLOCK', 'HOLD'] as const;

export default function TransactionMonitoringPage() {
  const { t } = useCompliancePortal();
  const alerts = useComplianceResource('alerts');
  const decisions = useComplianceResource('telemetry');
  const [term, setTerm] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | (typeof DECISIONS)[number]>('ALL');

  const openAlerts = useMemo(
    () => alerts.resource.data.filter((a: AlertRow) => OPEN_ALERT_STATUSES.includes(a.status)),
    [alerts.resource.data],
  );

  const feed = useMemo(() => {
    const q = term.trim().toLowerCase();
    return decisions.resource.data
      .filter((row: MonitoringRow) => decisionFilter === 'ALL' || row.decision === decisionFilter)
      .filter(
        (row: MonitoringRow) =>
          !q ||
          row.reference.toLowerCase().includes(q) ||
          (row.subjectName ?? row.subjectId ?? '').toLowerCase().includes(q) ||
          row.decision.toLowerCase().includes(q) ||
          row.signals.some((s) => s.code.toLowerCase().includes(q)),
      );
  }, [decisions.resource.data, term, decisionFilter]);

  const decisionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of decisions.resource.data) counts[row.decision] = (counts[row.decision] ?? 0) + 1;
    return counts;
  }, [decisions.resource.data]);

  return (
    <>
      <PageHead
        title={t('compliance.transactionMonitoring.title')}
        description={t('compliance.transactionMonitoring.subtitle')}
        resource={decisions.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => {
              alerts.reload();
              decisions.reload();
            }}
            pending={alerts.isRefreshing || decisions.isRefreshing}
          >
            {alerts.isRefreshing || decisions.isRefreshing
              ? t('compliance.states.refreshing')
              : t('compliance.states.refresh')}
          </Button>
        }
      />

      {/* ── Section 1: monitoring scenarios that fired ───────────────────── */}
      <Panel title={t('compliance.transactionMonitoring.alertsTitle')}>
        <ResourceState
          resource={alerts.resource}
          isLoading={alerts.isLoading}
          loadingLabel={t('compliance.transactionMonitoring.alertsLoading')}
          emptyTitle={t('compliance.transactionMonitoring.alertsEmpty')}
          emptyBody={t('compliance.transactionMonitoring.alertsEmptyBody')}
          filtered={false}
          unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
          unauthorizedBody={t('compliance.transactionMonitoring.unauthorized')}
          unavailableTitle={t('compliance.states.unavailableTitle')}
          unavailableBody={t('compliance.transactionMonitoring.unavailable')}
          retryLabel={t('compliance.states.retry')}
          onRetry={alerts.reload}
        >
          <ul className="divide-y divide-[var(--border)]">
            {openAlerts.map((alert: AlertRow) => (
              <li key={alert.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={alert.severity} label={humanizeEnum(alert.severity)} severity />
                  <Chip tone="clear">{alert.scenarioCode ?? alert.reference}</Chip>
                  <StatusChip status={alert.status} label={humanizeEnum(alert.status)} />
                  {alert.slaBreached && (
                    <Chip tone="critical">{t('compliance.transactionMonitoring.slaBreached')}</Chip>
                  )}
                  <span className="cmp-cell-muted ml-auto text-[11.5px]" title={formatDate(alert.triggeredAt)}>
                    {formatRelative(alert.triggeredAt)}
                  </span>
                </div>
                {alert.whatHappened && (
                  <p className="mt-1.5 text-[13px] text-[var(--foreground)]">{alert.whatHappened}</p>
                )}
                {alert.whySuspicious && (
                  <p className="cmp-cell-muted mt-1 text-[12px]">
                    {t('compliance.transactionMonitoring.whySuspicious')}: {alert.whySuspicious}
                  </p>
                )}
                <div className="mt-2">
                  <KeyList
                    items={[
                      ...(alert.transactionReference
                        ? [
                            {
                              term: t('compliance.common.transaction'),
                              value: shortRef(alert.transactionReference),
                              mono: true,
                            },
                          ]
                        : []),
                      {
                        term: t('compliance.common.amount'),
                        value: formatMoney(alert.amount, alert.currency),
                      },
                      {
                        term: t('compliance.common.subject'),
                        value: alert.subjectName,
                      },
                    ]}
                  />
                </div>
                <Link
                  href={`/compliance/alerts/${alert.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--brand-primary)] hover:underline"
                >
                  {t('compliance.transactionMonitoring.openAlert')}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </ResourceState>
      </Panel>

      {/* ── Section 2: the risk engine's decision stream ─────────────────── */}
      <ResourceState
        resource={decisions.resource}
        isLoading={decisions.isLoading}
        loadingLabel={t('compliance.transactionMonitoring.loading')}
        emptyTitle={t('compliance.transactionMonitoring.empty')}
        emptyBody={t('compliance.transactionMonitoring.emptyBody')}
        filtered={term !== '' || decisionFilter !== 'ALL'}
        onClearFilters={() => {
          setTerm('');
          setDecisionFilter('ALL');
        }}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.transactionMonitoring.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.transactionMonitoring.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={decisions.reload}
      >
        <ComplianceTable
          rows={feed}
          getRowId={(row: MonitoringRow) => row.id}
          labels={makeTableLabels(t, t('compliance.transactionMonitoring.tableCaption'))}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.transactionMonitoring.searchLabel')}
              searchPlaceholder={t('compliance.transactionMonitoring.searchPlaceholder')}
            >
              <select
                aria-label={t('compliance.transactionMonitoring.decisionFilterLabel')}
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value as typeof decisionFilter)}
                className="cmp-input max-w-[220px]"
              >
                <option value="ALL">
                  {t('compliance.transactionMonitoring.allDecisions')} ({decisions.resource.data.length})
                </option>
                {DECISIONS.map((d) => (
                  <option key={d} value={d}>
                    {humanizeEnum(d)} {decisionCounts[d] ? `(${decisionCounts[d]})` : ''}
                  </option>
                ))}
              </select>
            </TableToolbar>
          }
          columns={[
            {
              key: 'reference',
              header: t('compliance.common.transaction'),
              primary: true,
              mobileLabel: t('compliance.common.transaction'),
              sortValue: (row: MonitoringRow) => row.reference,
              render: (row: MonitoringRow) => (
                <div className="min-w-0">
                  <div className="cmp-ref truncate">{shortRef(row.reference)}</div>
                  <div className="cmp-cell-muted truncate text-[11.5px]">
                    {row.subjectName ??
                      row.subjectId ??
                      t('compliance.transactionMonitoring.unknownSubject')}
                  </div>
                </div>
              ),
            },
            {
              key: 'decision',
              header: t('compliance.transactionMonitoring.col.decision'),
              mobileLabel: t('compliance.transactionMonitoring.col.decision'),
              sortValue: (row: MonitoringRow) => row.decision,
              render: (row: MonitoringRow) => (
                <StatusChip
                  status={row.decision}
                  label={humanizeEnum(row.decision)}
                  severity={row.decision === 'BLOCK' || row.decision === 'HOLD' || row.held}
                />
              ),
            },
            {
              key: 'score',
              header: t('compliance.transactionMonitoring.col.score'),
              mobileLabel: t('compliance.transactionMonitoring.col.score'),
              sortValue: (row: MonitoringRow) => row.riskScore ?? 0,
              render: (row: MonitoringRow) => (
                <span className="cmp-ref">
                  {row.riskScore ?? '—'}
                  {row.riskBand ? ` · ${humanizeEnum(row.riskBand)}` : ''}
                </span>
              ),
            },
            {
              key: 'signals',
              header: t('compliance.transactionMonitoring.col.signals'),
              mobileLabel: t('compliance.transactionMonitoring.col.signals'),
              hideBelow: 'md',
              sortValue: (row: MonitoringRow) => row.signals.length,
              render: (row: MonitoringRow) =>
                row.signals.length ? (
                  <div className="flex flex-wrap gap-1">
                    {row.signals.slice(0, 3).map((s, i) => (
                      <Chip key={`${s.code}-${i}`} tone="neutral">
                        {s.code}
                      </Chip>
                    ))}
                    {row.signals.length > 3 && <Chip tone="neutral">+{row.signals.length - 3}</Chip>}
                  </div>
                ) : (
                  <span className="cmp-cell-muted">—</span>
                ),
            },
            {
              key: 'reason',
              header: t('compliance.transactionMonitoring.col.reason'),
              mobileLabel: t('compliance.transactionMonitoring.col.reason'),
              hideBelow: 'lg',
              sortValue: (row: MonitoringRow) => row.reason ?? '',
              render: (row: MonitoringRow) => (
                <span className="cmp-cell-muted block max-w-xs truncate">{row.reason ?? '—'}</span>
              ),
            },
            {
              key: 'latency',
              header: t('compliance.transactionMonitoring.col.latency'),
              mobileLabel: t('compliance.transactionMonitoring.col.latency'),
              hideBelow: 'lg',
              sortValue: (row: MonitoringRow) => row.evaluationLatencyMs ?? 0,
              render: (row: MonitoringRow) =>
                row.evaluationLatencyMs != null ? (
                  <span className="cmp-ref">{row.evaluationLatencyMs} ms</span>
                ) : (
                  <span className="cmp-cell-muted">—</span>
                ),
            },
            {
              key: 'created',
              header: t('compliance.transactionMonitoring.col.evaluated'),
              mobileLabel: t('compliance.transactionMonitoring.col.evaluated'),
              sortValue: (row: MonitoringRow) => Date.parse(row.createdAt) || 0,
              render: (row: MonitoringRow) => (
                <span className="cmp-ref" title={formatDate(row.createdAt)}>
                  {formatRelative(row.createdAt)}
                </span>
              ),
            },
          ]}
        />
      </ResourceState>

      <SourceNotes
        title={t('compliance.transactionMonitoring.sourcesTitle')}
        rows={[
          {
            section: t('compliance.transactionMonitoring.alertsTitle'),
            source: 'GET /api/compliance/data/aml-alerts',
            mode: alerts.resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.transactionMonitoring.title'),
            source: 'GET /api/compliance/data/risk-decisions',
            mode: decisions.resource.source === 'demo' ? 'demo' : 'live',
          },
        ]}
      />
    </>
  );
}
