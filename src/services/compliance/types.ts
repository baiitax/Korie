/**
 * Compliance portal view models.
 *
 * Records are mapped from real engine contracts (`AmlAlertRecord`,
 * `AmlCaseRecord`, `PersonMasterRecord`, `OrganizationMasterRecord`,
 * `DeepHealthReport`, …) into the narrow shape a screen renders. Fields that no
 * backend supplies are `undefined` and the UI prints "Not reported" — the portal
 * never fills a gap with a plausible-looking number.
 */

import type { DeepHealthReport } from '@/types/resilienceEngine';

export type ComplianceSource = 'live' | 'demo';

export type ComplianceResourceStatus =
  | 'ready'
  | 'empty'
  | 'error'
  | 'unauthorized'
  | 'unavailable';

/**
 * Every resource a screen may ask the service for. `endpoints.ts` decides which
 * of these have a live source; the list itself is the contract.
 */
export type ComplianceResourceKey =
  | 'dashboard'
  | 'customers'
  | 'kyc'
  | 'documents'
  | 'kyb'
  | 'alerts'
  | 'alertDetail'
  | 'cases'
  | 'caseDetail'
  | 'transactions'
  | 'sanctions'
  | 'watchlists'
  | 'restrictions'
  | 'telemetry'
  | 'reports'
  | 'restatements'
  | 'scenarios'
  | 'posture'
  | 'network'
  | 'policies'
  | 'calendar'
  | 'audit'
  | 'officers'
  | 'approvals'
  | 'escalations'
  | 'integrations'
  | 'systemHealth'
  | 'tasks'
  | 'notifications';

export interface ComplianceMutationResult<T = unknown> {
  ok: boolean;
  /** False for demo-store mutations: the UI must say \"nothing was recorded\". */
  recorded: boolean;
  source: ComplianceSource;
  value?: T;
  error?: ComplianceIssue;
}

export interface ComplianceIssue {
  code: string;
  message: string;
  /** What the officer can actually do next, rendered inside the error state. */
  hint?: string;
}

export interface ComplianceResource<T> {
  status: ComplianceResourceStatus;
  data: T[];
  total: number;
  source: ComplianceSource;
  /** Live call failed and the demo set was substituted (demo builds only). */
  demoFallback: boolean;
  /** Derived screens say so explicitly instead of pretending to be a feed. */
  derived?: boolean;
  requestId?: string;
  latencyMs: number;
  error?: ComplianceIssue;
}

/* ── Due diligence ──────────────────────────────────────────────────────── */

export interface CustomerRow {
  id: string;
  /** KID-NG-884210 — the identifier that is safe to quote in an email. */
  identityReference: string;
  fullName: string;
  countryCode: 'NG' | 'NE' | string;
  phone: string;
  email: string;
  kycTier: string;
  kycStatus: string;
  identityStatus: string;
  riskLevel: string;
  /** AML profile from AmlCustomerRiskProfileEngine; undefined until it answers. */
  amlProfile?: {
    riskScore?: number;
    highRiskFlags?: string[];
    lastScreenedAt?: string;
  };
  updatedAt: string;
  /** Kept because a compliance file must be able to prove it matched the right human. */
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  createdAt?: string;
  /** Account rails are internal: officers see the state, never the rail. */
  hasOpenAlerts?: boolean;
  openCaseCount?: number;
}

export interface KycRow {
  id: string;
  identityReference: string;
  customerName: string;
  tier: string;
  status: string;
  riskLevel: string;
  countryCode: string;
  submittedAt: string;
  updatedAt: string;
  ninMasked?: string;
  bvnMasked?: string;
  /**
   * Only stated when the identity-scoped document read answered for this
   * person. `/api/core/v1/identity/documents` requires an `identityId` and the
   * `kyc:verify` scope, so a list view cannot know the count for everyone —
   * reporting `0` would be inventing a fact, and in KYC a zero means "no
   * evidence on file". `undefined` renders as "Not reported".
   */
  documentCount?: number;
  verifiedDocumentCount?: number;
  oldestPendingDays?: number;
  assignedOfficer?: string;
}

export interface KybRow {
  id: string;
  identityReference: string;
  legalName: string;
  tradingName?: string;
  registrationNumber: string;
  taxIdentifier?: string;
  businessType: string;
  industry?: string;
  countryCode: string;
  kybStatus: string;
  entityStatus: string;
  riskLevel: string;
  beneficialOwnersCount: number;
  updatedAt: string;
}

/* ── Financial crime ────────────────────────────────────────────────────── */

export interface AlertRow {
  id: string;
  reference: string;
  scenarioCode?: string;
  subjectName: string;
  subjectId: string;
  subjectType: 'CUSTOMER' | 'AGENT' | 'MERCHANT';
  severity: string;
  status: string;
  /** Major units — the engine stores NGN 4,850,000 as 4850000, not 485000000. */
  amount: number;
  currency: string;
  jurisdiction: string;
  transactionReference?: string;
  whatHappened?: string;
  whySuspicious?: string;
  whoInvolved?: string;
  howPatternDetected?: string;
  assignedTo?: string;
  slaDueAt?: string;
  slaBreached: boolean;
  triggeredAt: string;
  caseId?: string;
}

export interface CaseRow {
  id: string;
  reference: string;
  title: string;
  subjectId: string;
  subjectName: string;
  jurisdiction: string;
  priority: string;
  status: string;
  /** Major units, same convention as the alert rows. */
  exposureAmount: number;
  currency: string;
  leadInvestigator: string;
  assignedTeam?: string;
  alertCount: number;
  noteCount: number;
  finalDecision?: string;
  decisionMaker?: string;
  decisionChecker?: string;
  decisionNotes?: string;
  decidedAt?: string;
  slaDueAt?: string;
  slaBreached: boolean;
  createdAt: string;
  closedAt?: string;
}

export interface MonitoringRow {
  id: string;
  reference: string;
  decision: string;
  riskScore?: number;
  riskBand?: string;
  reason?: string;
  signals: { code: string; weight?: number; description?: string }[];
  amount?: number;
  currency?: string;
  /** The risk engine identifies subjects by id only; the UI labels it so. */
  subjectId?: string;
  subjectName?: string;
  policyVersion?: string;
  modelVersion?: string;
  evaluationLatencyMs?: number;
  createdAt: string;
  /** True when the outcome kept the flow on hold. */
  held: boolean;
}

/* ── Enforcement & governance ───────────────────────────────────────────── */

export interface RestrictionRow {
  id: string;
  subjectType: string;
  subjectId: string;
  subjectName: string;
  type: string;
  reason: string;
  status: string;
  appliedAt?: string;
  expiresAt?: string;
  makerName?: string;
  checkerName?: string;
  courtOrderReference?: string;
}

export interface ApprovalRow {
  id: string;
  reference: string;
  kind: string;
  requester: string;
  requestedAccess: string;
  reason?: string;
  status: string;
  requestedAt: string;
  expiresAt?: string;
  decidedBy?: string;
  ticket?: string;
  /** Minutes of elevation granted — from the request, not assumed. */
  durationMinutes?: number;
}

export interface EscalationRow {
  id: string;
  reference: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  raisedAt: string;
  slaDueAt?: string;
  slaBreached?: boolean;
  assignedTo?: string;
  channel?: string;
  description?: string;
  amount?: number;
  currency?: string;
  linkedRef?: string;
  jurisdiction?: string;
}

export interface ReportRow {
  id: string;
  reference: string;
  reportType: string;
  regulator: string;
  period: string;
  dueDate: string;
  status: string;
  submittedAt?: string;
  approvedAt?: string;
  acknowledgement?: string;
  recordCount?: number;
  maker?: string;
  checker?: string;
  reconciliation?: string;
  /** Tamper-evidence hash of the snapshot actually filed — safe to display. */
  snapshotHash?: string;
  financials?: { label: string; amount: number; currency: string }[];
  obligationCode?: string;
  jurisdiction?: string;
}

export interface PostureDimension {
  name: string;
  score: number;
  weight?: number;
  status: string;
  details?: string;
}

export interface SecurityPostureRow {
  id: string;
  compositeScore: number;
  tier: string;
  evaluatedAt: string;
  dimensions: PostureDimension[];
}

export interface ScenarioRow {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  severity: string;
  jurisdiction: string;
  active: boolean;
  version?: number;
  /** Major units, as the scenario engine stores them. */
  thresholdAmount?: number;
  timeWindowSeconds?: number;
  updatedAt: string;
}

export interface NetworkNode {
  id: string;
  entityId: string;
  kind: string;
  label: string;
  riskScore?: number;
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  weight?: number;
  transactionCount?: number;
  /** Major units. */
  totalVolume?: number;
  currency?: string;
  lastSeenAt?: string;
}

export interface NetworkRow {
  id: string;
  subjectId: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface RestatementRow {
  id: string;
  originalRef: string;
  amendedRef: string;
  obligationCode: string;
  period: string;
  reason: string;
  approvedBy: string;
  createdAt: string;
  /** Minor units, exactly as the reporting engine stores them. */
  deltas: { metric: string; original: number; amended: number; delta: number }[];
}

export interface ObligationRow {
  id: string;
  title: string;
  regulator: string;
  dueDate: string;
  frequency?: string;
  status: string;
  owner?: string;
  channel?: string;
  approverRole?: string;
  jurisdiction?: string;
  code?: string;
}

export interface DocumentRow {
  id: string;
  documentType: string;
  /** The API only ever returns the masked number; the portal never asks for more. */
  numberMasked?: string;
  mimeType?: string;
  sizeBytes?: number;
  verificationStatus: string;
  expiresAt?: string;
  uploadedAt?: string;
}

export interface TaskRow {
  id: string;
  title: string;
  kind: 'ALERT_TRIAGE' | 'CASE_REVIEW' | 'DECISION_CHECK' | 'OBLIGATION' | 'INFORMATION_REQUEST' | 'APPROVAL';
  subjectRef?: string;
  href: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  dueAt?: string;
  overdue: boolean;
  assignedTo?: string;
  source: ComplianceSource;
}

export interface PolicyRow {
  id: string;
  title: string;
  category: string;
  version: string;
  status: string;
  effectiveDate?: string;
  nextReviewDate?: string;
  owner?: string;
}

export interface AuditRow {
  id: string;
  action: string;
  actor: string;
  entityType: string;
  entityId: string;
  at: string;
  ip?: string;
  integrity?: string;
  summary?: string;
}

export interface OfficerRow {
  id: string;
  name: string;
  email: string;
  role: string;
  jurisdiction: string;
  status: string;
  queueLoad?: number;
}

/* ── Platform ───────────────────────────────────────────────────────────── */

export interface ProviderRow {
  code: string;
  name: string;
  country: 'NG' | 'NE';
  status: 'CONNECTED' | 'DEGRADED' | 'OFFLINE';
  circuitBreaker: string;
  latencyMs: number;
}

export interface HealthRow {
  id: string;
  platformStatus: DeepHealthReport['platformStatus'];
  safeMode: boolean;
  timestamp: string;
  database: DeepHealthReport['database'];
  ledger: DeepHealthReport['ledger'];
  identityEngine: DeepHealthReport['identityEngine'];
  treasury: DeepHealthReport['treasury'];
  providers: ProviderRow[];
}

export interface WatchlistRow {
  id: string;
  name: string;
  authority: string;
  kind: 'SANCTIONS' | 'PEP' | 'ADVERSE_MEDIA' | 'DOMESTIC';
  recordCount: number;
  lastRefreshedAt?: string;
  refreshFrequency?: string;
  status: string;
  /** Always true for this module today: there is no list-management API. */
  readOnly: boolean;
}

/* ── Notification centre (derived, never invented) ──────────────────────── */

export interface NotificationRow {
  id: string;
  kind: 'CRITICAL' | 'ATTENTION' | 'INFORMATIONAL';
  title: string;
  body: string;
  href: string;
  at: string;
  /** Derived from live queue state — used to explain where it came from. */
  sourceLabel: string;
}

export interface DashboardSummary {
  id: string;
  criticalAlerts: number;
  slaBreached: number;
  openCases: number;
  /** Unsettled alerts — the rail badge for the Alerts queue. */
  openAlerts: number;
  /** Items on the officer's work list right now. */
  taskCount: number;
  awaitingDecision: number;
  pendingApprovals: number;
  /** Undefined until a sanctions read endpoint exists — the card then says "not connected". */
  sanctionsPotentialMatches?: number;
  kycBacklog: number;
  kybBacklog: number;
  highRiskCustomers: number;
  highRiskBusinesses: number;
  overdueObligations: number;
  highRiskEntities: number;
  platformStatus?: DeepHealthReport['platformStatus'];
  providersOffline: number;
  queueOldestHours?: number;
  alertMix: { label: string; value: number }[];
  /**
   * NGN and XOF are never added together — a single "exposure" figure across
   * both currencies would be a made-up number. Volume is the chart; each
   * currency keeps its own total.
   */
  volumeByDay: { date: string; count: number; ngnAmount: number; xofAmount: number }[];
  totalNgnAmount: number;
  totalXofAmount: number;
}

/** Every typed row the service can hand back, keyed by resource. */
export interface ComplianceResourceMap {
  customers: CustomerRow;
  kyc: KycRow;
  documents: DocumentRow;
  kyb: KybRow;
  alerts: AlertRow;
  alertDetail: AlertRow;
  cases: CaseRow;
  caseDetail: CaseRow;
  telemetry: MonitoringRow;
  transactions: MonitoringRow;
  restrictions: RestrictionRow;
  sanctions: import('@/types/compliance').SanctionsAlert;
  watchlists: WatchlistRow;
  reports: ReportRow;
  restatements: RestatementRow;
  scenarios: ScenarioRow;
  posture: SecurityPostureRow;
  network: NetworkRow;
  calendar: ObligationRow;
  audit: AuditRow;
  officers: OfficerRow;
  policies: PolicyRow;
  approvals: ApprovalRow;
  escalations: EscalationRow;
  integrations: ProviderRow;
  systemHealth: HealthRow;
  tasks: TaskRow;
  notifications: NotificationRow;
  dashboard: DashboardSummary;
}
