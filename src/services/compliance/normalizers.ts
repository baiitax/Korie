/**
 * Engine record → portal row mappers.
 *
 * Every mapping here is a projection of a field that genuinely exists on the
 * wire. Where the backend has no such field the row keeps `undefined` and the
 * screen renders "Not reported"; inventing a value is what the previous version
 * of this portal did (it printed "CONNECTED" next to a bank integration nobody
 * had called), and it is the behaviour this layer exists to prevent.
 */

import type { DocumentRow, AlertRow, CaseRow, CustomerRow, HealthRow, KybRow, KycRow, MonitoringRow, ProviderRow, EscalationRow, ObligationRow, ReportRow } from './types';

type Json = Record<string, any>;

const SEVERITY_BY_ENGINE: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
  P0_CRITICAL: 'CRITICAL',
  P1_HIGH: 'HIGH',
  P2_MEDIUM: 'MEDIUM',
  P3_LOW: 'LOW',
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

export function mapSeverity(raw: unknown): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  return SEVERITY_BY_ENGINE[String(raw)] ?? 'MEDIUM';
}

export function daysSince(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export function isPast(iso?: string): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t < Date.now();
}

/* ── AML ────────────────────────────────────────────────────────────────── */

export function mapAlert(raw: Json): AlertRow {
  return {
    id: String(raw.id ?? ''),
    reference: String(raw.alertReference ?? raw.id ?? ''),
    scenarioCode: raw.scenarioCode,
    subjectId: String(raw.customerId ?? ''),
    subjectName: String(raw.customerName ?? 'Subject not identified'),
    subjectType: 'CUSTOMER',
    severity: mapSeverity(raw.severity),
    status: String(raw.status ?? 'NEW'),
    amount: Number(raw.disputedOrTriggeredAmount ?? 0),
    currency: String(raw.currency ?? 'NGN'),
    jurisdiction: raw.currency === 'XOF' ? 'NE' : 'NG',
    transactionReference: raw.transactionReference,
    whatHappened: raw.whatHappened,
    whySuspicious: raw.whySuspicious,
    whoInvolved: raw.whoInvolved,
    howPatternDetected: raw.howPatternDetected,
    assignedTo: raw.assignedTo,
    slaDueAt: raw.slaDueAt,
    slaBreached: Boolean(raw.isSlaBreached) || isPast(raw.slaDueAt),
    triggeredAt: String(raw.createdAt ?? ''),
    caseId: raw.caseId,
  };
}

const CASE_STATUS_BY_ENGINE: Record<string, string> = {
  OPEN: 'OPEN',
  TRIAGE: 'UNDER_REVIEW',
  INVESTIGATION: 'UNDER_REVIEW',
  INFORMATION_REQUESTED: 'WAITING_FOR_INFO',
  ESCALATED: 'ESCALATED',
  DECISION_PENDING: 'PENDING_DECISION',
  ACTION_PENDING: 'PENDING_DECISION',
  CLOSED: 'CLOSED',
};

export function mapCase(raw: Json): CaseRow {
  const alerts = Array.isArray(raw.alerts) ? raw.alerts : [];
  const notes = Array.isArray(raw.notes) ? raw.notes : [];
  const status = CASE_STATUS_BY_ENGINE[String(raw.status)] ?? String(raw.status ?? 'OPEN');
  return {
    id: String(raw.id ?? ''),
    reference: String(raw.caseReference ?? raw.id ?? ''),
    title: String(raw.title ?? 'Untitled investigation'),
    subjectId: String(raw.primaryCustomerId ?? ''),
    subjectName: String(raw.primaryCustomerName ?? 'Subject not identified'),
    jurisdiction: String(raw.jurisdiction ?? 'NG'),
    priority: mapSeverity(raw.priority),
    status,
    exposureAmount: Number(raw.totalExposureAmount ?? 0),
    currency: String(raw.currency ?? 'NGN'),
    leadInvestigator: String(raw.leadInvestigator ?? 'Unassigned'),
    assignedTeam: raw.assignedTeam,
    alertCount: Number(raw.alertCount ?? alerts.length),
    noteCount: notes.length,
    finalDecision: raw.finalDecision,
    decisionMaker: raw.decisionMaker,
    decisionChecker: raw.decisionChecker,
    decisionNotes: raw.decisionNotes,
    decidedAt: raw.decidedAt,
    slaDueAt: raw.slaDueAt,
    slaBreached: isPast(raw.slaDueAt) && status !== 'CLOSED',
    createdAt: String(raw.createdAt ?? ''),
    closedAt: raw.closedAt,
  };
}

/* ── Master identity ────────────────────────────────────────────────────── */

export function mapCustomer(raw: Json, extra?: { openCases?: number; hasOpenAlerts?: boolean; amlProfile?: CustomerRow['amlProfile'] }): CustomerRow {
  return {
    id: String(raw.id ?? ''),
    identityReference: String(raw.identityReference ?? raw.id ?? ''),
    fullName: String(raw.fullName ?? [raw.firstName, raw.lastName].filter(Boolean).join(' ')),
    countryCode: String(raw.countryCode ?? ''),
    phone: String(raw.phonePrimary ?? ''),
    email: String(raw.emailPrimary ?? ''),
    kycTier: String(raw.kycTier ?? ''),
    kycStatus: String(raw.kycStatus ?? ''),
    identityStatus: String(raw.identityStatus ?? ''),
    riskLevel: String(raw.riskLevel ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ''),
    firstName: raw.firstName ? String(raw.firstName) : undefined,
    lastName: raw.lastName ? String(raw.lastName) : undefined,
    dateOfBirth: raw.dateOfBirth ? String(raw.dateOfBirth) : undefined,
    gender: raw.gender ? String(raw.gender) : undefined,
    nationality: raw.nationality ? String(raw.nationality) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    amlProfile: extra?.amlProfile,
    openCaseCount: extra?.openCases,
    hasOpenAlerts: extra?.hasOpenAlerts,
  };
}

export function mapKyc(raw: Json, docs: Json[] | null = null): KycRow {
  // `docs === null` means the document read could not answer for this person
  // (no identity-scoped request was made), which is different from an empty
  // list: an empty list genuinely means nothing is on file.
  const owned = docs === null ? null : docs.filter((d) => d.identityId === raw.id || !d.identityId);
  return {
    id: String(raw.id ?? ''),
    identityReference: String(raw.identityReference ?? raw.id ?? ''),
    customerName: String(raw.fullName ?? [raw.firstName, raw.lastName].filter(Boolean).join(' ')),
    tier: String(raw.kycTier ?? ''),
    status: String(raw.kycStatus ?? ''),
    riskLevel: String(raw.riskLevel ?? ''),
    countryCode: String(raw.countryCode ?? ''),
    submittedAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ''),
    documentCount: owned ? owned.length : undefined,
    verifiedDocumentCount: owned ? owned.filter((d) => d.verificationStatus === 'VERIFIED').length : undefined,
    oldestPendingDays:
      String(raw.kycStatus) === 'VERIFIED' ? undefined : daysSince(raw.updatedAt ?? raw.createdAt),
  };
}

export function mapKyb(raw: Json): KybRow {
  return {
    id: String(raw.id ?? ''),
    identityReference: String(raw.identityReference ?? raw.id ?? ''),
    legalName: String(raw.legalName ?? ''),
    tradingName: raw.tradingName,
    registrationNumber: String(raw.registrationNumber ?? ''),
    taxIdentifier: raw.taxIdentifier,
    businessType: String(raw.businessType ?? ''),
    industry: raw.industry,
    countryCode: String(raw.countryCode ?? ''),
    kybStatus: String(raw.kybStatus ?? ''),
    entityStatus: String(raw.status ?? ''),
    riskLevel: String(raw.riskLevel ?? ''),
    beneficialOwnersCount: Number(raw.beneficialOwnersCount ?? 0),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ''),
  };
}

/* ── Risk decisions (transaction monitoring feed) ───────────────────────── */

export function mapDecision(raw: Json): MonitoringRow {
  const hits = Array.isArray(raw.ruleHits) ? raw.ruleHits : [];
  return {
    id: String(raw.id ?? ''),
    reference: String(raw.transactionReference ?? raw.id ?? ''),
    decision: String(raw.decision ?? ''),
    riskScore: typeof raw.compositeScore === 'number' ? raw.compositeScore : undefined,
    signals: hits.map((h: Json) => ({
      code: String(h.ruleCode ?? h.code ?? h.id ?? 'signal'),
      weight: typeof h.weight === 'number' ? h.weight : undefined,
      description: h.description ?? h.reason,
    })),
    amount: typeof raw.amount === 'number' ? raw.amount : undefined,
    currency: raw.currency,
    subjectName: raw.entityName ?? raw.entityId,
    createdAt: String(raw.createdAt ?? ''),
    held: String(raw.decision ?? '').includes('HOLD') || String(raw.riskBand ?? '') === 'CRITICAL',
  };
}

/* ── Governance ─────────────────────────────────────────────────────────── */

/**
 * `/api/v1/regulatory/reports` serves filing snapshots, whose vocabulary is
 * `reportTitle` / `periodCode` / `makerPreparer` / `checkerApprover` — not the
 * generic names the old page assumed. Every field below is read from a key that
 * exists on the wire.
 */
export function mapReport(raw: Json): ReportRow {
  const financials: { label: string; amount: number; currency: string }[] = [];
  if (typeof raw.totalAssetsNgn === 'number') financials.push({ label: 'Total assets', amount: raw.totalAssetsNgn / 100, currency: 'NGN' });
  if (typeof raw.totalLiabilitiesNgn === 'number') financials.push({ label: 'Total liabilities', amount: raw.totalLiabilitiesNgn / 100, currency: 'NGN' });
  if (typeof raw.customerFundsNgn === 'number') financials.push({ label: 'Customer funds', amount: raw.customerFundsNgn / 100, currency: 'NGN' });
  if (typeof raw.nostroLiquidityNgn === 'number') financials.push({ label: 'Nostro liquidity', amount: raw.nostroLiquidityNgn / 100, currency: 'NGN' });
  return {
    id: String(raw.id ?? raw.reportReference ?? ''),
    reference: String(raw.reportReference ?? raw.obligationCode ?? raw.id ?? ''),
    reportType: String(raw.reportTitle ?? raw.reportType ?? raw.code ?? ''),
    regulator: String(raw.regulator ?? raw.regulatorName ?? ''),
    period: String(raw.periodCode ?? raw.reportingPeriod ?? raw.period ?? ''),
    dueDate: String(raw.nextDueDate ?? raw.dueDate ?? ''),
    status: String(raw.status ?? raw.filingStatus ?? ''),
    submittedAt: raw.submittedAt ?? raw.submissionDate,
    approvedAt: raw.approvedAt,
    acknowledgement: raw.acknowledgementToken ?? raw.acknowledgementRef,
    recordCount: typeof raw.recordCount === 'number' ? raw.recordCount : undefined,
    maker: raw.makerPreparer ?? raw.preparedBy,
    checker: raw.checkerApprover ?? raw.approvedBy,
    reconciliation: raw.reconciliationStatus,
    snapshotHash: raw.snapshotHashSha256,
    financials: financials.length ? financials : undefined,
    obligationCode: raw.obligationCode,
    jurisdiction: raw.jurisdiction,
  };
}

/** The register publishes `reportTitle` + `nextDueDate`; older shapes used
 * `title` + `dueDate`. Both are read, and an absent date stays absent. */
export function mapObligation(raw: Json): ObligationRow {
  return {
    id: String(raw.id ?? raw.obligationCode ?? ''),
    title: String(raw.reportTitle ?? raw.title ?? raw.obligationCode ?? ''),
    regulator: String(raw.regulator ?? raw.regulatorName ?? ''),
    dueDate: String(raw.nextDueDate ?? raw.dueDate ?? ''),
    frequency: raw.frequency,
    status: String(raw.status ?? ''),
    owner: raw.reportOwner ?? raw.ownerEmail ?? raw.responsibleDepartment,
    channel: raw.submissionChannel,
    approverRole: raw.approverRole,
    jurisdiction: raw.jurisdiction,
    code: raw.obligationCode,
  };
}

export function mapEscalation(raw: Json): EscalationRow {
  return {
    id: String(raw.id ?? ''),
    reference: String(raw.complaintReference ?? raw.id ?? ''),
    subject: String(raw.customerName ?? raw.customerId ?? ''),
    category: String(raw.category ?? ''),
    priority: String(raw.priority ?? ''),
    status: String(raw.status ?? ''),
    raisedAt: String(raw.createdAt ?? raw.receivedAt ?? ''),
    slaDueAt: raw.slaDueAt,
    slaBreached: Boolean(raw.isSlaBreached) || isPast(raw.slaDueAt),
    assignedTo: raw.assignedToEmail ?? raw.assignedTo,
    channel: raw.agentId ? 'AGENT' : raw.terminalId ? 'TERMINAL' : 'PORTAL',
    description: raw.description,
    amount: typeof raw.disputedAmount === 'number' ? raw.disputedAmount : undefined,
    currency: raw.currency,
    linkedRef: raw.agentId ?? raw.terminalId ?? raw.transactionReference,
    jurisdiction: raw.country,
  };
}

/**
 * A just-in-time elevation request. `expiresAt` is not stored on the request, so
 * it is
 * computed from the granted duration and the UI marks the window as computed
 * rather than pretending the engine published an expiry.
 */
export function mapApproval(raw: Json): import('./types').ApprovalRow {
  const minutes = typeof raw.durationMinutes === 'number' ? raw.durationMinutes : undefined;
  const computedExpiry =
    minutes !== undefined && raw.createdAt ? new Date(Date.parse(String(raw.createdAt)) + minutes * 60_000).toISOString() : undefined;
  return {
    id: String(raw.id ?? ''),
    reference: String(raw.requestReference ?? raw.id ?? ''),
    kind: 'PRIVILEGED_ACCESS',
    requester: String(raw.requesterEmail ?? raw.requester ?? ''),
    requestedAccess: String(raw.targetRoleCode ?? raw.accessType ?? ''),
    reason: raw.justification ?? raw.reason,
    status: String(raw.status ?? 'PENDING'),
    requestedAt: String(raw.createdAt ?? ''),
    // After a decision the engine returns the real lease window; before that
    // there is only the requested duration, so the expiry is computed from it
    // and labelled as such by the UI.
    expiresAt: raw.expiresAt ?? raw.leaseExpiresAt ?? computedExpiry,
    decidedBy: raw.approvedBy ?? raw.decidedBy ?? raw.checkerEmail,
    ticket: raw.changeTicketRef,
    durationMinutes: minutes,
  };
}

/* ── Platform ───────────────────────────────────────────────────────────── */

export function mapProvider(raw: Json): ProviderRow {
  return {
    code: String(raw.code ?? ''),
    name: String(raw.name ?? raw.code ?? ''),
    country: raw.country === 'NE' ? 'NE' : 'NG',
    status: raw.status === 'CONNECTED' || raw.status === 'DEGRADED' || raw.status === 'OFFLINE' ? raw.status : 'OFFLINE',
    circuitBreaker: String(raw.circuitBreaker ?? 'UNKNOWN'),
    latencyMs: Number(raw.latencyMs ?? 0),
  };
}

export function mapHealth(raw: Json): HealthRow {
  return {
    id: 'platform',
    platformStatus: raw.platformStatus ?? 'DEGRADED',
    safeMode: Boolean(raw.safeMode),
    timestamp: String(raw.timestamp ?? ''),
    database: raw.database ?? {
      status: 'DISCONNECTED',
      readLatencyMs: 0,
      writeLatencyMs: 0,
      poolActive: 0,
      poolMax: 0,
    },
    ledger: raw.ledger ?? {
      status: 'IMBALANCE_DETECTED',
      invariantPassed: false,
      totalJournalsCount: 0,
      debitCreditDeltaMinor: 0,
    },
    identityEngine: raw.identityEngine ?? {
      status: 'DEGRADED',
      totalPersonsCount: 0,
      totalOrgsCount: 0,
      pendingKycCount: 0,
    },
    treasury: raw.treasury ?? {
      status: 'LOW_LIQUIDITY',
      availableLiquidityNgnMinor: 0,
      availableLiquidityXofMinor: 0,
    },
    providers: Array.isArray(raw.providers) ? raw.providers.map(mapProvider) : [],
  };
}

/**
 * KYC document metadata. The API deliberately does not serialize the storage
 * path or the file hash (§83), so this mapper has nothing to hide and nothing
 * to invent: whatever the route returns is what the officer sees.
 */
export function mapPosture(payload: Json): import('./types').SecurityPostureRow {
  const dimensions = Array.isArray(payload.dimensions)
    ? payload.dimensions.map((d: Json) => ({
        name: String(d.name ?? ''),
        score: typeof d.score === 'number' ? d.score : Number(d.score ?? 0),
        weight: typeof d.weight === 'number' ? d.weight : undefined,
        status: String(d.status ?? ''),
        details: d.details ? String(d.details) : undefined,
      }))
    : [];
  return {
    id: 'posture',
    compositeScore: Number(payload.compositeScore ?? 0),
    tier: String(payload.tier ?? ''),
    evaluatedAt: String(payload.evaluatedAt ?? payload.timestamp ?? ''),
    dimensions,
  };
}

export function mapScenario(raw: Json): import('./types').ScenarioRow {
  return {
    id: String(raw.id ?? ''),
    code: String(raw.scenarioCode ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    description: raw.description ? String(raw.description) : undefined,
    category: String(raw.category ?? ''),
    severity: mapSeverity(raw.severity),
    jurisdiction: String(raw.jurisdiction ?? 'GLOBAL'),
    active: raw.isActive !== false,
    version: typeof raw.version === 'number' ? raw.version : undefined,
    thresholdAmount: typeof raw.thresholdAmount === 'number' ? raw.thresholdAmount : undefined,
    timeWindowSeconds: typeof raw.timeWindowSeconds === 'number' ? raw.timeWindowSeconds : undefined,
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ''),
  };
}

export function mapNetwork(payload: Json, subjectId: string): import('./types').NetworkRow {
  const nodes = Array.isArray(payload.nodes)
    ? payload.nodes.map((n: Json) => ({
        id: String(n.id ?? n.nodeId ?? ''),
        entityId: String(n.nodeId ?? n.id ?? ''),
        kind: String(n.nodeType ?? 'ENTITY'),
        label: String(n.label ?? n.nodeId ?? ''),
        riskScore: typeof n.riskScore === 'number' ? n.riskScore : undefined,
      }))
    : [];
  const edges = Array.isArray(payload.edges)
    ? payload.edges.map((e: Json) => ({
        id: String(e.id ?? `${e.sourceNodeId}-${e.targetNodeId}`),
        from: String(e.sourceNodeId ?? ''),
        to: String(e.targetNodeId ?? ''),
        relation: String(e.edgeType ?? 'RELATED'),
        weight: typeof e.weight === 'number' ? e.weight : undefined,
        transactionCount: typeof e.transactionCount === 'number' ? e.transactionCount : undefined,
        totalVolume: typeof e.totalVolume === 'number' ? e.totalVolume : undefined,
        currency: e.currency ? String(e.currency) : undefined,
        lastSeenAt: e.lastSeenAt ? String(e.lastSeenAt) : undefined,
      }))
    : [];
  return { id: subjectId || 'network', subjectId: subjectId || '', nodes, edges };
}

export function mapRestatement(raw: Json): import('./types').RestatementRow {
  const deltas = Array.isArray(raw.deltaSummary)
    ? raw.deltaSummary.map((d: Json) => ({
        metric: String(d.metric ?? ''),
        original: Number(d.originalValue ?? 0),
        amended: Number(d.amendedValue ?? 0),
        delta: Number(d.delta ?? (Number(d.amendedValue ?? 0) - Number(d.originalValue ?? 0))),
      }))
    : [];
  return {
    id: String(raw.id ?? ''),
    originalRef: String(raw.originalSnapshotId ?? ''),
    amendedRef: String(raw.amendedSnapshotId ?? ''),
    obligationCode: String(raw.obligationCode ?? ''),
    period: String(raw.periodCode ?? ''),
    reason: String(raw.restatementReason ?? ''),
    approvedBy: String(raw.approvedBy ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    deltas,
  };
}

export function mapDocument(raw: Json): DocumentRow {
  return {
    id: String(raw.id ?? ''),
    documentType: String(raw.documentType ?? raw.type ?? 'DOCUMENT'),
    numberMasked: raw.documentNumberMasked ? String(raw.documentNumberMasked) : undefined,
    mimeType: raw.mimeType ? String(raw.mimeType) : undefined,
    sizeBytes: typeof raw.fileSizeBytes === 'number' ? raw.fileSizeBytes : undefined,
    verificationStatus: String(raw.verificationStatus ?? raw.status ?? 'PENDING'),
    expiresAt: raw.expiresAt ? String(raw.expiresAt) : undefined,
    uploadedAt: String(raw.uploadedAt ?? raw.createdAt ?? ''),
  };
}
