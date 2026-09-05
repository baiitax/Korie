'use client';

/**
 * Watchlists and screening.
 *
 * Two separate truths on one screen, and the page keeps them apart:
 *
 * 1. The *list register* (which lists are loaded, how many records, when they
 *    were refreshed) has no endpoint in this deployment. The rows below are the
 *    demo register, badged DEMO, marked not-connected, with zero counts — a
 *    placeholder that says it is a placeholder, because an officer must never
 *    read "no lists" as "no matches".
 * 2. *Screening a name* is a real call to `POST /api/aml/screening` and returns
 *    a real result object from the engine's screening adapter. That adapter is
 *    itself a simulation of the NFIU / BCEAO-CENTIF providers, so the result
 *    states its own provenance: it is an engine answer, not a regulator's
 *    clearance, and a match still has to be worked as an alert.
 */

import Link from 'next/link';
import React, { useState } from 'react';
import { AlertOctagon, CheckCircle2, Globe, PlayCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { runScreening } from '@/services/compliance/mutations';
import { formatDate, humanizeEnum } from '@/services/compliance/format';
import type { WatchlistRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, Field, KeyList, PageHead, Panel, Provenance, SelectInput, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { InlineNotice, LoadingBlock, ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, makeTableLabels } from '@/components/compliance/ui';

interface ScreeningResult {
  query?: string;
  isPep?: boolean;
  pepCategory?: string;
  isSanctionMatch?: boolean;
  sanctionProgram?: string;
  matchScore?: number;
  provider?: string;
  screenedAt?: string;
}

export default function WatchlistsPage() {
  const { t, locale, demoEnabled } = useCompliancePortal();
  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('watchlists');
  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState<'NG' | 'NE'>('NG');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScreeningResult | null>(null);

  const screen = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError(t('compliance.watchlists.nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    const out = await runScreening({ name: trimmed, jurisdiction });
    setBusy(false);
    if (!out.ok) {
      setError([out.error?.message, out.error?.hint].filter(Boolean).join(' '));
      return;
    }
    setResult((out.value ?? null) as ScreeningResult);
  };

  const matched = Boolean(result?.isSanctionMatch || result?.isPep);

  return (
    <>
      <PageHead
        title={t('compliance.watchlists.title')}
        description={t('compliance.watchlists.subtitle')}
        resource={resource}
        actions={
          <>
            <Link href="/compliance/sanctions" className="cmp-btn">
              {t('compliance.nav.sanctions')}
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={reload} pending={isLoading || isRefreshing}>
              {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
          </>
        }
      />

      <InlineNotice tone={demoEnabled ? 'warning' : 'neutral'} icon={<Globe className="h-4 w-4" aria-hidden="true" />}>
        {t('compliance.watchlists.registerNotice')}
      </InlineNotice>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ResourceState
          resource={resource}
          isLoading={isLoading}
          loadingLabel={t('compliance.watchlists.loading')}
          emptyTitle={t('compliance.watchlists.empty')}
          emptyBody={t('compliance.watchlists.emptyBody')}
          retryLabel={t('compliance.states.retry')}
          onRetry={reload}
          unavailableTitle={t('compliance.watchlists.unavailableTitle')}
          unavailableBody={t('compliance.watchlists.unavailableBody')}
        >
          {isLoading ? (
            <LoadingBlock label={t('compliance.watchlists.loading')} variant="table" rows={4} />
          ) : (
            <ComplianceTable
              rows={resource.data}
              columns={[
                {
                  key: 'name',
                  header: t('compliance.watchlists.col.list'),
                  primary: true,
                  mobileLabel: t('compliance.watchlists.col.list'),
                  sortValue: (row: WatchlistRow) => row.name,
                  render: (row: WatchlistRow) => (
                    <div className="min-w-0">
                      <div className="cmp-cell-strong truncate">{row.name}</div>
                      <div className="cmp-ref truncate">{row.authority}</div>
                    </div>
                  ),
                },
                {
                  key: 'kind',
                  header: t('compliance.watchlists.col.kind'),
                  mobileLabel: t('compliance.watchlists.col.kind'),
                  hideBelow: 'md',
                  sortValue: (row: WatchlistRow) => row.kind,
                  render: (row: WatchlistRow) => <Chip tone="neutral">{humanizeEnum(row.kind)}</Chip>,
                },
                {
                  key: 'records',
                  header: t('compliance.watchlists.col.records'),
                  align: 'end',
                  mobileLabel: t('compliance.watchlists.col.records'),
                  sortValue: (row: WatchlistRow) => row.recordCount,
                  render: (row: WatchlistRow) =>
                    row.recordCount > 0 ? (
                      <span className="tabular">{row.recordCount.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}</span>
                    ) : (
                      <span className="text-[12px] text-[var(--text-disabled)]">{t('compliance.watchlists.noRecords')}</span>
                    ),
                },
                {
                  key: 'refresh',
                  header: t('compliance.watchlists.col.refresh'),
                  hideBelow: 'lg',
                  sortValue: (row: WatchlistRow) => row.lastRefreshedAt ?? '',
                  render: (row: WatchlistRow) => (
                    <span className="text-[12px] text-[var(--foreground-muted)]">
                      {row.lastRefreshedAt ? formatDate(row.lastRefreshedAt, 'short', { locale }) : t('compliance.watchlists.neverRefreshed')}
                      {row.refreshFrequency ? ` · ${row.refreshFrequency}` : ''}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: t('compliance.common.status'),
                  mobileLabel: t('compliance.common.status'),
                  sortValue: (row: WatchlistRow) => row.status,
                  render: (row: WatchlistRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} severity={row.status !== 'CONNECTED'} />,
                },
              ]}
              getRowId={(row: WatchlistRow) => row.id}
              labels={makeTableLabels(t, t('compliance.watchlists.title'))}
              pageSize={10}
              footnote={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Provenance resource={resource} detail={t('compliance.watchlists.provenanceDetail')} />
                  <span className="text-[11.5px] text-[var(--foreground-muted)]">{t('compliance.watchlists.readOnlyNote')}</span>
                </div>
              }
            />
          )}
        </ResourceState>

        <div className="space-y-4">
          <Panel
            title={t('compliance.watchlists.screenTitle')}
            subtitle={t('compliance.watchlists.screenSubtitle')}
            footnote={<Provenance resource={resource} detail={t('compliance.watchlists.screenProvenance')} />}
          >
            <div className="space-y-3">
              <Field label={t('compliance.watchlists.f.name')} htmlFor="screen-name" hint={t('compliance.watchlists.f.nameHint')}>
                <input
                  id="screen-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ibrahim Bello"
                  className="h-[38px] w-full rounded-[var(--cmp-radius-sm)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-disabled)]"
                />
              </Field>
              <Field label={t('compliance.watchlists.f.jurisdiction')} htmlFor="screen-jur">
                <SelectInput id="screen-jur" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value as 'NG' | 'NE')}>
                  <option value="NG">Nigeria (NG)</option>
                  <option value="NE">Niger (NE)</option>
                </SelectInput>
              </Field>
              <Button variant="primary" className="w-full justify-center" onClick={screen} pending={busy} icon={<PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />}>
                {t('compliance.watchlists.screen')}
              </Button>
              {error ? (
                <p role="alert" className="text-[12px] font-semibold" style={{ color: 'var(--sev-critical)' }}>
                  {error}
                </p>
              ) : null}
            </div>
          </Panel>

          {result ? (
            <Panel
              title={t('compliance.watchlists.resultTitle')}
              actions={<Chip tone={matched ? 'critical' : 'clear'} icon={matched ? <AlertOctagon className="h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}>{matched ? t('compliance.watchlists.hit') : t('compliance.watchlists.noHit')}</Chip>}
            >
              <div className="space-y-3">
                <KeyList
                  items={[
                    { term: t('compliance.watchlists.r.query'), value: result.query ?? name },
                    { term: t('compliance.watchlists.r.sanction'), value: result.isSanctionMatch ? <StatusChip status="MATCH" label={`${t('compliance.watchlists.match')} · ${result.sanctionProgram ?? ''}`} severity /> : <Chip tone="clear">{t('compliance.watchlists.none')}</Chip> },
                    { term: t('compliance.watchlists.r.pep'), value: result.isPep ? <StatusChip status="PEP" label={`${t('compliance.watchlists.match')} · ${result.pepCategory ? humanizeEnum(result.pepCategory) : ''}`} severity /> : <Chip tone="neutral">{t('compliance.watchlists.none')}</Chip> },
                    { term: t('compliance.watchlists.r.score'), value: typeof result.matchScore === 'number' ? <span className="tabular">{result.matchScore}%</span> : t('compliance.shell.notReported') },
                    { term: t('compliance.watchlists.r.adapter'), value: result.provider ? <span className="cmp-ref">{result.provider}</span> : t('compliance.shell.notReported') },
                    { term: t('compliance.watchlists.r.at'), value: result.screenedAt ? formatDate(result.screenedAt, 'full', { locale }) : t('compliance.shell.notReported') },
                  ]}
                />
                <InlineNotice tone={matched ? 'warning' : 'neutral'}>{t('compliance.watchlists.resultFootnote')}</InlineNotice>
                {matched ? (
                  <Link href="/compliance/alerts" className="cmp-btn cmp-btn--primary w-full justify-center">
                    {t('compliance.watchlists.toAlerts')}
                  </Link>
                ) : null}
              </div>
            </Panel>
          ) : null}

          <Panel title={t('compliance.watchlists.policyTitle')}>
            <p className="text-[12.5px] leading-[1.55] text-[var(--foreground-muted)]">{t('compliance.watchlists.policyBody')}</p>
          </Panel>
        </div>
      </div>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.watchlists.title'),
            source: '—',
            note: t('compliance.watchlists.sourceNoteRegister'),
            mode: 'demo',
          },
          {
            section: t('compliance.watchlists.screen'),
            source: 'POST /api/aml/screening { name, jurisdiction } → AmlScreeningProvider.screenEntity()',
            note: t('compliance.watchlists.sourceNoteScreen'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}
