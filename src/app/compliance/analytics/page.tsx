'use client';

/**
 * Compliance & risk analytics — computed, not asserted (PS-5 fix, roadmap 2.3).
 *
 * Every number on this page comes from GET /api/compliance/analytics, which
 * computes each KPI from a named table and ships the numerator and
 * denominator behind it. A metric with nothing to measure renders as
 * NOT ASSESSED with the reason — the old screen showed four invented KPIs
 * ("28.4% conversion", "18.2 hrs SLA", "62.5% false positives", "99.4%
 * compliance score") and three fabricated breakdowns, none from any source.
 */

import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, formatRelative, humanizeEnum } from '@/services/compliance/format';
import type { AnalyticsKpi, AnalyticsRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Button,
  Chip,
  Kpi,
  KeyList,
  PageHead,
  Panel,
  SourceNotes,
  StatusChip,
} from '@/components/compliance/ui';
import { ResourceState } from '@/components/compliance/ui';

const KPI_LABELS: Record<string, string> = {
  alert_to_case_conversion: 'compliance.analytics.kpi.alertToCase',
  mean_case_resolution_hours: 'compliance.analytics.kpi.resolutionHours',
  sanctions_screening_runs: 'compliance.analytics.kpi.screeningRuns',
  sanctions_false_positive_rate: 'compliance.analytics.kpi.falsePositiveRate',
  obligations_overdue: 'compliance.analytics.kpi.obligationsOverdue',
};

function formatKpiValue(kpi: AnalyticsKpi): string {
  if (!kpi.assessed || kpi.value == null) return '—';
  if (kpi.unit === 'percent') return `${kpi.value}%`;
  if (kpi.unit === 'hours') return `${kpi.value} h`;
  return String(kpi.value);
}

export default function ComplianceAnalyticsPage() {
  const { t } = useCompliancePortal();
  const analytics = useComplianceResource('analytics');
  const row: AnalyticsRow | undefined = analytics.resource.data[0];

  const jurisdictionMax = useMemo(
    () => Math.max(1, ...(row?.jurisdictionExposure ?? []).map((j) => j.exposureAmount)),
    [row],
  );
  const alertTotal = useMemo(
    () => (row?.alertSeverity ?? []).reduce((sum, s) => sum + s.count, 0),
    [row],
  );

  return (
    <>
      <PageHead
        title={t('compliance.analytics.title')}
        description={t('compliance.analytics.subtitle')}
        resource={analytics.resource}
        actions={
          <Button
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={analytics.reload}
            pending={analytics.isRefreshing}
          >
            {analytics.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <ResourceState
        resource={analytics.resource}
        isLoading={analytics.isLoading}
        loadingLabel={t('compliance.analytics.loading')}
        emptyTitle={t('compliance.analytics.empty')}
        emptyBody={t('compliance.analytics.emptyBody')}
        filtered={false}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.analytics.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.analytics.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={analytics.reload}
      >
        {row && (
          <>
            {row.evaluatedAt && (
              <p className="cmp-cell-muted text-[12px]">
                {t('compliance.analytics.evaluatedAt')} {formatDate(row.evaluatedAt)} ·{' '}
                {t('compliance.analytics.windowLabel', { days: row.windowDays })}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {row.kpis.map((kpi) => (
                <Kpi
                  key={kpi.key}
                  label={t(KPI_LABELS[kpi.key] ?? 'compliance.analytics.kpi.unknown')}
                  value={formatKpiValue(kpi)}
                  tone={
                    !kpi.assessed
                      ? 'neutral'
                      : kpi.key === 'obligations_overdue' && (kpi.value ?? 0) > 0
                        ? 'critical'
                        : 'neutral'
                  }
                  note={
                    <div className="space-y-1">
                      {!kpi.assessed && (
                        <Chip tone="high">{t('compliance.analytics.notAssessed')}</Chip>
                      )}
                      {kpi.denominator != null && (
                        <div className="text-[11px]">
                          {kpi.numerator ?? '—'} / {kpi.denominator}
                        </div>
                      )}
                      <div className="text-[11px] leading-snug">{kpi.details}</div>
                    </div>
                  }
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Panel title={t('compliance.analytics.jurisdictionTitle')}>
                {row.jurisdictionExposure.length === 0 ? (
                  <p className="cmp-cell-muted py-4 text-[13px]">{t('compliance.analytics.noCases')}</p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {row.jurisdictionExposure.map((j) => (
                      <li key={j.jurisdiction} className="py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium">{humanizeEnum(j.jurisdiction)}</span>
                          <Chip tone="neutral">
                            {j.openCases}/{j.totalCases} {t('compliance.analytics.openCases')}
                          </Chip>
                          <span className="tabular ml-auto text-[13px]">
                            {formatMoney(j.exposureAmount, j.currency)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2,rgba(0,0,0,0.25))]">
                          <div
                            className="h-1.5 rounded-full bg-[var(--brand-primary)]"
                            style={{ width: `${Math.max(4, (j.exposureAmount / jurisdictionMax) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title={t('compliance.analytics.severityTitle')}>
                {alertTotal === 0 ? (
                  <p className="cmp-cell-muted py-4 text-[13px]">{t('compliance.analytics.noAlerts')}</p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {row.alertSeverity.map((s) => (
                      <li key={s.severity} className="flex items-center gap-2 py-2.5">
                        <StatusChip status={s.severity} label={humanizeEnum(s.severity)} severity />
                        <span className="tabular ml-auto text-[13px]">
                          {s.count} / {alertTotal}
                        </span>
                      </li>
                    ))}
                    {row.alertStatus.map((s) => (
                      <li key={s.status} className="flex items-center gap-2 py-2.5">
                        <StatusChip status={s.status} label={humanizeEnum(s.status)} />
                        <span className="tabular ml-auto text-[13px]">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            {row.evaluatedAt && (
              <KeyList
                items={[
                  { term: t('compliance.analytics.computedAt'), value: formatRelative(row.evaluatedAt), mono: true },
                ]}
              />
            )}
          </>
        )}
      </ResourceState>

      <SourceNotes
        title={t('compliance.analytics.sourcesTitle')}
        rows={[
          {
            section: t('compliance.analytics.title'),
            source: 'GET /api/compliance/analytics',
            mode: analytics.resource.source === 'demo' ? 'demo' : 'live',
            note: 'public.aml_alerts · public.aml_cases · public.audit_events (AML_SCREENING_RUN) · public.regulatory_obligations',
          },
        ]}
      />
    </>
  );
}
