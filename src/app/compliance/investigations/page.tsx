'use client';

/**
 * Investigations — the case board plus the relationship graph.
 *
 * The board is the live AML case queue filtered to what still needs work. The
 * graph is a real read: `GET /api/aml/network?entityId=…` returns the nodes and
 * edges `AmlNetworkGraphEngine` has derived from transactions, devices and
 * agent relationships, with per-edge transaction counts and volumes.
 *
 * One thing to know before trusting the graph: the route falls back to a fixed
 * demo subject when it is called without `entityId`. This screen therefore never
 * calls it "for now" — it asks only for a subject that was picked from the live
 * queues, and says which subject is on screen.
 */

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Network, RefreshCw, Users } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, humanizeEnum } from '@/services/compliance/format';
import type { AlertRow, CaseRow, NetworkEdge, NetworkNode, NetworkRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, KeyList, PageHead, Panel, Provenance, SelectInput, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { EmptyState, InlineNotice, LoadingBlock, ResourceState } from '@/components/compliance/ui';
import { ComplianceTable, makeTableLabels } from '@/components/compliance/ui';

const OPEN_CASE = ['NEW', 'TRIAGE', 'INVESTIGATING', 'PENDING_INFORMATION', 'ESCALATED', 'UNDER_REVIEW'];

export default function InvestigationsPage() {
  const { t, locale } = useCompliancePortal();
  const cases = useComplianceResource('cases');
  const alerts = useComplianceResource('alerts');
  const [subjectId, setSubjectId] = useState('');
  const [picked, setPicked] = useState('');
  const network = useComplianceResource('network', { query: picked ? { entityId: picked } : undefined });

  const openCases = useMemo(
    () => cases.resource.data.filter((row: CaseRow) => row.status !== 'CLOSED'),
    [cases.resource.data],
  );

  /** Subjects worth graphing: anyone with an open alert or an open case. */
  const candidates = useMemo(() => {
    const map = new Map<string, string>();
    alerts.resource.data.forEach((row: AlertRow) => {
      if (row.subjectId) map.set(row.subjectId, `${row.subjectName} · ${row.reference}`);
    });
    cases.resource.data.forEach((row: CaseRow) => {
      if (row.subjectId && !map.has(row.subjectId)) map.set(row.subjectId, `${row.subjectName} · ${row.reference}`);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [alerts.resource.data, cases.resource.data]);

  // Default to the first candidate rather than letting the route pick a subject.
  useEffect(() => {
    if (!picked && candidates.length > 0) setPicked(candidates[0].id);
  }, [candidates, picked]);

  const row: NetworkRow | undefined = network.resource.data[0];
  const selectedLabel = candidates.find((candidate) => candidate.id === picked)?.label ?? picked;

  return (
    <>
      <PageHead
        title={t('compliance.investigations.title')}
        description={t('compliance.investigations.subtitle')}
        resource={cases.resource}
        actions={
          <>
            <Link href="/compliance/cases" className="cmp-btn">
              {t('compliance.nav.cases')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Button
              icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => {
                cases.reload();
                alerts.reload();
                network.reload();
              }}
              pending={cases.isLoading || cases.isRefreshing}
            >
              {cases.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <ResourceState
            resource={cases.resource}
            isLoading={cases.isLoading}
            loadingLabel={t('compliance.investigations.loading')}
            emptyTitle={t('compliance.investigations.empty')}
            emptyBody={t('compliance.investigations.emptyBody')}
            retryLabel={t('compliance.states.retry')}
            onRetry={cases.reload}
            unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
            unauthorizedBody={t('compliance.cases.unauthorized')}
            unavailableTitle={t('compliance.states.unavailableTitle')}
            unavailableBody={t('compliance.investigations.unavailable')}
          >
            <ComplianceTable
              rows={openCases}
              columns={[
                {
                  key: 'case',
                  header: t('compliance.cases.col.reference'),
                  primary: true,
                  mobileLabel: t('compliance.cases.col.reference'),
                  sortValue: (row: CaseRow) => row.reference,
                  render: (row: CaseRow) => (
                    <div className="min-w-0">
                      <div className="cmp-cell-strong truncate">{row.title || row.subjectName}</div>
                      <div className="cmp-ref truncate">
                        {row.reference} · {row.subjectName}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'priority',
                  header: t('compliance.cases.col.priority'),
                  mobileLabel: t('compliance.cases.col.priority'),
                  sortValue: (row: CaseRow) => row.priority,
                  render: (row: CaseRow) => <StatusChip status={row.priority} label={humanizeEnum(row.priority)} severity={row.priority === 'URGENT' || row.priority === 'CRITICAL'} />,
                },
                {
                  key: 'status',
                  header: t('compliance.common.status'),
                  mobileLabel: t('compliance.common.status'),
                  sortValue: (row: CaseRow) => row.status,
                  render: (row: CaseRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} />,
                },
                {
                  key: 'work',
                  header: t('compliance.investigations.col.work'),
                  hideBelow: 'md',
                  sortValue: (row: CaseRow) => row.alertCount + row.noteCount,
                  render: (row: CaseRow) => (
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                      <Chip tone={row.alertCount > 1 ? 'medium' : 'neutral'}>{t('compliance.investigations.alerts', { count: row.alertCount })}</Chip>
                      <Chip tone="neutral">{t('compliance.investigations.notes', { count: row.noteCount })}</Chip>
                    </span>
                  ),
                },
                {
                  key: 'investigator',
                  header: t('compliance.cases.col.investigator'),
                  hideBelow: 'lg',
                  sortValue: (row: CaseRow) => row.leadInvestigator,
                  render: (row: CaseRow) => <span className="text-[12px] text-[var(--foreground-muted)]">{row.leadInvestigator || t('compliance.shell.notReported')}</span>,
                },
              ]}
              getRowId={(row: CaseRow) => row.id}
              getRowHref={(row: CaseRow) => `/compliance/cases/${encodeURIComponent(row.id)}`}
              getRowTone={(row: CaseRow) => (OPEN_CASE.includes(row.status) && row.slaBreached ? 'critical' : undefined)}
              labels={makeTableLabels(t, t('compliance.investigations.title'))}
              pageSize={10}
              footnote={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Provenance resource={cases.resource} detail={t('compliance.investigations.boardProvenance')} />
                  <span className="text-[11.5px] tabular text-[var(--foreground-muted)]">
                    {t('compliance.investigations.openCount', { count: openCases.length, total: cases.resource.data.length })}
                  </span>
                </div>
              }
            />
          </ResourceState>
        </div>

        <div className="space-y-4">
          <Panel
            title={t('compliance.investigations.graphTitle')}
            subtitle={selectedLabel ? t('compliance.investigations.graphSubject', { subject: selectedLabel }) : undefined}
            actions={
              <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={network.reload} pending={network.isLoading || network.isRefreshing}>
                {network.isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
              </Button>
            }
            footnote={<Provenance resource={network.resource} detail={t('compliance.investigations.graphProvenance')} />}
          >
            {candidates.length === 0 ? (
              <EmptyState title={t('compliance.investigations.noSubjects')} body={t('compliance.investigations.noSubjectsBody')} />
            ) : (
              <div className="space-y-3">
                <KeyList items={[]} />
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                    {t('compliance.investigations.subject')}
                  </span>
                  <SelectInput value={picked} onChange={(e) => setPicked(e.target.value)}>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.label}
                      </option>
                    ))}
                  </SelectInput>
                </label>

                {network.isLoading ? (
                  <LoadingBlock label={t('compliance.investigations.graphLoading')} variant="detail" rows={3} />
                ) : !row ? (
                  <EmptyState title={t('compliance.investigations.graphEmpty')} body={t('compliance.investigations.graphEmptyBody')} />
                ) : (
                  <>
                    <NetworkGraph row={row} locale={locale} />
                    <div className="flex flex-wrap gap-1.5">
                      {groupKinds(row.nodes).map(([kind, count]) => (
                        <Chip key={kind} tone="neutral" icon={<Users className="h-3 w-3" aria-hidden="true" />}>
                          {humanizeEnum(kind)} <span className="tabular">×{count}</span>
                        </Chip>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/compliance/customers/${encodeURIComponent(picked)}`} className="cmp-btn cmp-btn--ghost px-2">
                        {t('compliance.alertDetail.openCustomerFile')}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      <Link href="/compliance/aml" className="cmp-btn cmp-btn--ghost px-2">
                        {t('compliance.investigations.checkRules')}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </Panel>

          {row ? (
            <Panel title={t('compliance.investigations.edgesTitle')} footnote={<Provenance resource={network.resource} />}>
              <ul className="divide-y divide-[var(--border)]">
                {row.edges.map((edge: NetworkEdge) => (
                  <li key={edge.id} className="py-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                      <Chip tone={edge.relation === 'SHARED_DEVICE' ? 'high' : 'medium'} icon={<Network className="h-3 w-3" aria-hidden="true" />}>
                        {humanizeEnum(edge.relation)}
                      </Chip>
                      <span className="min-w-0 truncate font-semibold text-[var(--foreground)]">{labelFor(row, edge.from)}</span>
                      <span aria-hidden="true">→</span>
                      <span className="min-w-0 truncate font-semibold text-[var(--foreground)]">{labelFor(row, edge.to)}</span>
                    </div>
                    <div className="cmp-ref mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{t('compliance.investigations.txCount', { count: edge.transactionCount ?? 0 })}</span>
                      {typeof edge.totalVolume === 'number' ? (
                        <span className="tabular">{formatMoney(edge.totalVolume, edge.currency ?? 'NGN', { locale })}</span>
                      ) : null}
                      {edge.lastSeenAt ? <span>{formatDate(edge.lastSeenAt, 'short', { locale })}</span> : null}
                      {typeof edge.weight === 'number' ? <span>w {edge.weight}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
              <InlineNotice tone="neutral">{t('compliance.investigations.graphCaveat')}</InlineNotice>
            </Panel>
          ) : null}
        </div>
      </div>

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.investigations.title'),
            source: 'GET /api/aml/cases → AmlCaseManagementEngine.getCases()',
            note: t('compliance.investigations.sourceNoteBoard'),
            mode: cases.resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.investigations.graphTitle'),
            source: 'GET /api/aml/network?entityId → AmlNetworkGraphEngine.getNetworkForEntity()',
            note: t('compliance.investigations.sourceNoteGraph'),
            mode: network.resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.investigations.subject'),
            source: 'GET /api/aml/alerts + /api/aml/cases (subject ids to graph)',
            note: t('compliance.investigations.sourceNoteSubjects'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}

function labelFor(row: NetworkRow, entityId: string): string {
  return row.nodes.find((node) => node.entityId === entityId || node.id === entityId)?.label ?? entityId;
}

function groupKinds(nodes: NetworkNode[]): [string, number][] {
  const map = new Map<string, number>();
  nodes.forEach((node) => map.set(node.kind, (map.get(node.kind) ?? 0) + 1));
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

/**
 * A radial layout of the returned graph. Node positions are computed from the
 * node list so the picture cannot drift from the data, and every node keeps its
 * label and score in the list below the drawing — the shape is a reading aid,
 * not the evidence.
 */
const NetworkGraph: React.FC<{ row: NetworkRow; locale: string }> = ({ row }) => {
  const width = 340;
  const height = 240;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 92;
  const center = row.nodes[0];
  const ring = row.nodes.slice(1);
  const position = new Map<string, { x: number; y: number }>();
  ring.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(ring.length, 1) - Math.PI / 2;
    position.set(node.entityId, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  });
  if (center) position.set(center.entityId, { x: cx, y: cy });

  const toneFor = (node: NetworkNode) =>
    (node.riskScore ?? 0) >= 70 ? 'var(--sev-critical)' : (node.riskScore ?? 0) >= 45 ? 'var(--sev-high)' : 'var(--sev-clear)';

  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-sunken)]">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full" role="img" aria-label={row.nodes.map((node) => `${node.label}: ${node.kind}`).join(', ')}>
        {row.edges.map((edge) => {
          const from = position.get(edge.from);
          const to = position.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--border-strong)"
              strokeWidth={edge.relation === 'SHARED_DEVICE' ? 2 : 1.25}
              strokeDasharray={edge.relation === 'AGENT_SERVICED' ? '4 3' : undefined}
            />
          );
        })}
        {row.nodes.map((node) => {
          const at = position.get(node.entityId);
          if (!at) return null;
          return (
            <g key={node.id}>
              <circle cx={at.x} cy={at.y} r={node.id === center?.id ? 15 : 11} fill="var(--surface-raised)" stroke={toneFor(node)} strokeWidth={2} />
              <text x={at.x} y={at.y + (node.id === center?.id ? 4 : 3)} textAnchor="middle" className="fill-[var(--foreground)] text-[9px] font-bold">
                {node.kind.slice(0, 2)}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
        {row.nodes.map((node) => (
          <li key={node.id} className="flex items-center gap-2 px-2.5 py-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: toneFor(node) }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--foreground)]">{node.label}</span>
            <span className="tabular text-[11px] text-[var(--foreground-muted)]">
              {humanizeEnum(node.kind)}
              {typeof node.riskScore === 'number' ? ` · ${node.riskScore}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
