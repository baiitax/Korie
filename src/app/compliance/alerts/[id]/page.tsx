'use client';

/**
 * One AML alert, read the way an investigator reads it: what happened, why the
 * rule thought it was suspicious, who is involved, and how the pattern was
 * detected — then the disposition controls.
 *
 * The narrative fields come from the alert record itself (the engine stores the
 * explanation the detection produced); they are not written by this screen.
 * Disposition goes back through `POST /api/aml/alerts/:id`, so the next reader
 * sees the change here, in the queue, on the customer file and in the case
 * engine at the same time.
 */

import Link from 'next/link';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertOctagon, ArrowRight, ExternalLink, FileWarning, Gavel, RefreshCw } from 'lucide-react';
import { useComplianceAction, useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, humanizeEnum } from '@/services/compliance/format';
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
  SelectInput,
  SlaDue,
  SourceNotes,
  StatusChip,
  TextInput,
} from '@/components/compliance/ui';
import { InlineNotice, LoadingBlock, StateCard } from '@/components/compliance/ui';

const DISPOSITIONS = ['IN_REVIEW', 'ASSIGNED', 'ESCALATED', 'FALSE_POSITIVE', 'DISMISSED', 'CLOSED'];

export default function AlertDetailPage() {
  const { t, locale, session } = useCompliancePortal();
  const params = useParams();
  const alertId = (params?.id as string | undefined) ?? '';
  const { resource, isLoading, isRefreshing, reload } = useComplianceResource('alertDetail', { id: alertId });
  const action = useComplianceAction();
  const [open, setOpen] = useState(false);

  const alert = resource.data[0];

  return (
    <>
      <PageHead
        title={alert ? t('compliance.alertDetail.title', { reference: alert.reference }) : t('compliance.alertDetail.fallbackTitle')}
        description={t('compliance.alertDetail.subtitle')}
        resource={resource}
        back={{ href: '/compliance/alerts', label: t('compliance.alertDetail.back') }}
        actions={
          <>
            <Button
              icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={reload}
              pending={isLoading || isRefreshing}
            >
              {isRefreshing ? t('compliance.states.refreshing') : t('compliance.states.refresh')}
            </Button>
            {alert ? (
              <Button variant="primary" icon={<Gavel className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setOpen(true)}>
                {t('compliance.alerts.dispose')}
              </Button>
            ) : null}
          </>
        }
      />

      {isLoading ? (
        <LoadingBlock label={t('compliance.alertDetail.loading')} variant="detail" />
      ) : !alert ? (
        <StateCard
          tone="warning"
          icon={<FileWarning className="h-5 w-5" aria-hidden="true" />}
          title={resource.status === 'error' ? t('compliance.states.errorTitle') : t('compliance.alertDetail.notFoundTitle')}
          actions={
            <>
              <Button onClick={reload}>{t('compliance.states.retry')}</Button>
              <Link href="/compliance/alerts" className="cmp-btn cmp-btn--primary">
                {t('compliance.alertDetail.back')}
              </Link>
            </>
          }
        >
          {resource.status === 'error'
            ? (resource.error?.message ?? t('compliance.states.errorBody'))
            : t('compliance.alertDetail.notFoundBody', { id: alertId || t('compliance.shell.notReported') })}
        </StateCard>
      ) : (
        <div className="space-y-4">
          {resource.status === 'error' ? (
            <InlineNotice tone="warning">{t('compliance.alertDetail.staleNotice')}</InlineNotice>
          ) : null}
          {action.status === 'success' ? (
            <InlineNotice tone={action.result?.recorded ? 'info' : 'warning'}>
              {action.result?.recorded ? t('compliance.actions.liveOutcome') : t('compliance.actions.demoOutcome')}
            </InlineNotice>
          ) : action.status === 'error' ? (
            <InlineNotice tone="danger">{action.result?.error?.message ?? t('compliance.actions.failedOutcome')}</InlineNotice>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <Panel title={t('compliance.alertDetail.whatHappened')}>
                <p className="text-[13.5px] leading-[1.55] text-[var(--foreground)]">
                  {alert.whatHappened ?? t('compliance.alertDetail.notProvided')}
                </p>
              </Panel>

              <Panel title={t('compliance.alertDetail.whySuspicious')}>
                <p className="text-[13.5px] leading-[1.55] text-[var(--foreground)]">
                  {alert.whySuspicious ?? t('compliance.alertDetail.notProvided')}
                </p>
              </Panel>

              <div className="grid gap-4 md:grid-cols-2">
                <Panel title={t('compliance.alertDetail.whoInvolved')}>
                  <p className="text-[13px] leading-[1.5] text-[var(--foreground)]">{alert.whoInvolved ?? t('compliance.alertDetail.notProvided')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/compliance/customers/${encodeURIComponent(alert.subjectId)}`} className="cmp-btn cmp-btn--ghost px-2">
                      {t('compliance.alertDetail.openCustomerFile')}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    {alert.transactionReference ? (
                      <Link href={`/compliance/transactions?term=${encodeURIComponent(alert.transactionReference)}`} className="cmp-btn cmp-btn--ghost px-2">
                        {t('compliance.alertDetail.relatedActivity')}
                      </Link>
                    ) : null}
                  </div>
                </Panel>

                <Panel title={t('compliance.alertDetail.howDetected')}>
                  <p className="text-[13px] leading-[1.5] text-[var(--foreground)]">{alert.howPatternDetected ?? t('compliance.alertDetail.notProvided')}</p>
                  <div className="mt-3 text-[11.5px] text-[var(--foreground-muted)]">
                    <span className="cmp-ref">{alert.scenarioCode ?? 'scenario not reported'}</span>
                  </div>
                </Panel>
              </div>
            </div>

            <div className="space-y-4">
              <Panel title={t('compliance.alertDetail.caseSummary')}>
                <KeyList
                  items={[
                    { term: t('compliance.alertDetail.reference'), value: <span className="cmp-ref">{alert.reference}</span> },
                    { term: t('compliance.common.status'), value: <StatusChip status={alert.status} label={humanizeEnum(alert.status)} /> },
                    { term: t('compliance.alerts.col.severity'), value: <StatusChip status={alert.severity} label={humanizeEnum(alert.severity)} severity /> },
                    {
                      term: t('compliance.alerts.col.amount'),
                      value: <span className="tabular">{formatMoney(alert.amount, alert.currency, { locale })}</span>,
                    },
                    { term: t('compliance.alertDetail.triggered'), value: formatDate(alert.triggeredAt, 'full', { locale }) },
                    {
                      term: t('compliance.alertDetail.sla'),
                      value: (
                        <SlaDue
                          dueAt={alert.slaDueAt}
                          breached={alert.slaBreached}
                          overdueLabel={t('compliance.alerts.slaBreached')}
                          dueLabel={t('compliance.alerts.slaDue')}
                        />
                      ),
                    },
                    { term: t('compliance.alertDetail.assignee'), value: alert.assignedTo ?? t('compliance.shell.notReported') },
                    { term: t('compliance.common.jurisdiction'), value: alert.jurisdiction || t('compliance.shell.notReported') },
                  ]}
                />
              </Panel>

              <Panel title={t('compliance.alertDetail.nextActions')}>
                <div className="space-y-2">
                  {alert.caseId ? (
                    <Link href={`/compliance/cases/${encodeURIComponent(alert.caseId)}`} className="cmp-btn cmp-btn--primary w-full">
                      {t('compliance.alertDetail.openCase')}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <Button variant="primary" className="w-full" onClick={() => setOpen(true)}>
                      {t('compliance.alerts.convert')}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                  <Link href="/compliance/customers" className="cmp-btn w-full justify-center">
                    {t('compliance.alertDetail.sameSubject')}
                  </Link>
                  <p className="text-[11.5px] leading-[1.5] text-[var(--foreground-muted)]">{t('compliance.alertDetail.actionsNote')}</p>
                </div>
              </Panel>

              <Panel title={t('compliance.alertDetail.provenance')}>
                <div className="space-y-2">
                  <Provenance resource={resource} detail={t('compliance.alertDetail.provenanceDetail')} />
                  {alert.transactionReference ? (
                    <Chip tone="clear" icon={<FileWarning className="h-3 w-3" aria-hidden="true" />}>
                      <span className="cmp-ref">{alert.transactionReference}</span>
                    </Chip>
                  ) : null}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

      <DisposeModal
        open={open && Boolean(alert)}
        alert={alert}
        onClose={() => setOpen(false)}
        action={action}
        sessionEmail={session?.email ?? ''}
        onChanged={() => {
          setOpen(false);
          reload();
        }}
      />

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          {
            section: t('compliance.alertDetail.title', { reference: alert?.reference ?? '' }),
            source: 'GET /api/aml/alerts/:id → AmlAlertEngine.getAlert()',
            note: t('compliance.alertDetail.sourceNote'),
            mode: resource.source === 'demo' ? 'demo' : 'live',
          },
          {
            section: t('compliance.alertDetail.openCustomerFile'),
            source: 'GET /api/core/v1/identity/persons → filtered by the alert subject id',
            note: t('compliance.alertDetail.sourceNoteCustomer'),
            mode: 'live',
          },
        ]}
      />
    </>
  );
}

const DisposeModal: React.FC<{
  open: boolean;
  alert?: { id: string; reference: string; status: string };
  onClose: () => void;
  action: ReturnType<typeof useComplianceAction>;
  sessionEmail: string;
  onChanged: () => void;
}> = ({ open, alert, onClose, action, sessionEmail, onChanged }) => {
  const { t, demoEnabled } = useCompliancePortal();
  const [status, setStatus] = useState('IN_REVIEW');
  const [assignee, setAssignee] = useState('');
  const [convert, setConvert] = useState(false);
  const busy = action.status === 'pending';

  if (!alert) return null;

  const submit = async () => {
    const out = convert
      ? await action.runLive('alerts.convert', alert.id, { investigatorEmail: sessionEmail || 'lead.investigator@koriepay.ng' })
      : await action.runLive('alerts.status', alert.id, {
          status,
          assignedTo: status === 'ASSIGNED' ? assignee.trim() || sessionEmail || undefined : undefined,
        });
    if (out.ok) onChanged();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('compliance.alerts.disposeTitle')}
      description={t('compliance.alerts.disposeBody', { reference: alert.reference })}
      closeLabel={t('compliance.shell.close')}
      footer={
        <>
          <Button onClick={onClose}>{t('compliance.actions.cancel')}</Button>
          <Button variant="primary" onClick={submit} pending={busy || action.showPending}>
            {convert ? t('compliance.alerts.convert') : t('compliance.alerts.confirmDispose')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <KeyList
          items={[
            { term: t('compliance.common.status'), value: <StatusChip status={alert.status} label={humanizeEnum(alert.status)} /> },
            { term: t('compliance.alertDetail.reference'), value: <span className="cmp-ref">{alert.reference}</span> },
          ]}
        />

        <label className="flex items-start gap-2 rounded-[10px] border border-[var(--border)] p-2.5">
          <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            <span className="block text-[12.5px] font-bold text-[var(--foreground)]">{t('compliance.alerts.convert')}</span>
            <span className="block text-[11.5px] text-[var(--foreground-muted)]">{t('compliance.alerts.convertHint')}</span>
          </span>
        </label>

        {!convert ? (
          <>
            <Field label={t('compliance.alerts.outcome')} htmlFor="detail-status">
              <SelectInput id="detail-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {DISPOSITIONS.map((s) => (
                  <option key={s} value={s}>
                    {humanizeEnum(s)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            {status === 'ASSIGNED' ? (
              <Field
                label={t('compliance.alerts.assignee')}
                htmlFor="detail-assignee"
                hint={t('compliance.alerts.assigneeHint', { email: sessionEmail || t('compliance.shell.notReported') })}
              >
                <TextInput id="detail-assignee" type="email" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder={sessionEmail} />
              </Field>
            ) : null}
          </>
        ) : null}

        <InlineNotice tone={demoEnabled ? 'warning' : 'info'}>
          {t('compliance.alerts.disposeFootnote')} <Chip tone={demoEnabled ? 'medium' : 'clear'}>{demoEnabled ? 'Demo' : 'Live'}</Chip>{' '}
          {t('compliance.alerts.disposeEngineNote')}
        </InlineNotice>

        {action.status === 'error' ? (
          <p role="alert" className="text-[12px] font-semibold" style={{ color: 'var(--sev-critical)' }}>
            {action.result?.error?.message ?? t('compliance.actions.failedOutcome')}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
