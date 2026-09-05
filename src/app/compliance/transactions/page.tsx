'use client';

/**
 * Transaction monitoring — the risk engine's decision feed.
 *
 * This screen reads `GET /api/core/v1/risk/decisions`. The engine returns the
 * decision, the signals that produced it, the policy and model versions, and
 * how long the evaluation took. It does not return a customer name: the subject
 * is an id, and the row is labelled that way rather than guessed at, because a
 * mislabelled subject in a monitoring queue is worse than an unlabelled one.
 *
 * A decision only exists after something is evaluated. "Run an evaluation" is a
 * real call to `POST /api/core/v1/risk/evaluate`; the record it produces appears
 * in this feed because the feed is the engine's own log. Amounts are entered in
 * minor units (kobo/centims) exactly as the engine stores them — the portal does
 * not rescale money on the way in.
 */

import Link from 'next/link';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Activity, Gauge, PlayCircle, RefreshCw, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { runRiskEvaluation } from '@/services/compliance/mutations';
import { formatDate, formatMoney, humanizeEnum } from '@/services/compliance/format';
import type { MonitoringRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Button,
  Chip,
  Field,
  KeyList,
  Modal,
  PageHead,
  Panel,
  Provenance,
  SourceNotes,
  StatusChip,
  TextInput,
} from '@/components/compliance/ui';
import { EmptyState, InlineNotice, LoadingBlock, ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, TableToolbar, makeTableLabels } from '@/components/compliance/ui';
import { Drawer } from '@/components/compliance/ui';

/**
 * `useSearchParams` is a client-only read, so the page is exported behind a
 * Suspense boundary: without it Next renders the route shell empty on the
 * server and the first paint is a blank panel. The fallback below is the same
 * skeleton the resource states use, so the transition is invisible.
 */
export default function TransactionMonitoringPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading the decision feed" variant="table" rows={6} />}>
      <DecisionFeed />
    </Suspense>
  );
}

function DecisionFeed() {
  const { t, locale, session } = useCompliancePortal();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams?.get('term') ?? '');
  const [heldOnly, setHeldOnly] = useState(false);
  const [open, setOpen] = useState<MonitoringRow | null>(null);
  const [evaluate, setEvaluate] = useState(false);

  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('telemetry');

  useEffect(() => {
    const next = searchParams?.get('term');
    if (next) setTerm(next);
  }, [searchParams]);

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return resource.data.filter((row) => {
      if (heldOnly && !row.held) return false;
      if (!needle) return true;
      return `${row.reference} ${row.subjectId ?? ''} ${row.subjectName ?? ''} ${row.decision}`.toLowerCase().includes(needle);
    });
  }, [resource.data, term, heldOnly]);

  const filtersActive = term.trim().length > 0 || heldOnly;
  const heldCount = resource.data.filter((row) => row.held).length;

  return (
    <>
      <PageHead
        title={t('compliance.transactions.title')}
        description={t('compliance.transactions.subtitle')}
        resource={resource}
        actions={
          <>
            <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={reload} pending={isLoading || isRefreshing}>
              {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
            <Button variant="primary" icon={<PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setEvaluate(true)}>
              {t('compliance.transactions.run')}
            </Button>
          </>
        }
      />

      {resource.data.length > 0 && heldCount > 0 ? (
        <InlineNotice tone="warning" icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}>
          {t('compliance.transactions.heldNotice', { count: heldCount })}
          {resource.demoFallback ? ` ${t('compliance.states.demoFallback')}` : ''}
        </InlineNotice>
      ) : null}

      <ResourceState
        resource={resource}
        isLoading={isLoading}
        loadingLabel={t('compliance.transactions.loading')}
        emptyTitle={t('compliance.transactions.empty')}
        emptyBody={t('compliance.transactions.emptyBody')}
        retryLabel={t('compliance.states.retry')}
        onRetry={reload}
        emptyAction={
          <Button variant="primary" icon={<PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setEvaluate(true)}>
            {t('compliance.transactions.run')}
          </Button>
        }
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.transactions.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.transactions.unavailable')}
      >
        <ComplianceTable
          rows={rows}
          columns={[
            {
              key: 'reference',
              header: t('compliance.transactions.col.reference'),
              primary: true,
              mobileLabel: t('compliance.transactions.col.reference'),
              sortValue: (row: MonitoringRow) => row.reference,
              render: (row: MonitoringRow) => (
                <div className="min-w-0">
                  <div className="cmp-cell-strong truncate">{row.reference}</div>
                  <div className="cmp-ref truncate">{row.subjectId ? `subject ${row.subjectId}` : 'subject not reported'}</div>
                </div>
              ),
            },
            {
              key: 'decision',
              header: t('compliance.transactions.col.decision'),
              mobileLabel: t('compliance.transactions.col.decision'),
              sortValue: (row: MonitoringRow) => row.decision,
              render: (row: MonitoringRow) => (
                <span className="flex flex-wrap items-center gap-1.5">
                  <StatusChip status={row.decision} label={humanizeEnum(row.decision)} severity={row.held} />
                  {row.held ? <Chip tone="high">{t('compliance.transactions.onHold')}</Chip> : null}
                </span>
              ),
            },
            {
              key: 'score',
              header: t('compliance.transactions.col.score'),
              align: 'end',
              mobileLabel: t('compliance.transactions.col.score'),
              sortValue: (row: MonitoringRow) => row.riskScore ?? -1,
              render: (row: MonitoringRow) => (
                <div className="flex flex-col items-end">
                  <span className="tabular text-[13px] font-bold text-[var(--foreground)]">
                    {typeof row.riskScore === 'number' ? row.riskScore : t('compliance.shell.notReported')}
                  </span>
                  {row.riskBand ? <span className="text-[11px] text-[var(--foreground-muted)]">{humanizeEnum(row.riskBand)}</span> : null}
                </div>
              ),
            },
            {
              key: 'amount',
              header: t('compliance.transactions.col.amount'),
              align: 'end',
              hideBelow: 'md',
              sortValue: (row: MonitoringRow) => row.amount ?? -1,
              render: (row: MonitoringRow) =>
                typeof row.amount === 'number' ? (
                  <span className="tabular">{formatMoney(row.amount, row.currency ?? 'NGN', { locale })}</span>
                ) : (
                  <span className="text-[12px] text-[var(--text-disabled)]">{t('compliance.shell.notReported')}</span>
                ),
            },
            {
              key: 'signals',
              header: t('compliance.transactions.col.signals'),
              hideBelow: 'lg',
              sortValue: (row: MonitoringRow) => row.signals.length,
              render: (row: MonitoringRow) =>
                row.signals.length ? (
                  <span className="tabular text-[12px]">{row.signals.length}</span>
                ) : (
                  <span className="text-[12px] text-[var(--text-disabled)]">0</span>
                ),
            },
            {
              key: 'evaluated',
              header: t('compliance.transactions.col.evaluated'),
              hideBelow: 'md',
              sortValue: (row: MonitoringRow) => row.createdAt,
              render: (row: MonitoringRow) => <span className="text-[12px] text-[var(--foreground-muted)]">{formatDate(row.createdAt, 'short', { locale })}</span>,
            },
            {
              key: 'act',
              header: '',
              render: (row: MonitoringRow) => (
                <button type="button" className="cmp-btn cmp-btn--ghost px-2" onClick={() => setOpen(row)}>
                  {t('compliance.transactions.open')}
                </button>
              ),
            },
          ]}
          getRowId={(row: MonitoringRow) => row.id}
          labels={makeTableLabels(t, t('compliance.transactions.title'))}
          pageSize={12}
          initialSort={{ key: 'evaluated', dir: 'desc' }}
          footnote={<Provenance resource={resource} detail={t('compliance.transactions.provenanceDetail')} />}
          toolbar={
            <TableToolbar
              searchValue={term}
              onSearch={setTerm}
              searchLabel={t('compliance.transactions.searchLabel')}
              searchPlaceholder={t('compliance.transactions.searchPlaceholder')}
              onClear={
                filtersActive
                  ? () => {
                      setTerm('');
                      setHeldOnly(false);
                    }
                  : undefined
              }
              clearLabel={t('compliance.states.clearFilters')}
              resultCount={rows.length}
              resultLabel={(count) => t('compliance.transactions.resultCount', { count })}
            >
              <button type="button" className="cmp-btn" aria-pressed={heldOnly} onClick={() => setHeldOnly((v) => !v)}>
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                {t('compliance.transactions.heldOnly')}
              </button>
              <Link href="/compliance/risk" className="cmp-btn">
                {t('compliance.nav.riskFraud')}
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </TableToolbar>
          }
        />
      </ResourceState>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? t('compliance.transactions.drawerTitle', { reference: open.reference }) : ''}
        subtitle={open ? formatDate(open.createdAt, 'full', { locale }) : undefined}
        eyebrow={open ? <StatusChip status={open.decision} label={humanizeEnum(open.decision)} severity={open.held} /> : undefined}
        closeLabel={t('compliance.shell.close')}
        actions={
          open ? (
            <Link href="/compliance/alerts" className="cmp-btn">
              {t('compliance.transactions.toAlerts')}
            </Link>
          ) : null
        }
      >
        {open ? (
          <div className="space-y-4">
            <Panel title={t('compliance.transactions.outcome')}>
              <KeyList
                items={[
                  { term: t('compliance.transactions.col.decision'), value: <StatusChip status={open.decision} label={humanizeEnum(open.decision)} severity={open.held} /> },
                  { term: t('compliance.transactions.col.score'), value: typeof open.riskScore === 'number' ? String(open.riskScore) : t('compliance.shell.notReported') },
                  { term: t('compliance.transactions.band'), value: open.riskBand ? humanizeEnum(open.riskBand) : t('compliance.shell.notReported') },
                  { term: t('compliance.transactions.subject'), value: <span className="cmp-ref">{open.subjectId ?? t('compliance.shell.notReported')}</span> },
                  { term: t('compliance.transactions.latency'), value: typeof open.evaluationLatencyMs === 'number' ? `${open.evaluationLatencyMs} ms` : t('compliance.shell.notReported') },
                  { term: t('compliance.transactions.policy'), value: open.policyVersion ?? t('compliance.shell.notReported') },
                  { term: t('compliance.transactions.model'), value: open.modelVersion ?? t('compliance.shell.notReported') },
                ]}
              />
            </Panel>

            <Panel title={t('compliance.transactions.reason')}>
              <p className="text-[13px] leading-[1.55] text-[var(--foreground)]">{open.reason ?? t('compliance.transactions.noReason')}</p>
            </Panel>

            <Panel title={t('compliance.transactions.signals')}>
              {open.signals.length ? (
                <ul className="space-y-2">
                  {open.signals.map((signal) => (
                    <li key={signal.code} className="flex flex-wrap items-start gap-2 rounded-[10px] border border-[var(--border)] p-2.5">
                      <Chip tone="medium" icon={<Activity className="h-3 w-3" aria-hidden="true" />}>
                        {humanizeEnum(signal.code)}
                      </Chip>
                      <span className="min-w-0 flex-1 text-[12.5px] text-[var(--foreground)]">{signal.description ?? t('compliance.transactions.noSignalNote')}</span>
                      {typeof signal.weight === 'number' ? <span className="tabular text-[11.5px] text-[var(--foreground-muted)]">w {signal.weight}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title={t('compliance.transactions.noSignals')} />
              )}
            </Panel>

            {open.subjectId ? (
              <Link href={`/compliance/customers/${encodeURIComponent(open.subjectId)}`} className="cmp-btn cmp-btn--primary w-full justify-center">
                {t('compliance.transactions.openCustomerFile')}
              </Link>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <EvaluateModal
        open={evaluate}
        onClose={() => setEvaluate(false)}
        officer={session?.displayName ?? session?.email ?? ''}
        onDone={() => {
          setEvaluate(false);
          reload();
        }}
      />

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.transactions.title'),
            source: 'GET /api/core/v1/risk/decisions → RiskEngine.decisionLog()',
            note: t('compliance.transactions.sourceNoteFeed'),
            mode: resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.transactions.run'),
            source: 'POST /api/core/v1/risk/evaluate → RiskEngine.evaluate()',
            note: t('compliance.transactions.sourceNoteRun'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}

const EvaluateModal: React.FC<{ open: boolean; onClose: () => void; officer: string; onDone: () => void }> = ({ open, onClose, officer, onDone }) => {
  const { t } = useCompliancePortal();
  const [reference, setReference] = useState('');
  const [entityId, setEntityId] = useState('');
  const [amountMinor, setAmountMinor] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [countryCode, setCountryCode] = useState<'NG' | 'NE'>('NG');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const minor = Number(amountMinor);
  const valid = reference.trim().length > 0 && entityId.trim().length > 0 && Number.isFinite(minor) && minor > 0;

  const submit = async () => {
    if (!valid) {
      setError(t('compliance.transactions.invalid'));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await runRiskEvaluation({
      transactionReference: reference.trim(),
      entityId: entityId.trim(),
      amountMinor: Math.trunc(minor),
      currency,
      countryCode,
      transactionType: 'TRANSFER',
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error?.message ?? t('compliance.actions.failedOutcome'));
      return;
    }
    const row = result.value as MonitoringRow | undefined;
    setOutcome(row ? `${row.decision}${typeof row.riskScore === 'number' ? ` · score ${row.riskScore}` : ''}` : t('compliance.transactions.evaluated'));
    onDone();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('compliance.transactions.run')}
      description={t('compliance.transactions.runBody')}
      closeLabel={t('compliance.shell.close')}
      footer={
        <>
          <Button onClick={onClose}>{t('compliance.actions.cancel')}</Button>
          <Button variant="primary" onClick={submit} pending={busy}>
            {t('compliance.transactions.run')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('compliance.transactions.f.reference')} htmlFor="eval-ref" required hint={t('compliance.transactions.f.referenceHint')}>
            <TextInput id="eval-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN-2026-000123" invalid={!reference.trim()} />
          </Field>
          <Field label={t('compliance.transactions.f.entity')} htmlFor="eval-entity" required hint={t('compliance.transactions.f.entityHint')}>
            <TextInput id="eval-entity" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="pers_ng_001" invalid={!entityId.trim()} />
          </Field>
          <Field label={t('compliance.transactions.f.amount')} htmlFor="eval-amount" required hint={t('compliance.transactions.f.amountHint')}>
            <TextInput id="eval-amount" type="number" min={1} step={1} value={amountMinor} onChange={(e) => setAmountMinor(e.target.value)} placeholder="475000000" invalid={!Number.isFinite(minor) || minor <= 0} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('compliance.transactions.f.currency')} htmlFor="eval-ccy">
              <select id="eval-ccy" className="cmp-btn w-full justify-start bg-[var(--input-bg)] font-normal" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="NGN">NGN</option>
                <option value="XOF">XOF</option>
              </select>
            </Field>
            <Field label={t('compliance.transactions.f.country')} htmlFor="eval-country">
              <select id="eval-country" className="cmp-btn w-full justify-start bg-[var(--input-bg)] font-normal" value={countryCode} onChange={(e) => setCountryCode(e.target.value as 'NG' | 'NE')}>
                <option value="NG">NG</option>
                <option value="NE">NE</option>
              </select>
            </Field>
          </div>
        </div>

        <InlineNotice tone="neutral">{t('compliance.transactions.runFootnote', { officer: officer || t('compliance.shell.notReported') })}</InlineNotice>

        {error ? (
          <p role="alert" className="text-[12px] font-semibold" style={{ color: 'var(--sev-critical)' }}>
            {error}
          </p>
        ) : null}
        {outcome ? (
          <p role="status" className="text-[12px] font-semibold" style={{ color: 'var(--sev-clear)' }}>
            {outcome}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
