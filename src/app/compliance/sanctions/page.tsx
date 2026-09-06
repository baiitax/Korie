'use client';

/**
 * Sanctions screening desk — run a real screening, keep no standing register.
 *
 * The previous version listed mock "sanctions alerts" with invented match
 * bases. KoriePay stores no standing list of sanctions matches: a match
 * exists only after a screening produces one. This screen runs the real,
 * audited screening call (the AmlScreeningProvider through the compliance
 * action route) and reports exactly what it returns — including "no match".
 */

import React, { useState } from 'react';
import { RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { useComplianceResource, useComplianceAction } from '@/services/compliance/hooks';
import { runScreening } from '@/services/compliance/mutations';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, PageHead, Panel, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState, InlineNotice } from '@/components/compliance/ui';
import { formatDate } from '@/services/compliance/format';

export default function SanctionsPage() {
  const { t } = useCompliancePortal();
  const resource = useComplianceResource('sanctions');
  const action = useComplianceAction();
  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState<'NG' | 'NE'>('NG');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const screen = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const out = await action.run(() => runScreening({ name: trimmed, jurisdiction }));
    if (out.ok) {
      setResult((out.value ?? null) as Record<string, unknown> | null);
    }
  };

  return (
    <>
      <PageHead
        title={t('compliance.sanctions.title')}
        description={t('compliance.sanctions.subtitle')}
        actions={
          <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={resource.reload} pending={resource.isRefreshing}>
            {resource.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
          </Button>
        }
      />

      <Panel title={t('compliance.sanctions.runTitle')} subtitle={t('compliance.sanctions.runSubtitle')}>
        <form onSubmit={screen} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('compliance.sanctions.namePlaceholder')}
                aria-label={t('compliance.sanctions.namePlaceholder')}
                className="cmp-input w-full pl-9"
                required
              />
            </div>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value as 'NG' | 'NE')}
              aria-label={t('compliance.common.jurisdiction')}
              className="cmp-input"
            >
              <option value="NG">NG</option>
              <option value="NE">NE</option>
            </select>
            <Button type="submit" variant="primary" icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />} pending={action.showPending}>
              {action.showPending ? t('compliance.actions.saving') : t('compliance.actions.screen')}
            </Button>
          </div>
        </form>

        {action.result?.error ? <InlineNotice tone="danger">{action.result.error.message}</InlineNotice> : null}

        {result ? (
          <div className="mt-4 space-y-2 rounded-[var(--cmp-radius)] border border-[var(--border)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip
                status={String((result as { overallRiskLevel?: string }).overallRiskLevel ?? (result as { riskLevel?: string }).riskLevel ?? 'UNKNOWN')}
                label={t('compliance.sanctions.resultLevel', {
                  level: String((result as { overallRiskLevel?: string }).overallRiskLevel ?? (result as { riskLevel?: string }).riskLevel ?? 'unknown'),
                })}
                severity={Boolean((result as { isMatch?: boolean }).isMatch ?? (result as { matched?: boolean }).matched)}
              />
              <Chip tone="neutral">{formatDate(new Date().toISOString())}</Chip>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-[var(--cmp-radius-sm)] bg-[var(--surface-muted)] p-2.5 text-[11.5px] leading-relaxed text-[var(--foreground)]">
              {JSON.stringify(result, null, 2)}
            </pre>
            <p className="text-[11px] text-[var(--foreground-muted)]">{t('compliance.sanctions.resultNote')}</p>
          </div>
        ) : null}
      </Panel>

      <ResourceState
        resource={resource.resource}
        isLoading={resource.isLoading}
        loadingLabel={t('compliance.sanctions.loading')}
        emptyTitle={t('compliance.sanctions.empty')}
        emptyBody={t('compliance.sanctions.emptyBody')}
        unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
        unauthorizedBody={t('compliance.sanctions.unauthorized')}
        unavailableTitle={t('compliance.states.unavailableTitle')}
        unavailableBody={t('compliance.sanctions.unavailable')}
        retryLabel={t('compliance.states.retry')}
        onRetry={resource.reload}
      >
        <div />
      </ResourceState>

      <SourceNotes
        title={t('compliance.sanctions.sourcesTitle')}
        rows={[
          {
            section: t('compliance.sanctions.sourcesRun'),
            source: 'POST /api/compliance/actions/screening',
            note: t('compliance.sanctions.sourcesRunNote'),
            mode: 'live',
          },
          {
            section: t('compliance.sanctions.sourcesRegister'),
            source: '—',
            note: t('compliance.sanctions.sourcesRegisterNote'),
            mode: 'none',
          },
        ]}
      />
    </>
  );
}
