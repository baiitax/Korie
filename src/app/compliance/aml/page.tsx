'use client';

/**
 * AML Transaction Monitoring Desk — rebuilt on the DB service pattern.
 *
 * Everything on this screen is read from the database through the compliance
 * service: the monitoring scenarios (`aml_scenarios`), the risk scoring rules
 * (`risk_rules`) and the alert queue (`aml_alerts`). The screen itself owns no
 * data and invents none.
 *
 * The "Run monitoring sweep" action is the real transaction surveillance
 * engine: it evaluates persisted rows in `transactions` — written by actual
 * customer and agency money movement — against the active scenarios and
 * files genuine alerts. An alert can only exist because money actually
 * moved; the sweep never fabricates activity.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, PlayCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { useComplianceAction, useComplianceResource } from '@/services/compliance/hooks';
import { formatMoney, humanizeEnum } from '@/services/compliance/format';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Button,
  Chip,
  PageHead,
  Panel,
  StatusChip,
} from '@/components/compliance/ui';
import { InlineNotice, ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';
import { SourceNotes } from '@/components/compliance/ui';

interface SweepSummary {
  scenariosRun?: number;
  transactionsEvaluated?: number;
  alertsCreated?: number;
  notes?: string[];
}

function windowLabel(seconds?: number): string {
  if (!seconds) return '—';
  if (seconds % 86400 === 0) return `${seconds / 86400}d`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  return `${seconds}s`;
}

export default function AmlMonitoringDeskPage() {
  const { t } = useCompliancePortal();
  const [term, setTerm] = useState('');
  const [lastSweep, setLastSweep] = useState<SweepSummary | null>(null);

  const scenarios = useComplianceResource('scenarios');
  const rules = useComplianceResource('policies');
  const alerts = useComplianceResource('alerts');
  const action = useComplianceAction();

  const scenarioRows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return scenarios.resource.data;
    return scenarios.resource.data.filter((row) =>
      `${row.code} ${row.name} ${row.category}`.toLowerCase().includes(needle),
    );
  }, [scenarios.resource.data, term]);

  const ruleRows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return rules.resource.data;
    return rules.resource.data.filter((row) =>
      `${row.title} ${row.category}`.toLowerCase().includes(needle),
    );
  }, [rules.resource.data, term]);

  const recentAlerts = useMemo(() => alerts.resource.data.slice(0, 6), [alerts.resource.data]);
  const filtersActive = term.trim().length > 0;
  const tableLabels = makeTableLabels(t, t('compliance.aml.scenarios.count'));

  async function runSweep() {
    const out = await action.runLive('aml.sweep', 'sweep', {});
    if (out.ok && out.value) {
      setLastSweep(out.value as SweepSummary);
      // The sweep just wrote alerts and marked transactions evaluated —
      // both queues must be re-read, not locally patched.
      alerts.reload();
    }
  }

  return (
    <>
      <PageHead
        title={t('compliance.aml.title')}
        description={t('compliance.aml.subtitle')}
        resource={scenarios.resource}
        actions={
          <>
            <Button
              icon={<PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={runSweep}
              pending={action.status === 'pending' && action.showPending}
            >
              {t('compliance.aml.sweep.run')}
            </Button>
            <Button
              icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => {
                scenarios.reload();
                rules.reload();
                alerts.reload();
              }}
              pending={scenarios.isLoading || scenarios.isRefreshing}
            >
              {scenarios.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
          </>
        }
      />

      {action.status === 'error' ? (
        <InlineNotice tone="danger" icon={<AlertTriangle className="h-4 w-4" />}>
          {action.result?.error?.message ?? t('compliance.actions.failedOutcome')}
        </InlineNotice>
      ) : null}

      {lastSweep ? (
        <InlineNotice tone={lastSweep.alertsCreated ? 'warning' : 'info'} icon={<ShieldAlert className="h-4 w-4" />}>
          {t('compliance.aml.sweep.outcome', {
            scenarios: String(lastSweep.scenariosRun ?? 0),
            transactions: String(lastSweep.transactionsEvaluated ?? 0),
            alerts: String(lastSweep.alertsCreated ?? 0),
          })}
          {lastSweep.notes && lastSweep.notes.length > 0 ? ` ${lastSweep.notes.join(' ')}` : ''}
        </InlineNotice>
      ) : null}

      <ResourceState
        resource={scenarios.resource}
        isLoading={scenarios.isLoading}
        loadingLabel={t('compliance.aml.scenarios.loading')}
        emptyTitle={filtersActive ? t('compliance.states.emptyFiltered') : t('compliance.aml.scenarios.empty')}
        emptyBody={filtersActive ? undefined : t('compliance.aml.scenarios.emptyBody')}
        retryLabel={t('compliance.states.retry')}
        onRetry={scenarios.reload}
        filtered={filtersActive}
        onClearFilters={() => setTerm('')}
        clearLabel={t('compliance.states.clearFilters')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.states.unauthorizedBody')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.aml.scenarios.unavailable')}
      >
        <TableToolbar
          searchValue={term}
          onSearch={setTerm}
          searchLabel={t('compliance.aml.scenarios.searchLabel')}
          searchPlaceholder={t('compliance.aml.scenarios.searchPlaceholder')}
          onClear={filtersActive ? () => setTerm('') : undefined}
          clearLabel={t('compliance.states.clearFilters')}
          resultCount={scenarioRows.length}
          resultLabel={(count) => t('compliance.aml.scenarios.resultCount', { count })}
        >
          <Chip tone="clear">{t('compliance.aml.scenarios.activeOnly')}</Chip>
        </TableToolbar>
        <ComplianceTable
          rows={scenarioRows}
          getRowId={(row) => row.id}
          labels={tableLabels}
          columns={[
            {
              key: 'code',
              header: t('compliance.aml.scenarios.col.code'),
              primary: true,
              render: (row) => (
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.code}</div>
                  <div className="cmp-cell-muted truncate text-[11.5px]">{row.category}</div>
                </div>
              ),
              sortValue: (row) => row.code,
            },
            {
              key: 'name',
              header: t('compliance.aml.scenarios.col.name'),
              hideBelow: 'md',
              render: (row) => <span className="cmp-cell-soft">{row.name}</span>,
              sortValue: (row) => row.name,
            },
            {
              key: 'severity',
              header: t('compliance.aml.scenarios.col.severity'),
              render: (row) => <StatusChip status={row.severity} label={humanizeEnum(row.severity)} severity />,
              sortValue: (row) => row.severity,
            },
            {
              key: 'threshold',
              header: t('compliance.aml.scenarios.col.threshold'),
              align: 'end',
              render: (row) =>
                row.thresholdAmount !== undefined ? (
                  <span className="tabular">{formatMoney(row.thresholdAmount, 'NGN')}</span>
                ) : (
                  '—'
                ),
              sortValue: (row) => row.thresholdAmount ?? 0,
            },
            {
              key: 'window',
              header: t('compliance.aml.scenarios.col.window'),
              align: 'end',
              hideBelow: 'sm',
              render: (row) => <span className="tabular">{windowLabel(row.timeWindowSeconds)}</span>,
              sortValue: (row) => row.timeWindowSeconds ?? 0,
            },
            {
              key: 'version',
              header: t('compliance.aml.scenarios.col.version'),
              align: 'end',
              hideBelow: 'lg',
              render: (row) => <span className="tabular">v{row.version ?? 1}</span>,
            },
          ]}
        />
      </ResourceState>

      <Panel
        title={t('compliance.aml.rules.title')}
        subtitle={t('compliance.aml.rules.subtitle')}
        footnote={t('compliance.aml.rules.footnote')}
      >
        <ResourceState
          resource={rules.resource}
          isLoading={rules.isLoading}
          loadingLabel={t('compliance.aml.rules.loading')}
          emptyTitle={filtersActive ? t('compliance.states.emptyFiltered') : t('compliance.aml.rules.empty')}
          emptyBody={filtersActive ? undefined : t('compliance.aml.rules.emptyBody')}
          retryLabel={t('compliance.states.retry')}
          onRetry={rules.reload}
          unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
          unauthorizedBody={t('compliance.states.unauthorizedBody')}
          unavailableTitle={t('compliance.states.unavailableTitle')}
          unavailableBody={t('compliance.aml.rules.unavailable')}
        >
          <ComplianceTable
            rows={ruleRows}
            getRowId={(row) => row.id}
            labels={tableLabels}
            columns={[
              {
                key: 'title',
                header: t('compliance.aml.rules.col.rule'),
                primary: true,
                render: (row) => (
                  <div className="min-w-0">
                    <div className="truncate font-medium">{row.title}</div>
                    <div className="cmp-cell-muted truncate text-[11.5px]">{row.category}</div>
                  </div>
                ),
                sortValue: (row) => row.title,
              },
              {
                key: 'status',
                header: t('compliance.common.status'),
                render: (row) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
                sortValue: (row) => row.status,
              },
            ]}
          />
        </ResourceState>
      </Panel>

      <Panel
        title={t('compliance.aml.alerts.title')}
        subtitle={t('compliance.aml.alerts.subtitle')}
        actions={
          <Link href="/compliance/alerts" className="cmp-btn">
            {t('compliance.aml.alerts.openQueue')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
        footnote={t('compliance.aml.alerts.footnote')}
      >
        {recentAlerts.length === 0 ? (
          <p className="cmp-cell-muted py-4 text-[13px]">{t('compliance.aml.alerts.empty')}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {recentAlerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  href={`/compliance/alerts/${alert.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 transition hover:bg-[var(--surface-hover,transparent)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{alert.reference}</span>
                    <span className="cmp-cell-muted block truncate text-[11.5px]">
                      {alert.scenarioCode ? `${alert.scenarioCode} · ` : ''}
                      {alert.subjectName} · {alert.transactionReference ?? '—'}
                    </span>
                  </span>
                  <StatusChip status={alert.severity} label={humanizeEnum(alert.severity)} severity />
                  <StatusChip status={alert.status} label={humanizeEnum(alert.status)} />
                  <span className="tabular text-[13px]">{formatMoney(alert.amount, alert.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.aml.scenarios.activeOnly'),
            source: t('compliance.aml.sources.scenarios'),
            mode: scenarios.resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.aml.sweep.run'),
            source: t('compliance.aml.sources.sweep'),
            mode: 'live',
          },
          {
            section: t('compliance.aml.alerts.title'),
            source: t('compliance.aml.sources.alerts'),
            mode: alerts.resource.source === 'demo' ? 'demo' : 'live',
          },
        ]}
      />
    </>
  );
}
