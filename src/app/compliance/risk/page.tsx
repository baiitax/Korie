'use client';

/**
 * Risk and fraud — the shape of the risk engine's output.
 *
 * Everything on this page is counted from two live reads: the decision log
 * (`GET /api/core/v1/risk/decisions`) and the deployed monitoring scenarios
 * (`GET /api/aml/scenarios`). Bands, holds and signal frequency are computed in
 * the browser from those rows, so the numbers reconcile with the transaction
 * monitoring queue line for line.
 *
 * There is no risk-appetite editor here. The engines publish no write route for
 * thresholds or model settings, and a slider that changed nothing on the server
 * would be the most expensive kind of lie in a risk console.
 */

import Link from 'next/link';
import React, { useMemo } from 'react';
import { Activity, ArrowRight, Gauge, PlayCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, humanizeEnum } from '@/services/compliance/format';
import type { MonitoringRow, ScenarioRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, Kpi, PageHead, Panel, Provenance, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { EmptyState, InlineNotice, LoadingBlock } from '@/components/compliance/ui';
import { ComplianceTable, makeTableLabels } from '@/components/compliance/ui';

const BANDS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function RiskPage() {
  const { t, locale } = useCompliancePortal();
  const decisions = useComplianceResource('telemetry');
  const scenarios = useComplianceResource('scenarios');
  const loading = decisions.isLoading || scenarios.isLoading;

  const stats = useMemo(() => {
    const rows: MonitoringRow[] = decisions.resource.data;
    const held = rows.filter((row) => row.held);
    const byBand = BANDS.map((band) => ({ band, count: rows.filter((row) => (row.riskBand ?? '').toUpperCase() === band).length }));
    const signalCounts = new Map<string, number>();
    rows.forEach((row) => row.signals.forEach((signal) => signalCounts.set(signal.code, (signalCounts.get(signal.code) ?? 0) + 1)));
    const scores = rows.map((row) => row.riskScore).filter((value): value is number => typeof value === 'number');
    const latencies = rows.map((row) => row.evaluationLatencyMs).filter((value): value is number => typeof value === 'number');
    return {
      total: rows.length,
      held: held.length,
      avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined,
      avgLatency: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : undefined,
      byBand,
      signals: Array.from(signalCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      exposure: held.reduce((sum, row) => sum + (row.amount ?? 0), 0),
      currency: held[0]?.currency ?? 'NGN',
      policy: rows.find((row) => row.policyVersion)?.policyVersion,
      model: rows.find((row) => row.modelVersion)?.modelVersion,
    };
  }, [decisions.resource.data]);

  const activeScenarios = scenarios.resource.data.filter((row: ScenarioRow) => row.active);

  return (
    <>
      <PageHead
        title={t('compliance.risk.title')}
        description={t('compliance.risk.subtitle')}
        resource={decisions.resource}
        actions={
          <>
            <Link href="/compliance/aml" className="cmp-btn">
              {t('compliance.nav.amlRules')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Button
              icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => {
                decisions.reload();
                scenarios.reload();
              }}
              pending={loading}
            >
              {decisions.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
          </>
        }
      />

      {stats.held > 0 ? (
        <InlineNotice tone="warning" icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}>
          {t('compliance.risk.holdNotice', { count: stats.held, amount: formatMoney(stats.exposure, stats.currency, { locale }) })}
        </InlineNotice>
      ) : null}

      {loading ? (
        <LoadingBlock label={t('compliance.risk.loading')} variant="cards" rows={4} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label={t('compliance.risk.kpi.evaluated')} value={stats.total} note={t('compliance.risk.kpi.evaluatedNote')} icon={<Gauge className="h-3.5 w-3.5" aria-hidden="true" />} resource={decisions.resource} />
            <Kpi
              label={t('compliance.risk.kpi.held')}
              value={stats.held}
              tone={stats.held > 0 ? 'attention' : 'neutral'}
              note={t('compliance.risk.kpi.heldNote')}
              icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
              resource={decisions.resource}
            />
            <Kpi
              label={t('compliance.risk.kpi.avgScore')}
              value={typeof stats.avgScore === 'number' ? stats.avgScore.toFixed(1) : t('compliance.shell.notReported')}
              note={t('compliance.risk.kpi.avgScoreNote')}
              resource={decisions.resource}
            />
            <Kpi
              label={t('compliance.risk.kpi.avgLatency')}
              value={typeof stats.avgLatency === 'number' ? `${stats.avgLatency.toFixed(0)} ms` : t('compliance.shell.notReported')}
              note={t('compliance.risk.kpi.avgLatencyNote')}
              resource={decisions.resource}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Panel
              title={t('compliance.risk.bandsTitle')}
              subtitle={t('compliance.risk.bandsSubtitle', { policy: stats.policy ?? t('compliance.shell.notReported'), model: stats.model ?? t('compliance.shell.notReported') })}
              actions={
                <Link href="/compliance/transactions" className="cmp-btn cmp-btn--ghost px-2">
                  {t('compliance.risk.openFeed')}
                </Link>
              }
              footnote={<Provenance resource={decisions.resource} detail={t('compliance.risk.bandsProvenance')} />}
            >
              {stats.total === 0 ? (
                <EmptyState
                  title={t('compliance.risk.noDecisions')}
                  body={t('compliance.risk.noDecisionsBody')}
                  action={
                    <Link href="/compliance/transactions" className="cmp-btn cmp-btn--primary">
                      <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('compliance.transactions.run')}
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {stats.byBand.map(({ band, count }) => {
                    const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={band}>
                        <div className="flex items-center justify-between gap-2 text-[12px]">
                          <StatusChip status={band} label={humanizeEnum(band)} severity={band === 'HIGH' || band === 'CRITICAL'} />
                          <span className="tabular text-[var(--foreground-muted)]">
                            {t('compliance.risk.bandCount', { count, pct })}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]" role="img" aria-label={`${humanizeEnum(band)}: ${count} of ${stats.total}`}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, background: `var(--sev-${band === 'CRITICAL' ? 'critical' : band === 'HIGH' ? 'high' : band === 'MEDIUM' ? 'medium' : 'clear'})` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {stats.signals.length > 0 ? (
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      <h3 className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                        {t('compliance.risk.signalsTitle')}
                      </h3>
                      <ul className="flex flex-wrap gap-1.5">
                        {stats.signals.map(([code, count]) => (
                          <li key={code}>
                            <Chip tone="neutral" icon={<Activity className="h-3 w-3" aria-hidden="true" />}>
                              {humanizeEnum(code)} <span className="tabular">×{count}</span>
                            </Chip>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </Panel>

            <Panel
              title={t('compliance.risk.rulesTitle')}
              subtitle={t('compliance.risk.rulesSubtitle', { active: activeScenarios.length, total: scenarios.resource.data.length })}
              actions={
                <Link href="/compliance/aml" className="cmp-btn cmp-btn--ghost px-2">
                  {t('compliance.risk.allRules')}
                </Link>
              }
              footnote={<Provenance resource={scenarios.resource} />}
            >
              {scenarios.isLoading ? (
                <LoadingBlock label={t('compliance.risk.rulesLoading')} variant="table" rows={3} />
              ) : scenarios.resource.data.length === 0 ? (
                <EmptyState title={t('compliance.risk.noRules')} body={t('compliance.risk.noRulesBody')} />
              ) : (
                <ul className="space-y-2">
                  {scenarios.resource.data.slice(0, 5).map((row: ScenarioRow) => (
                    <li key={row.id} className="rounded-[10px] border border-[var(--border)] p-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12.5px] font-bold text-[var(--foreground)]">{row.name}</span>
                        <StatusChip status={row.severity} label={humanizeEnum(row.severity)} severity={row.severity === 'CRITICAL' || row.severity === 'HIGH'} />
                        {!row.active ? <Chip tone="neutral">{t('compliance.risk.inactive')}</Chip> : null}
                      </div>
                      <div className="cmp-ref mt-1 truncate">{row.code}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title={t('compliance.risk.recentTitle')} footnote={<Provenance resource={decisions.resource} />}>
            {decisions.resource.data.length === 0 ? (
              <EmptyState title={t('compliance.risk.noDecisions')} />
            ) : (
              <ComplianceTable
                rows={decisions.resource.data.slice(0, 8)}
                columns={[
                  { key: 'ref', header: t('compliance.transactions.col.reference'), primary: true, mobileLabel: t('compliance.transactions.col.reference'), render: (row: MonitoringRow) => <span className="cmp-ref">{row.reference}</span> },
                  { key: 'band', header: t('compliance.risk.col.band'), mobileLabel: t('compliance.risk.col.band'), render: (row: MonitoringRow) => <StatusChip status={row.riskBand ?? row.decision} label={humanizeEnum(row.riskBand ?? row.decision)} severity={row.held} /> },
                  { key: 'score', header: t('compliance.transactions.col.score'), align: 'end', hideBelow: 'sm', sortValue: (row: MonitoringRow) => row.riskScore ?? -1, render: (row: MonitoringRow) => <span className="tabular">{typeof row.riskScore === 'number' ? row.riskScore : '—'}</span> },
                  { key: 'reason', header: t('compliance.risk.col.reason'), hideBelow: 'md', render: (row: MonitoringRow) => <span className="line-clamp-2 text-[12px] text-[var(--foreground-muted)]">{row.reason ?? t('compliance.shell.notReported')}</span> },
                  { key: 'when', header: t('compliance.transactions.col.evaluated'), hideBelow: 'lg', sortValue: (row: MonitoringRow) => row.createdAt, render: (row: MonitoringRow) => <span className="text-[12px] text-[var(--foreground-muted)]">{formatDate(row.createdAt, 'short', { locale })}</span> },
                ]}
                getRowId={(row: MonitoringRow) => row.id}
                labels={makeTableLabels(t, t('compliance.risk.recentTitle'))}
                pageSize={8}
              />
            )}
          </Panel>
        </div>
      )}

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.risk.bandsTitle'),
            source: 'GET /api/core/v1/risk/decisions → RiskEngine.decisionLog()',
            note: t('compliance.risk.sourceNoteDecisions'),
            mode: decisions.resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.risk.rulesTitle'),
            source: 'GET /api/aml/scenarios → AmlScenarioEngine.getScenarios()',
            note: t('compliance.risk.sourceNoteScenarios'),
            mode: scenarios.resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.risk.rulesTitle'),
            source: '—',
            note: t('compliance.risk.sourceNoteNoEditor'),
            mode: 'none',
          },
        ]}
      />
    </>
  );
}
