'use client';

/**
 * System health for the compliance desk.
 *
 * One read: `GET /api/health`, the deep report the resilience engine produces —
 * platform status, safe mode, database latency and pool, the ledger
 * debit/credit invariant, identity engine counters and treasury liquidity. The
 * portal renders exactly what the report says.
 *
 * This page never simulates. It is the one screen where even a demo build
 * refuses to fall back to fixtures, because a green dot that came from a
 * fixture is the fastest way to make an on-call engineer believe a system is up.
 */

import Link from 'next/link';
import React from 'react';
import { Activity, ArrowRight, Database, Radio, RefreshCw, Scale, ShieldCheck, Users, Wallet } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, fromMinor, humanizeEnum } from '@/services/compliance/format';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, KeyList, PageHead, Panel, Provenance, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { InlineNotice, LoadingBlock, StateCard } from '@/components/compliance/ui';

export default function SystemHealthPage() {
  const { t, locale } = useCompliancePortal();
  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('systemHealth');
  const health = resource.data[0];

  const statusTone = health?.platformStatus === 'OPERATIONAL' ? 'clear' : health?.platformStatus === 'DEGRADED' ? 'high' : 'critical';

  return (
    <>
      <PageHead
        title={t('compliance.health.title')}
        description={t('compliance.health.subtitle')}
        resource={resource}
        actions={
          <>
            <Link href="/compliance/integrations" className="cmp-btn">
              {t('compliance.nav.integrations')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={reload} pending={isLoading || isRefreshing}>
              {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
          </>
        }
      />

      {isLoading ? <LoadingBlock label={t('compliance.health.loading')} variant="detail" /> : null}

      {!isLoading && !health ? (
        <StateCard
          tone="danger"
          icon={<Activity className="h-5 w-5" aria-hidden="true" />}
          title={t('compliance.health.unavailableTitle')}
          actions={
            <Button variant="primary" onClick={reload}>
              {t('compliance.states.retry')}
            </Button>
          }
        >
          {resource.error?.message ?? t('compliance.health.unavailableBody')}
          {resource.error?.hint ? ` ${resource.error.hint}` : ''}
        </StateCard>
      ) : null}

      {health ? (
        <div className="space-y-4">
          <Panel
            title={t('compliance.health.platform')}
            actions={
              <span className="flex flex-wrap items-center gap-2">
                <StatusChip status={health.platformStatus} label={humanizeEnum(health.platformStatus)} severity={health.platformStatus !== 'OPERATIONAL'} />
                {health.safeMode ? (
                  <Chip tone="critical" icon={<ShieldCheck className="h-3 w-3" aria-hidden="true" />}>
                    {t('compliance.health.safeMode')}
                  </Chip>
                ) : null}
              </span>
            }
            footnote={<Provenance resource={resource} detail={t('compliance.health.provenanceDetail', { at: formatDate(health.timestamp, 'full', { locale }) })} />}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile
                icon={<Database className="h-4 w-4" aria-hidden="true" />}
                label={t('compliance.health.database')}
                status={health.database.status}
                lines={[
                  t('compliance.health.readLatency', { ms: health.database.readLatencyMs }),
                  t('compliance.health.writeLatency', { ms: health.database.writeLatencyMs }),
                  t('compliance.health.pool', { active: health.database.poolActive, max: health.database.poolMax }),
                ]}
              />
              <Tile
                icon={<Scale className="h-4 w-4" aria-hidden="true" />}
                label={t('compliance.health.ledger')}
                status={health.ledger.status}
                lines={[
                  health.ledger.invariantPassed ? t('compliance.health.invariantPassed') : t('compliance.health.invariantFailed'),
                  t('compliance.health.journals', { count: health.ledger.totalJournalsCount }),
                  t('compliance.health.delta', { amount: formatMoney(fromMinor(health.ledger.debitCreditDeltaMinor) ?? 0, 'NGN', { locale }) }),
                ]}
              />
              <Tile
                icon={<Users className="h-4 w-4" aria-hidden="true" />}
                label={t('compliance.health.identity')}
                status={health.identityEngine.status}
                lines={[
                  t('compliance.health.persons', { count: health.identityEngine.totalPersonsCount }),
                  t('compliance.health.orgs', { count: health.identityEngine.totalOrgsCount }),
                  t('compliance.health.pendingKyc', { count: health.identityEngine.pendingKycCount }),
                ]}
              />
              <Tile
                icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
                label={t('compliance.health.treasury')}
                status={health.treasury.status}
                lines={[
                  `XOF ${formatMoney(fromMinor(health.treasury.availableLiquidityXofMinor) ?? 0, 'XOF', { locale })}`,
                  `NGN ${formatMoney(fromMinor(health.treasury.availableLiquidityNgnMinor) ?? 0, 'NGN', { locale })}`,
                ]}
              />
            </div>

            {health.ledger.status === 'IMBALANCE_DETECTED' || health.platformStatus === 'CRITICAL' ? (
              <div className="mt-3">
                <InlineNotice tone="danger">
                  {t('compliance.health.criticalNotice')}
                </InlineNotice>
              </div>
            ) : null}
          </Panel>

          <Panel
            title={t('compliance.health.providers')}
            actions={
              <Link href="/compliance/integrations" className="cmp-btn cmp-btn--ghost px-2">
                {t('compliance.health.providerDetail')}
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          >
            {health.providers.length === 0 ? (
              <p className="text-[12.5px] text-[var(--foreground-muted)]">{t('compliance.health.noProviders')}</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {health.providers.map((provider) => (
                  <li key={provider.code} className="rounded-[10px] border border-[var(--border)] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[13px] font-bold text-[var(--foreground)]">{provider.name}</span>
                      <StatusChip status={provider.status} label={humanizeEnum(provider.status)} severity={provider.status !== 'CONNECTED'} />
                    </div>
                    <div className="cmp-ref mt-1 flex flex-wrap items-center gap-2">
                      <span>{provider.code}</span>
                      <span>{provider.country === 'NE' ? 'Niger' : 'Nigeria'}</span>
                      <span className="tabular">{provider.latencyMs} ms</span>
                      <span>{humanizeEnum(provider.circuitBreaker)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('compliance.health.scopeTitle')}>
            <div className="grid gap-2 md:grid-cols-2">
              <KeyList items={[{ term: t('compliance.health.included'), value: t('compliance.health.includedBody') }]} />
              <KeyList items={[{ term: t('compliance.health.excluded'), value: t('compliance.health.excludedBody') }]} />
            </div>
          </Panel>
        </div>
      ) : null}

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.health.title'),
            source: 'GET /api/health → ResilienceEngine.deepHealthReport()',
            note: t('compliance.health.sourceNote'),
            mode: 'live',
          },
          {
            section: t('compliance.health.providers'),
            source: 'same report, `providers` array (also served at /api/health/providers)',
            note: t('compliance.health.sourceNoteProviders'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}

const Tile: React.FC<{ icon: React.ReactNode; label: string; status: string; lines: string[] }> = ({ icon, label, status, lines }) => (
  <div className="rounded-[var(--cmp-radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5">
    <div className="flex items-start justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
        <span className="text-[var(--foreground)]">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <StatusChip status={status} label={humanizeEnum(status)} severity={status !== 'HEALTHY' && status !== 'BALANCED' && status !== 'OPERATIONAL'} />
    </div>
    <ul className="mt-2 space-y-0.5">
      {lines.map((line) => (
        <li key={line} className="text-[11.5px] tabular text-[var(--foreground-muted)]">
          {line}
        </li>
      ))}
    </ul>
  </div>
);
