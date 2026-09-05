'use client';

/**
 * The customer compliance file.
 *
 * Eleven tabs, in the order an investigation is written: who the person is,
 * what evidence supports it, what the risk engine says, what fired, what is
 * open, what moved, what screening returned, what is restricted, who escalated
 * it, and the trail of decisions.
 *
 * Each tab states the read it is standing on. A tab whose source does not
 * answer shows why instead of showing an empty table as if it meant "nothing
 * happened" — for an investigator those two look identical and are not.
 */

import Link from 'next/link';
import React from 'react';
import { useParams } from 'next/navigation';
import { Archive, ExternalLink, FileWarning, FolderSearch, ShieldOff, UserRound } from 'lucide-react';
import { useComplianceResource } from '@/services/compliance/hooks';
import { formatDate, formatMoney, humanizeEnum, maskIdentifier } from '@/services/compliance/format';
import type { AlertRow, ApprovalRow, CustomerRow, DocumentRow, EscalationRow, KybRow, MonitoringRow, ObligationRow } from '@/services/compliance/types';
import { useCompliancePortal } from '@/components/compliance/CompliancePortal';
import {
  Chip,
  DetailTabs,
  KeyList,
  PageHead,
  Panel,
  Provenance,
  SourceNotes,
  StatusChip,
  useHashTab,
} from '@/components/compliance/ui';
import { EmptyState, InlineNotice, LoadingBlock, StateCard } from '@/components/compliance/ui';
import { ComplianceTable, makeTableLabels } from '@/components/compliance/ui';

const TABS = [
  'overview',
  'identity',
  'documents',
  'risk',
  'alerts',
  'cases',
  'activity',
  'screening',
  'restrictions',
  'escalations',
  'trail',
] as const;

type TabId = (typeof TABS)[number];

/** Only the fields this file needs from the case queue. */
interface CaseLike {
  id: string;
  reference: string;
  title: string;
  subjectName: string;
  status: string;
  createdAt: string;
}

export default function CustomerFilePage() {
  const { t, locale } = useCompliancePortal();
  const params = useParams();
  const personId = (params?.id as string | undefined) ?? '';
  const [tab, setTab] = useHashTab([...TABS], 'overview');

  const customers = useComplianceResource('customers');
  const alerts = useComplianceResource('alerts');
  const cases = useComplianceResource('cases');
  const decisions = useComplianceResource('telemetry');
  const documents = useComplianceResource('documents', { query: { identityId: personId } });
  const escalations = useComplianceResource('escalations');
  const kyb = useComplianceResource('kyb');
  const approvals = useComplianceResource('approvals');
  const obligations = useComplianceResource('calendar');

  const person: CustomerRow | undefined = customers.resource.data.find((row) => row.id === personId || row.identityReference === personId);
  const scoped = <T extends { subjectId?: string; customerId?: string; subjectName?: string }>(rows: T[]) =>
    person ? rows.filter((row) => row.subjectId === person.id || row.customerId === person.id || row.subjectName === person.fullName) : [];

  const personAlerts = scoped(alerts.resource.data as unknown as AlertRow[]);
  const personCases = scoped(cases.resource.data as unknown as CaseLike[]);
  const personDecisions = scoped(decisions.resource.data as unknown as MonitoringRow[]);
  const personEscalations = escalations.resource.data.filter(
    (row: EscalationRow) => row.linkedRef === person?.identityReference || row.subject.toLowerCase().includes((person?.fullName ?? '').toLowerCase()),
  );
  const surname = (person?.lastName ?? person?.fullName.split(' ').slice(-1)[0] ?? '').toLowerCase();
  const personEntities = person && surname.length > 1
    ? kyb.resource.data.filter(
        (row: KybRow) => `${row.legalName} ${row.tradingName ?? ''}`.toLowerCase().includes(surname),
      )
    : [];
  const personApprovals = person
    ? approvals.resource.data.filter((row: ApprovalRow) => row.requester.toLowerCase() === (person.email ?? '').toLowerCase())
    : [];
  const personObligations = person
    ? obligations.resource.data.filter((row: ObligationRow) => row.owner === person.identityReference)
    : [];

  const loading = customers.isLoading && !person;
  const tabs = TABS.map((id) => ({
    id,
    label: t(`compliance.customer.tab.${id}`),
    count:
      id === 'alerts'
        ? personAlerts.length
        : id === 'cases'
          ? personCases.length
          : id === 'activity'
            ? personDecisions.length
            : id === 'documents'
              ? documents.resource.data.length
              : id === 'escalations'
                ? personEscalations.length
                : id === 'restrictions'
                  ? personObligations.length
                  : undefined,
  }));

  return (
    <>
      <PageHead
        title={person ? person.fullName : t('compliance.customer.fallbackTitle')}
        description={
          person ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="cmp-ref">{person.identityReference}</span>
              <StatusChip status={person.kycStatus} label={humanizeEnum(person.kycStatus)} />
              <StatusChip status={person.riskLevel} label={`${humanizeEnum(person.riskLevel)} risk`} severity={person.riskLevel === 'HIGH'} />
              <Chip tone="neutral">{person.countryCode === 'NE' ? 'Niger' : 'Nigeria'}</Chip>
            </span>
          ) : (
            t('compliance.customer.subtitle')
          )
        }
        resource={customers.resource}
        back={{ href: '/compliance/customers', label: t('compliance.customer.back') }}
      />

      {loading ? (
        <LoadingBlock label={t('compliance.customer.loading')} variant="detail" />
      ) : !person ? (
        <StateCard
          tone="warning"
          icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
          title={customers.resource.status === 'error' ? t('compliance.states.errorTitle') : t('compliance.customer.notFoundTitle')}
          actions={
            <Link href="/compliance/customers" className="cmp-btn cmp-btn--primary">
              {t('compliance.customer.back')}
            </Link>
          }
        >
          {customers.resource.status === 'error'
            ? (customers.resource.error?.message ?? t('compliance.states.errorBody'))
            : t('compliance.customer.notFoundBody', { id: personId || t('compliance.shell.notReported') })}
        </StateCard>
      ) : (
        <>
          <InlineNotice tone="info" icon={<FolderSearch className="h-4 w-4" aria-hidden="true" />}>
            {t('compliance.customer.privacyNotice')}
          </InlineNotice>

          <DetailTabs tabs={tabs} value={tab} onChange={(id) => setTab(id)} ariaLabel={t('compliance.customer.tabsAria')} />

          <div className="mt-4 space-y-4">
            {tab === 'overview' ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <Panel title={t('compliance.customer.tab.overview')}>
                  <KeyList
                    items={[
                      { term: t('compliance.customers.col.kyc'), value: <StatusChip status={person.kycStatus} label={humanizeEnum(person.kycStatus)} /> },
                      { term: t('compliance.customers.col.risk'), value: <StatusChip status={person.riskLevel} label={humanizeEnum(person.riskLevel)} severity={person.riskLevel === 'HIGH'} /> },
                      { term: t('compliance.customer.tier'), value: humanizeEnum(person.kycTier) },
                      { term: t('compliance.customer.identityStatus'), value: humanizeEnum(person.identityStatus) },
                      { term: t('compliance.customers.col.updated'), value: formatDate(person.updatedAt, 'full', { locale }) },
                    ]}
                  />
                </Panel>
                <Panel title={t('compliance.alerts.title')}>
                  {personAlerts.length ? (
                    <ul className="space-y-2">
                      {personAlerts.slice(0, 4).map((row: AlertRow) => (
                        <li key={row.id}>
                          <Link href={`/compliance/alerts/${encodeURIComponent(row.id)}`} className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] p-2">
                            <StatusChip status={row.severity} label={humanizeEnum(row.severity)} severity />
                            <span className="cmp-ref min-w-0 flex-1 truncate">{row.reference}</span>
                            <ArrowOut />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState title={t('compliance.customer.noAlerts')} body={t('compliance.customer.noAlertsBody')} />
                  )}
                </Panel>
                <Panel title={t('compliance.customer.openWork')}>
                  <KeyList
                    items={[
                      { term: t('compliance.alerts.title'), value: String(personAlerts.length) },
                      { term: t('compliance.cases.title'), value: String(personCases.filter((row) => row.status !== 'CLOSED').length) },
                      { term: t('compliance.customer.decisions'), value: String(personDecisions.length) },
                      { term: t('compliance.escalations.title'), value: String(personEscalations.length) },
                    ]}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/compliance/tasks" className="cmp-btn cmp-btn--ghost px-2">
                      {t('compliance.alerts.myTasks')}
                    </Link>
                    <Link href="/compliance/cases" className="cmp-btn cmp-btn--ghost px-2">
                      {t('compliance.cases.title')}
                      <ArrowOut />
                    </Link>
                  </div>
                </Panel>
              </div>
            ) : null}

            {tab === 'identity' ? (
              <Panel title={t('compliance.customer.tab.identity')} footnote={<Provenance resource={customers.resource} detail={t('compliance.customer.sourceNoteIdentity')} />}>
                <KeyList
                  items={[
                    { term: t('compliance.customer.fullName'), value: person.fullName },
                    { term: t('compliance.customer.dateOfBirth'), value: person.dateOfBirth ? formatDate(person.dateOfBirth, 'date', { locale }) : t('compliance.shell.notReported') },
                    { term: t('compliance.customer.nationality'), value: person.nationality ?? t('compliance.shell.notReported') },
                    { term: t('compliance.customer.gender'), value: person.gender ? humanizeEnum(person.gender) : t('compliance.shell.notReported') },
                    { term: t('compliance.customer.phone'), value: maskIdentifier(person.phone) },
                    { term: t('compliance.customer.email'), value: person.email || t('compliance.shell.notReported') },
                    { term: t('compliance.customer.registered'), value: person.createdAt ? formatDate(person.createdAt, 'full', { locale }) : t('compliance.shell.notReported') },
                  ]}
                />
                {personEntities.length ? (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <h3 className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                      {t('compliance.customer.connectedEntities')}
                    </h3>
                    <ul className="space-y-1.5">
                      {personEntities.map((row: KybRow) => (
                        <li key={row.id} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                          <StatusChip status={row.kybStatus} label={humanizeEnum(row.kybStatus)} />
                          <span className="font-semibold">{row.legalName}</span>
                          <span className="cmp-ref">{row.registrationNumber}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Panel>
            ) : null}

            {tab === 'documents' ? (
              <Panel title={t('compliance.customer.tab.documents')} footnote={<Provenance resource={documents.resource} detail={t('compliance.customer.sourceNoteDocuments')} />}>
                {documents.isLoading ? (
                  <LoadingBlock label={t('compliance.customer.documentsLoading')} variant="table" rows={3} />
                ) : documents.resource.status === 'unauthorized' || documents.resource.error?.code?.startsWith('HTTP_4') ? (
                  <StateCard
                    tone="neutral"
                    icon={<FileWarning className="h-5 w-5" aria-hidden="true" />}
                    title={t('compliance.states.unauthorizedTitle')}
                    actions={<Link href="/compliance/kyc" className="cmp-btn">{t('compliance.nav.kyc')}</Link>}
                  >
                    {t('compliance.customer.documentsLocked')}
                  </StateCard>
                ) : documents.resource.data.length === 0 ? (
                  <EmptyState title={t('compliance.customer.noDocuments')} body={t('compliance.customer.noDocumentsBody')} />
                ) : (
                  <ComplianceTable
                    rows={documents.resource.data as DocumentRow[]}
                    columns={[
                      { key: 'type', header: t('compliance.customer.doc.type'), primary: true, mobileLabel: t('compliance.customer.doc.type'), render: (row: DocumentRow) => humanizeEnum(row.documentType) },
                      { key: 'num', header: t('compliance.customer.doc.number'), mobileLabel: t('compliance.customer.doc.number'), render: (row: DocumentRow) => <span className="cmp-ref">{row.numberMasked ?? t('compliance.shell.notReported')}</span> },
                      { key: 'status', header: t('compliance.common.status'), mobileLabel: t('compliance.common.status'), render: (row: DocumentRow) => <StatusChip status={row.verificationStatus} label={humanizeEnum(row.verificationStatus)} /> },
                      { key: 'exp', header: t('compliance.customer.doc.expires'), hideBelow: 'md', sortValue: (row: DocumentRow) => row.expiresAt ?? '', render: (row: DocumentRow) => (row.expiresAt ? formatDate(row.expiresAt, 'date', { locale }) : t('compliance.shell.notReported')) },
                      { key: 'up', header: t('compliance.customer.doc.uploaded'), hideBelow: 'lg', sortValue: (row: DocumentRow) => row.uploadedAt ?? '', render: (row: DocumentRow) => formatDate(row.uploadedAt, 'short', { locale }) },
                    ]}
                    getRowId={(row: DocumentRow) => row.id}
                    labels={makeTableLabels(t, t('compliance.customer.tab.documents'))}
                    pageSize={10}
                  />
                )}
              </Panel>
            ) : null}

            {tab === 'risk' ? (
              <Panel title={t('compliance.customer.tab.risk')} footnote={<Provenance resource={customers.resource} detail={t('compliance.customer.sourceNoteRisk')} />}>
                {person.amlProfile ? (
                  <KeyList
                    items={[
                      { term: t('compliance.customer.riskScore'), value: typeof person.amlProfile.riskScore === 'number' ? String(person.amlProfile.riskScore) : t('compliance.customer.noScore') },
                      { term: t('compliance.customer.riskFlags'), value: person.amlProfile.highRiskFlags?.length ? person.amlProfile.highRiskFlags.join(' · ') : t('compliance.customer.noFlags') },
                      { term: t('compliance.customer.lastScreened'), value: person.amlProfile.lastScreenedAt ? formatDate(person.amlProfile.lastScreenedAt, 'full', { locale }) : t('compliance.shell.notReported') },
                    ]}
                  />
                ) : (
                  <EmptyState title={t('compliance.customer.noProfile')} body={t('compliance.customer.noProfileBody')} />
                )}
              </Panel>
            ) : null}

            {tab === 'alerts' ? (
              <QueueTable
                title={t('compliance.alerts.title')}
                loading={alerts.isLoading}
                rows={personAlerts}
                empty={t('compliance.customer.noAlerts')}
                labels={makeTableLabels(t, t('compliance.alerts.title'))}
                loadingLabel={t('compliance.states.loading')}
                columns={[
                  { key: 'ref', header: t('compliance.alerts.col.severity'), primary: true, mobileLabel: t('compliance.alerts.col.severity'), render: (row: AlertRow) => <span className="flex items-center gap-2"><StatusChip status={row.severity} label={humanizeEnum(row.severity)} severity /><span className="cmp-ref">{row.reference}</span></span> },
                  { key: 'amount', header: t('compliance.alerts.col.amount'), align: 'end', sortValue: (row: AlertRow) => row.amount, render: (row: AlertRow) => <span className="tabular">{formatMoney(row.amount, row.currency, { locale })}</span> },
                  { key: 'status', header: t('compliance.common.status'), mobileLabel: t('compliance.common.status'), render: (row: AlertRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} /> },
                  { key: 'when', header: t('compliance.alerts.col.triggered'), hideBelow: 'md', sortValue: (row: AlertRow) => row.triggeredAt, render: (row: AlertRow) => formatDate(row.triggeredAt, 'short', { locale }) },
                ]}
                getRowHref={(row: AlertRow) => `/compliance/alerts/${encodeURIComponent(row.id)}`}
                provenance={alerts.resource}
              />
            ) : null}

            {tab === 'cases' ? (
              <QueueTable
                title={t('compliance.cases.title')}
                loading={cases.isLoading}
                rows={personCases}
                empty={t('compliance.customer.noCases')}
                labels={makeTableLabels(t, t('compliance.cases.title'))}
                loadingLabel={t('compliance.states.loading')}
                columns={[
                  { key: 'ref', header: t('compliance.cases.col.reference'), primary: true, mobileLabel: t('compliance.cases.col.reference'), render: (row: CaseLike) => <span className="cmp-ref">{row.reference}</span> },
                  { key: 'title', header: t('compliance.cases.col.subject'), mobileLabel: t('compliance.cases.col.subject'), render: (row: CaseLike) => row.title || row.subjectName },
                  { key: 'status', header: t('compliance.common.status'), mobileLabel: t('compliance.common.status'), render: (row: CaseLike) => <StatusChip status={row.status} label={humanizeEnum(row.status)} /> },
                  { key: 'created', header: t('compliance.customer.col.created'), hideBelow: 'md', sortValue: (row: CaseLike) => row.createdAt, render: (row: CaseLike) => formatDate(row.createdAt, 'short', { locale }) },
                ]}
                getRowHref={(row: CaseLike) => `/compliance/cases/${encodeURIComponent(row.id)}`}
                provenance={cases.resource}
              />
            ) : null}

            {tab === 'activity' ? (
              <QueueTable
                title={t('compliance.customer.tab.activity')}
                loading={decisions.isLoading}
                rows={personDecisions}
                empty={t('compliance.customer.noDecisions')}
                labels={makeTableLabels(t, t('compliance.customer.tab.activity'))}
                loadingLabel={t('compliance.states.loading')}
                columns={[
                  { key: 'ref', header: t('compliance.transactions.col.reference'), primary: true, mobileLabel: t('compliance.transactions.col.reference'), render: (row: MonitoringRow) => <span className="cmp-ref">{row.reference}</span> },
                  { key: 'decision', header: t('compliance.transactions.col.decision'), mobileLabel: t('compliance.transactions.col.decision'), render: (row: MonitoringRow) => <StatusChip status={row.decision} label={humanizeEnum(row.decision)} severity={row.held} /> },
                  { key: 'score', header: t('compliance.transactions.col.score'), hideBelow: 'sm', sortValue: (row: MonitoringRow) => row.riskScore ?? -1, render: (row: MonitoringRow) => <span className="tabular">{typeof row.riskScore === 'number' ? row.riskScore : t('compliance.shell.notReported')}</span> },
                  { key: 'when', header: t('compliance.transactions.col.evaluated'), hideBelow: 'md', sortValue: (row: MonitoringRow) => row.createdAt, render: (row: MonitoringRow) => formatDate(row.createdAt, 'short', { locale }) },
                ]}
                getRowHref={() => undefined}
                provenance={decisions.resource}
              />
            ) : null}

            {tab === 'screening' ? (
              <Panel title={t('compliance.customer.tab.screening')} footnote={<Provenance resource={decisions.resource} detail={t('compliance.customer.sourceNoteScreening')} />}>
                <div className="space-y-3">
                  <p className="text-[12.5px] leading-[1.55] text-[var(--foreground-muted)]">{t('compliance.customer.screeningBody')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/compliance/sanctions" className="cmp-btn cmp-btn--primary">
                      {t('compliance.customer.runScreening')}
                      <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <Link href="/compliance/pep" className="cmp-btn">
                      {t('compliance.nav.pep')}
                    </Link>
                    <Link href="/compliance/adverse-media" className="cmp-btn">
                      {t('compliance.nav.adverseMedia')}
                    </Link>
                  </div>
                  {personObligations.length ? (
                    <KeyList items={personObligations.map((row: ObligationRow) => ({ term: row.title, value: <StatusChip status={row.status} label={humanizeEnum(row.status)} /> }))} />
                  ) : null}
                </div>
              </Panel>
            ) : null}

            {tab === 'restrictions' ? (
              <Panel title={t('compliance.customer.tab.restrictions')} footnote={<Provenance resource={approvals.resource} detail={t('compliance.customer.sourceNoteRestrictions')} />}>
                <div className="space-y-3">
                  <p className="text-[12.5px] leading-[1.55] text-[var(--foreground-muted)]">{t('compliance.customer.restrictionsBody')}</p>
                  {personApprovals.length ? (
                    <ComplianceTable
                      rows={personApprovals}
                      columns={[
                        { key: 'ref', header: t('compliance.approvals.col.reference'), primary: true, mobileLabel: t('compliance.approvals.col.reference'), render: (row: ApprovalRow) => <span className="cmp-ref">{row.reference}</span> },
                        { key: 'kind', header: t('compliance.approvals.col.kind'), render: (row: ApprovalRow) => humanizeEnum(row.requestedAccess) },
                        { key: 'status', header: t('compliance.common.status'), mobileLabel: t('compliance.common.status'), render: (row: ApprovalRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} /> },
                      ]}
                      getRowId={(row: ApprovalRow) => row.id}
                      labels={makeTableLabels(t, t('compliance.customer.tab.restrictions'))}
                      pageSize={8}
                    />
                  ) : (
                    <EmptyState title={t('compliance.customer.noRestrictions')} body={t('compliance.customer.noRestrictionsBody')} />
                  )}
                  <Link href="/compliance/restrictions" className="cmp-btn cmp-btn--ghost px-2">
                    {t('compliance.customer.restrictionsLink')}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </Panel>
            ) : null}

            {tab === 'escalations' ? (
              <QueueTable
                title={t('compliance.escalations.title')}
                loading={escalations.isLoading}
                rows={personEscalations}
                empty={t('compliance.customer.noEscalations')}
                labels={makeTableLabels(t, t('compliance.escalations.title'))}
                loadingLabel={t('compliance.states.loading')}
                columns={[
                  { key: 'ref', header: t('compliance.escalations.col.reference'), primary: true, mobileLabel: t('compliance.escalations.col.reference'), render: (row: EscalationRow) => <span className="cmp-ref">{row.reference}</span> },
                  { key: 'subject', header: t('compliance.escalations.col.subject'), render: (row: EscalationRow) => row.subject },
                  { key: 'priority', header: t('compliance.escalations.col.priority'), mobileLabel: t('compliance.escalations.col.priority'), render: (row: EscalationRow) => <StatusChip status={row.priority} label={humanizeEnum(row.priority)} severity={row.priority === 'URGENT' || row.priority === 'HIGH'} /> },
                  { key: 'status', header: t('compliance.common.status'), mobileLabel: t('compliance.common.status'), render: (row: EscalationRow) => <StatusChip status={row.status} label={humanizeEnum(row.status)} /> },
                ]}
                getRowHref={() => '/compliance/escalations'}
                provenance={escalations.resource}
              />
            ) : null}

            {tab === 'trail' ? (
              <Panel title={t('compliance.customer.tab.trail')} footnote={<Provenance resource={alerts.resource} detail={t('compliance.customer.sourceNoteTrail')} />}>
                <div className="space-y-2">
                  {personAlerts.length === 0 && personCases.length === 0 ? (
                    <EmptyState title={t('compliance.customer.noTrail')} body={t('compliance.customer.noTrailBody')} />
                  ) : (
                    <>
                      {personAlerts.map((row: AlertRow) => (
                        <Record key={`a-${row.id}`} icon={<Archive className="h-3.5 w-3.5" aria-hidden="true" />} head={t('compliance.customer.trailAlert', { reference: row.reference })} body={`${humanizeEnum(row.status)} · ${formatDate(row.triggeredAt, 'full', { locale })}`} />
                      ))}
                      {personCases.map((row) => (
                        <Record key={`c-${row.id}`} icon={<Archive className="h-3.5 w-3.5" aria-hidden="true" />} head={t('compliance.customer.trailCase', { reference: row.reference })} body={`${humanizeEnum(row.status)} · ${formatDate(row.createdAt, 'full', { locale })}`} />
                      ))}
                    </>
                  )}
                  <Link href="/compliance/audit" className="cmp-btn cmp-btn--ghost px-2">
                    {t('compliance.customer.trailLink')}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </Panel>
            ) : null}
          </div>
        </>
      )}

      <SourceNotes
        title={t('compliance.dashboard.sourcesTitle')}
        rows={[
          { section: t('compliance.customer.tab.identity'), source: 'GET /api/core/v1/identity/persons → MasterIdentityEngine', note: t('compliance.customer.sourceNoteIdentity'), mode: 'live' },
          { section: t('compliance.customer.tab.documents'), source: 'GET /api/core/v1/identity/documents?identityId= → DocumentVaultEngine', note: t('compliance.customer.sourceNoteDocuments'), mode: documents.resource.source === 'demo' ? 'demo' : 'live' },
          { section: t('compliance.customer.tab.alerts'), source: 'GET /api/aml/alerts, joined on subject id', note: t('compliance.customer.sourceNoteQueues'), mode: 'live' },
          { section: t('compliance.customer.tab.activity'), source: 'GET /api/core/v1/risk/decisions, joined on subject id', note: t('compliance.customer.sourceNoteActivity'), mode: 'live' },
          { section: t('compliance.customer.tab.screening'), source: 'POST /api/aml/screening (an action, not a stored list)', note: t('compliance.customer.sourceNoteScreening'), mode: 'live' },
          { section: t('compliance.customer.tab.restrictions'), source: 'GET /api/security/pam/requests', note: t('compliance.customer.sourceNoteRestrictions'), mode: 'live' },
        ]}
      />
    </>
  );
}

const ArrowOut: React.FC = () => <ExternalLink className="h-3.5 w-3.5 text-[var(--foreground-muted)]" aria-hidden="true" />;

const Record: React.FC<{ icon: React.ReactNode; head: string; body: string }> = ({ icon, head, body }) => (
  <div className="flex items-start gap-2 rounded-[10px] border border-[var(--border)] p-2.5">
    <span className="mt-0.5 text-[var(--foreground-muted)]">{icon}</span>
    <span className="min-w-0">
      <span className="block truncate text-[12.5px] font-semibold text-[var(--foreground)]">{head}</span>
      <span className="cmp-ref block truncate">{body}</span>
    </span>
  </div>
);

const QueueTable: React.FC<{
  title: string;
  loading: boolean;
  loadingLabel: string;
  rows: any[];
  empty: string;
  labels: ReturnType<typeof makeTableLabels>;
  columns: any[];
  getRowHref: (row: any) => string | undefined;
  provenance: any;
}> = ({ title, loading, loadingLabel, rows, empty, labels, columns, getRowHref, provenance }) => (
  <Panel title={title} footnote={<Provenance resource={provenance} />}>
    {loading ? (
      <LoadingBlock label={loadingLabel} variant="table" rows={3} />
    ) : rows.length === 0 ? (
      <EmptyState title={empty} />
    ) : (
      <ComplianceTable rows={rows} columns={columns} getRowId={(row: any) => row.id} getRowHref={getRowHref} labels={labels} pageSize={8} />
    )}
  </Panel>
);
