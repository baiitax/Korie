'use client';

/**
 * Case file — live from the AML case tables.
 *
 * Replaces the mock-store version of this workspace. The case record comes
 * from aml_cases via the compliance data plane; investigation notes are read
 * from and written to aml_case_notes through the audited case-note action;
 * the formal ruling is an audited PATCH of the case (final decision, notes,
 * decided_at stamped by the server). The previous "evidence vault" tab wrote
 * mock exhibits with fake vault URLs — there is no evidence store in this
 * deployment, so that tab is gone and the page says so instead of simulating
 * one.
 */

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileCheck2, Lock, Plus, Send } from 'lucide-react';
import { useComplianceResource, useComplianceAction } from '@/services/compliance/hooks';
import { runLiveAction } from '@/services/compliance/mutations';
import { formatDate, formatMoney, fromMinor, humanizeEnum } from '@/services/compliance/format';
import type { CaseNoteRow, CaseRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import { Button, Chip, KeyList, PageHead, Panel, SourceNotes, StatusChip } from '@/components/compliance/ui';
import { ResourceState, InlineNotice, LoadingBlock } from '@/components/compliance/ui';
import { complianceFetch } from '@/lib/compliancePortalClient';

/* Values the database CHECK constraints actually accept. */
const DECISIONS = [
  'NO_CONCERN',
  'FALSE_POSITIVE',
  'ENHANCED_MONITORING',
  'ACCOUNT_RESTRICTION_EXECUTED',
  'STR_SUBMITTED_TO_REGULATOR',
  'LAW_ENFORCEMENT_ESCALATION',
] as const;

const STATUSES = ['OPEN', 'TRIAGE', 'INVESTIGATION', 'INFORMATION_REQUESTED', 'ESCALATED', 'DECISION_PENDING', 'ACTION_PENDING', 'CLOSED'] as const;

type Tab = 'overview' | 'notes' | 'decision';

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const { t } = useCompliancePortal();
  const detail = useComplianceResource('caseDetail', { id: caseId });
  const notes = useComplianceResource('caseNotes', { query: { case_id: caseId } });
  const action = useComplianceAction();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [newNote, setNewNote] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [decision, setDecision] = useState<string>('NO_FURTHER_ACTION');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('RESOLVED');

  const currentCase = detail.resource.data[0] as CaseRow | undefined;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !currentCase) return;
    const out = await action.run(() =>
      runLiveAction('cases.note', currentCase.id, { content: newNote.trim(), isConfidential }),
    );
    if (out.ok) {
      setNewNote('');
      setIsConfidential(false);
      notes.reload();
    }
  };

  const handleApplyDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionNotes.trim() || !currentCase) return;
    const out = await action.run(async () => {
      const res = await complianceFetch(`/api/compliance/data/aml-cases/${encodeURIComponent(currentCase.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: selectedStatus,
          final_decision: decision,
          decision_notes: decisionNotes.trim(),
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.status === 'error') {
        return {
          ok: false,
          recorded: false,
          source: 'live' as const,
          error: { code: `HTTP_${res.status}`, message: payload?.error?.message ?? 'The ruling was refused.' },
        };
      }
      return { ok: true, recorded: true, source: 'live' as const, value: payload?.record, error: undefined };
    });
    if (out.ok) {
      setDecisionNotes('');
      detail.reload();
    }
  };

  if (detail.isLoading) {
    return <LoadingBlock label={t('compliance.caseDetail.loading')} variant="detail" />;
  }

  if (!currentCase) {
    return (
      <div className="space-y-4 py-16 text-center">
        <h2 className="text-lg font-extrabold text-[var(--foreground)]">{t('compliance.caseDetail.notFound')}</h2>
        <p className="text-[12.5px] text-[var(--foreground-muted)]">
          {detail.resource.error?.message ?? t('compliance.caseDetail.notFoundBody')}
        </p>
        <Link href="/compliance/cases" className="cmp-btn inline-flex">
          {t('compliance.caseDetail.backToRegister')}
        </Link>
      </div>
    );
  }

  const decided = Boolean(currentCase.finalDecision);

  return (
    <>
      <PageHead
        back={{ href: '/compliance/cases', label: t('compliance.caseDetail.backToRegister') }}
        title={currentCase.reference}
        description={currentCase.title}
        resource={detail.resource}
        actions={
          <Button variant="primary" icon={<FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setActiveTab('decision')}>
            {t('compliance.caseDetail.recordRuling')}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={currentCase.status} label={humanizeEnum(currentCase.status)} severity={currentCase.status === 'ESCALATED'} />
        <StatusChip status={currentCase.priority} label={humanizeEnum(currentCase.priority)} severity={currentCase.priority === 'CRITICAL' || currentCase.priority === 'HIGH'} />
        <Chip tone="neutral">{currentCase.jurisdiction}</Chip>
        <Chip tone="neutral">{currentCase.currency}</Chip>
        {currentCase.slaBreached ? <StatusChip status="SLA_BREACHED" label={t('compliance.caseDetail.slaBreached')} severity /> : null}
      </div>

      {action.result?.error ? <InlineNotice tone="danger">{action.result.error.message}</InlineNotice> : null}
      {action.result?.ok ? <InlineNotice tone="info">{t('compliance.actions.liveOutcome')}</InlineNotice> : null}

      <div className="flex flex-wrap gap-1.5" role="tablist">
        {(['overview', 'notes', 'decision'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-[var(--cmp-radius-sm)] border px-3 py-1.5 text-[12.5px] font-bold transition ${
              activeTab === tab
                ? 'border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--foreground)]'
                : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {t(`compliance.caseDetail.tab.${tab}`)}
            {tab === 'notes' && notes.resource.data.length ? ` (${notes.resource.data.length})` : ''}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <Panel title={t('compliance.caseDetail.overviewTitle')}>
          <KeyList
            items={[
              { term: t('compliance.caseDetail.k.reference'), value: currentCase.reference, mono: true },
              { term: t('compliance.common.subject'), value: currentCase.subjectId, mono: true },
              { term: t('compliance.common.jurisdiction'), value: currentCase.jurisdiction },
              { term: t('compliance.common.exposure'), value: formatMoney(fromMinor(currentCase.exposureAmount), currentCase.currency) ?? '—' },
              { term: t('compliance.cases.col.investigator'), value: currentCase.leadInvestigator },
              { term: t('compliance.caseDetail.k.created'), value: formatDate(currentCase.createdAt) },
              { term: t('compliance.caseDetail.k.slaDue'), value: currentCase.slaDueAt ? formatDate(currentCase.slaDueAt) : '—' },
              { term: t('compliance.caseDetail.k.decidedAt'), value: currentCase.decidedAt ? formatDate(currentCase.decidedAt) : '—' },
              ...(decided
                ? [
                    { term: t('compliance.caseDetail.k.finalDecision'), value: humanizeEnum(String(currentCase.finalDecision)) },
                    { term: t('compliance.caseDetail.k.decisionNotes'), value: String(currentCase.decisionNotes ?? '—'), span: true },
                  ]
                : []),
            ]}
          />
        </Panel>
      ) : null}

      {activeTab === 'notes' ? (
        <div className="space-y-4">
          <Panel title={t('compliance.caseDetail.notesTitle')}>
            <ResourceState
              resource={notes.resource}
              isLoading={notes.isLoading}
              loadingLabel={t('compliance.caseDetail.notesLoading')}
              emptyTitle={t('compliance.caseDetail.notesEmpty')}
              emptyBody={t('compliance.caseDetail.notesEmptyBody')}
              unauthorizedTitle={t('compliance.states.unauthorizedTitle')}
              unauthorizedBody={t('compliance.cases.unauthorized')}
              unavailableTitle={t('compliance.states.unavailableTitle')}
              unavailableBody={t('compliance.cases.unavailable')}
              retryLabel={t('compliance.states.retry')}
              onRetry={notes.reload}
            >
              <ol className="divide-y divide-[var(--border)]">
                {notes.resource.data.map((note: CaseNoteRow) => (
                  <li key={note.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="cmp-ref">{note.author}</span>
                      <Chip tone={note.noteType === 'CONFIDENTIAL' ? 'high' : 'neutral'}>{humanizeEnum(note.noteType)}</Chip>
                      <span className="cmp-ref">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--foreground)]">{note.content}</p>
                  </li>
                ))}
              </ol>
            </ResourceState>
          </Panel>

          <Panel title={t('compliance.caseDetail.addNoteTitle')}>
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                placeholder={t('compliance.caseDetail.notePlaceholder')}
                className="cmp-input w-full resize-y"
                aria-label={t('compliance.caseDetail.notePlaceholder')}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[12px] text-[var(--foreground-muted)]">
                  <input type="checkbox" checked={isConfidential} onChange={(e) => setIsConfidential(e.target.checked)} />
                  {t('compliance.caseDetail.confidential')}
                </label>
                <Button type="submit" variant="primary" icon={<Send className="h-3.5 w-3.5" aria-hidden="true" />} pending={action.showPending}>
                  {action.showPending ? t('compliance.actions.saving') : t('compliance.actions.addNote')}
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'decision' ? (
        <Panel title={t('compliance.caseDetail.decisionTitle')} subtitle={t('compliance.caseDetail.decisionSubtitle')}>
          {decided ? (
            <InlineNotice tone="info">
              {t('compliance.caseDetail.alreadyDecided', {
                decision: humanizeEnum(String(currentCase.finalDecision)),
                at: currentCase.decidedAt ? formatDate(currentCase.decidedAt) : '—',
              })}
            </InlineNotice>
          ) : null}
          <form onSubmit={handleApplyDecision} className="mt-3 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="case-final-decision" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  {t('compliance.caseDetail.finalDecision')}
                </label>
                <select id="case-final-decision" value={decision} onChange={(e) => setDecision(e.target.value)} className="cmp-input w-full">
                  {DECISIONS.map((d) => (
                    <option key={d} value={d}>{humanizeEnum(d)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="case-status" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  {t('compliance.common.status')}
                </label>
                <select id="case-status" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="cmp-input w-full">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{humanizeEnum(s)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="case-decision-notes" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                {t('compliance.caseDetail.decisionNotes')}
              </label>
              <textarea
                id="case-decision-notes"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                rows={4}
                required
                placeholder={t('compliance.caseDetail.decisionNotesPlaceholder')}
                className="cmp-input w-full resize-y"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-start gap-1.5 text-[11px] text-[var(--foreground-muted)]">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                {t('compliance.caseDetail.decisionAuditNote')}
              </p>
              <Button type="submit" variant="primary" icon={<FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />} pending={action.showPending}>
                {action.showPending ? t('compliance.actions.saving') : t('compliance.actions.recordDecision')}
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <SourceNotes
        title={t('compliance.caseDetail.sourcesTitle')}
        rows={[
          {
            section: t('compliance.caseDetail.sourcesCase'),
            source: `GET /api/compliance/data/aml-cases/${caseId}`,
            mode: 'live',
          },
          {
            section: t('compliance.caseDetail.sourcesNotes'),
            source: 'GET /api/compliance/data/aml-case-notes?case_id=… · POST /api/compliance/actions/case-note',
            note: t('compliance.caseDetail.sourcesNotesNote'),
            mode: 'live',
          },
          {
            section: t('compliance.caseDetail.sourcesDecision'),
            source: 'PATCH /api/compliance/data/aml-cases/:id',
            note: t('compliance.caseDetail.sourcesDecisionNote'),
            mode: 'live',
          },
          {
            section: t('compliance.caseDetail.sourcesEvidence'),
            source: '—',
            note: t('compliance.caseDetail.sourcesEvidenceNote'),
            mode: 'none',
          },
        ]}
      />
    </>
  );
}
