'use client';

/**
 * Provider rails — the internal view of what the platform is attached to.
 *
 * `GET /api/health/providers` is the resilience engine's own provider registry:
 * each rail's live status, circuit-breaker state and probe latency. Officers see
 * this because a settlement failure changes how an alert should be worked (a
 * rail in OPEN state means money did not move, which is a different story than a
 * customer who refused to pay).
 *
 * Nothing here can be operated from the console: there is no reconnect, reset or
 * credential endpoint, and provider configuration lives with platform
 * engineering. So the page reads, explains, and links to the place that acts.
 */

import Link from 'next/link';
import React from 'react';
import { ArrowRight, Cable, Radio, RefreshCw, ShieldAlert, Wifi } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { humanizeEnum } from '@/services/compliance/format';
import type { ProviderRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, KeyList, PageHead, Panel, Provenance, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { InlineNotice, LoadingBlock, ResourceState } from '@/components/compliance/ui';

/** What each rail is for, in one line — the code is the stable identifier. */
const RAIL_PURPOSE: Record<string, string> = {
  PROVIDUS_BANK_NG: 'compliance.integrations.purpose.providus',
  KORIS_BANK_NE: 'compliance.integrations.purpose.coris',
  NIBSS_NIP_GATEWAY: 'compliance.integrations.purpose.nip',
  NIMC_NIN_IDENTITY: 'compliance.integrations.purpose.nimc',
  CARD_AGGREGATOR_NODE: 'compliance.integrations.purpose.card',
};

export default function IntegrationsPage() {
  const { t } = useCompliancePortal();
  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('integrations');

  const rows = resource.data;
  const down = rows.filter((row: ProviderRow) => row.status !== 'CONNECTED');
  const tripped = rows.filter((row: ProviderRow) => row.circuitBreaker && row.circuitBreaker !== 'CLOSED');

  return (
    <>
      <PageHead
        title={t('compliance.integrations.title')}
        description={t('compliance.integrations.subtitle')}
        resource={resource}
        actions={
          <>
            <Link href="/compliance/system-health" className="cmp-btn">
              {t('compliance.nav.systemHealth')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={reload} pending={isLoading || isRefreshing}>
              {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
          </>
        }
      />

      {down.length > 0 || tripped.length > 0 ? (
        <InlineNotice tone="danger" icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}>
          {t('compliance.integrations.downNotice', { rails: down.length, breakers: tripped.length })}
        </InlineNotice>
      ) : null}

      <ResourceState
        resource={resource}
        isLoading={isLoading}
        loadingLabel={t('compliance.integrations.loading')}
        emptyTitle={t('compliance.integrations.empty')}
        emptyBody={t('compliance.integrations.emptyBody')}
        retryLabel={t('compliance.states.retry')}
        onRetry={reload}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.integrations.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.integrations.unavailable')}
      >
        {isLoading ? (
          <LoadingBlock label={t('compliance.integrations.loading')} variant="cards" rows={4} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row: ProviderRow) => {
              const healthy = row.status === 'CONNECTED' && (!row.circuitBreaker || row.circuitBreaker === 'CLOSED');
              return (
                <article
                  key={row.code}
                  className="flex flex-col gap-2 rounded-[var(--cmp-radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3"
                  style={healthy ? undefined : { borderColor: 'var(--sev-critical)' }}
                >
                  <header className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-start gap-2">
                      <span className="mt-0.5 text-[var(--foreground-muted)]">
                        <Cable className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-bold leading-[1.25] text-[var(--foreground)]">{row.name}</span>
                        <span className="cmp-ref block truncate">{row.code}</span>
                      </span>
                    </span>
                    <StatusChip status={row.status} label={humanizeEnum(row.status)} severity={!healthy} />
                  </header>

                  {RAIL_PURPOSE[row.code] ? (
                    <p className="text-[12.5px] leading-[1.5] text-[var(--foreground-muted)]">{t(RAIL_PURPOSE[row.code])}</p>
                  ) : null}

                  <KeyList
                    items={[
                      { term: t('compliance.integrations.col.country'), value: row.country === 'NE' ? 'Niger' : 'Nigeria' },
                      { term: t('compliance.integrations.col.breaker'), value: <Chip tone={row.circuitBreaker === 'CLOSED' ? 'clear' : 'high'}>{humanizeEnum(row.circuitBreaker)}</Chip> },
                      { term: t('compliance.integrations.col.latency'), value: <span className="tabular">{row.latencyMs} ms</span> },
                    ]}
                  />
                </article>
              );
            })}
          </div>
        )}
      </ResourceState>

      <Panel title={t('compliance.integrations.controlsTitle')}>
        <div className="space-y-3">
          <p className="text-[12.5px] leading-[1.55] text-[var(--foreground-muted)]">{t('compliance.integrations.controlsBody')}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/compliance/system-health" className="cmp-btn">
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              {t('compliance.health.title')}
            </Link>
            <Link href="/compliance/audit" className="cmp-btn">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              {t('compliance.integrations.traceRail')}
            </Link>
          </div>
        </div>
      </Panel>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.integrations.title'),
            source: 'GET /api/health/providers → ResilienceEngine.providerStatus()',
            note: t('compliance.integrations.sourceNote'),
            mode: 'live',
          },
          {
            section: t('compliance.integrations.controlsTitle'),
            source: '—',
            note: t('compliance.integrations.sourceNoteNone'),
            mode: 'none',
          },
        ]}
      />
    </>
  );
}
