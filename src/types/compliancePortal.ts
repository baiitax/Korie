/**
 * Compliance Command Center — portal demo model (UI data contract).
 * Extends the repo's core compliance vocabulary (see types/compliance.ts) with the
 * operational surfaces required by the portal demo: customers, accounts,
 * transactions, unified alerts, screening matches, watchlists, tasks, approvals,
 * escalations, reports, audit entries, integrations and health.
 *
 * Every UI page consumes these types through the compliance portal context so the
 * demo-data service layer can later be swapped for live API adapters.
 */
import {
  ComplianceCountry,
  ComplianceRole,
  Jurisdiction,
  KycStatus,
  KybStatus,
  KycTier,
  BusinessType,
  RiskLevel,
  AmlSeverity,
  CasePriority,
  CaseType,
  CaseStatus,
} from './compliance';

export type PortalLocale = 'en' | 'fr' | 'ha';

/* ------------------------------------------------------------------ */
/* Customers & their compliance universe                               */
/* ------------------------------------------------------------------ */

export type AccountStatus = 'ACTIVE' | 'DORMANT' | 'FROZEN' | 'RESTRICTED';
export type CustomerAccountStatus = AccountStatus;

export interface PortalAccount {
  id: string;
  label: string;
  kind: 'WALLET' | 'VIRTUAL_ACCOUNT' | 'VAULT';
  currency: 'XOF' | 'NGN';
  status: AccountStatus;
  openedAt: string;
  balance: number;
  riskLevel?: RiskLevel;
}

export type PortalDocStatus = 'VERIFIED' | 'PENDING' | 'REJECTED' | 'EXPIRED' | 'NEEDS_REVIEW';

export interface PortalDoc {
  id: string;
  docType: string; // e.g. National ID (CNI), NIN Slip, Passport…
  category: 'IDENTITY' | 'ADDRESS' | 'BIOMETRIC' | 'CORPORATE' | 'FINANCIAL';
  refMasked: string;
  country?: ComplianceCountry;
  status: PortalDocStatus;
  method: 'AUTOMATED' | 'MANUAL';
  score?: number; // identity match score 0-100
  verifiedAt?: string;
  submittedAt: string;
  notes?: string;
}

export interface PortalCustomer {
  id: string;
  firstName: string;
  lastName: string;
  country: ComplianceCountry;
  currency: 'XOF' | 'NGN';
  city: string;
  occupation?: string;
  customerSince: string;
  lastActivityAt: string;
  phoneMasked: string;
  emailMasked: string;
  idNumberMasked: string;
  kycTier: KycTier;
  verificationStatus: KycStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  accountStatus: CustomerAccountStatus;
  openAlerts: number;
  openCases: number;
  sanctionsMatches: number;
  pepMatches: number;
  accounts: PortalAccount[];
  documents: PortalDoc[];
  screeningClean?: boolean;
}

/* ------------------------------------------------------------------ */
/* KYC / KYB applications                                              */
/* ------------------------------------------------------------------ */

export type ScreeningSummary = 'CLEAN' | 'POTENTIAL_MATCH' | 'CONFIRMED_MATCH';

export interface PortalKycApplication {
  id: string;
  customerId: string;
  customerName: string;
  country: ComplianceCountry;
  currency: 'XOF' | 'NGN';
  tier: KycTier;
  status: KycStatus;
  submittedAt: string;
  updatedAt: string;
  riskLevel: RiskLevel;
  riskScore: number;
  reviewerName?: string;
  emailMasked: string;
  phoneMasked: string;
  ninMasked?: string;
  bvnMasked?: string;
  addressStatus: 'VERIFIED' | 'PENDING' | 'UNVERIFIED';
  documents: PortalDoc[];
  screening: { sanctions: ScreeningSummary; pep: ScreeningSummary };
  notes?: string;
  decisionAt?: string;
  decisionReason?: string;
}

export interface KybDirector {
  name: string;
  role: string;
  idMasked: string;
  riskLevel: RiskLevel;
}

export interface PortalKybApplication {
  id: string;
  customerId?: string;
  businessName: string;
  regNumberMasked: string;
  country: ComplianceCountry;
  businessType: BusinessType;
  industry?: string;
  status: KybStatus;
  submittedAt: string;
  updatedAt: string;
  riskLevel: RiskLevel;
  riskScore: number;
  reviewerName?: string;
  directors: KybDirector[];
  documents: PortalDoc[];
  screening: { sanctions: ScreeningSummary; pep: ScreeningSummary };
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* Transaction monitoring                                              */
/* ------------------------------------------------------------------ */

export type TxnChannel =
  | 'CROSS_BORDER'
  | 'WALLET_TRANSFER'
  | 'AGENT_CASH_IN'
  | 'AGENT_CASH_OUT'
  | 'QR_PAYMENT'
  | 'BILL_PAYMENT'
  | 'FX_CONVERSION';

export type TxnNode = 'CORIS_BANK_NE' | 'PROVIDUS_BANK_NG' | 'KORIEPAY_RAILS';
export type TxnDecision = 'PASS' | 'FLAG' | 'REVIEW' | 'BLOCK';
export type TxnStatus = 'SETTLED' | 'PENDING' | 'FLAGGED' | 'BLOCKED';

export interface TxnRuleHit {
  code: string;
  name: string;
  severity: AmlSeverity;
  description: string;
}

export interface PortalTxn {
  id: string;
  customerId: string;
  customerName: string;
  counterpartyMasked: string;
  direction: 'IN' | 'OUT';
  amount: number;
  currency: 'XOF' | 'NGN';
  channel: TxnChannel;
  node: TxnNode;
  riskScore: number;
  riskLevel: RiskLevel;
  decision: TxnDecision;
  status: TxnStatus;
  timestamp: string;
  narration?: string;
  rulesTriggered: TxnRuleHit[];
  alertId?: string;
  relatedTxnIds?: string[];
}

/* ------------------------------------------------------------------ */
/* Unified alerts + screening matches + watchlists                     */
/* ------------------------------------------------------------------ */

export type AlertKind = 'AML' | 'SCREENING' | 'FRAUD' | 'RISK';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'DISMISSED';

export interface AlertTimelineItem {
  at: string;
  text: string;
  by?: string;
}

export interface PortalAlert {
  id: string;
  kind: AlertKind;
  severity: AmlSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  customerId?: string;
  customerName?: string;
  country?: ComplianceCountry;
  amount?: number;
  currency?: 'XOF' | 'NGN';
  channel?: string;
  ruleCode?: string;
  triggeredAt: string;
  slaAt?: string;
  assignedTo?: string;
  notes?: string;
  evidence: string[];
  timeline: AlertTimelineItem[];
  relatedCaseNumber?: string;
}

export type ScreeningMatchKind = 'SANCTIONS' | 'PEP';
export type ScreeningMatchStatus = 'POTENTIAL_MATCH' | 'UNDER_REVIEW' | 'CONFIRMED_MATCH' | 'FALSE_POSITIVE';

export interface ScreeningMatch {
  id: string;
  kind: ScreeningMatchKind;
  listName: string;
  customerId: string;
  customerName: string;
  country: ComplianceCountry;
  matchedFields: string[];
  score: number; // 0-100
  status: ScreeningMatchStatus;
  triggeredAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  relatedAlertId?: string;
}

export type WatchlistStatus = 'SYNCED' | 'UPDATING' | 'ERROR';

export interface Watchlist {
  id: string;
  name: string;
  source: string;
  jurisdiction: 'GLOBAL' | ComplianceCountry | 'CROSS_BORDER';
  records: number;
  updatedAt: string;
  status: WatchlistStatus;
  screenings24h: number;
  matches24h: number;
}

/* ------------------------------------------------------------------ */
/* Operations: tasks, approvals, escalations                           */
/* ------------------------------------------------------------------ */

export interface PortalTask {
  id: string;
  kind: 'KYC_REVIEW' | 'CASE_REVIEW' | 'ALERT_REVIEW' | 'SCREENING_REVIEW' | 'APPROVAL' | 'DOC_REQUEST' | 'FOLLOW_UP' | 'REPORT';
  title: string;
  customerId?: string;
  customerName?: string;
  dueAt: string;
  priority: CasePriority;
  status: 'OPEN' | 'IN_PROGRESS' | 'OVERDUE' | 'DONE';
  assigneeId: string;
  assigneeName: string;
  createdAt: string;
  relatedRef?: string;
}

export type ApprovalType =
  | 'KYC_OVERRIDE'
  | 'RISK_OVERRIDE'
  | 'ACCOUNT_RESTRICTION'
  | 'CASE_RESOLUTION'
  | 'ESCALATION'
  | 'SAR_FILING'
  | 'UNFREEZE';

export interface PortalApproval {
  id: string;
  type: ApprovalType;
  title: string;
  summary: string;
  customerId?: string;
  customerName?: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  priority: CasePriority;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  decidedById?: string;
  decidedByName?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export type EscalationLevel = 'CRITICAL' | 'MANAGEMENT' | 'REGULATORY' | 'RISK' | 'OPERATIONAL';

export interface PortalEscalation {
  id: string;
  level: EscalationLevel;
  title: string;
  summary: string;
  raisedById: string;
  raisedByName: string;
  assignedRole: ComplianceRole | 'REGULATORY_LIAISON';
  customerId?: string;
  customerName?: string;
  refs: string[];
  createdAt: string;
  slaAt: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  resolutionNote?: string;
}

/* ------------------------------------------------------------------ */
/* Reports / audit / integrations / health                             */
/* ------------------------------------------------------------------ */

export type ReportKind = 'KYC' | 'KYB' | 'AML' | 'RISK' | 'TRANSACTION_MONITORING' | 'SANCTIONS' | 'CASES' | 'AUDIT';

export interface PortalReportDef {
  id: string;
  kind: ReportKind;
  title: string;
  description: string;
  cadence: string;
  lastGeneratedAt?: string;
  status: 'READY' | 'SCHEDULED' | 'NOT_GENERATED';
  formats: string[];
}

export interface PortalAuditEntry {
  id: string;
  at: string;
  officerId: string;
  officerName: string;
  officerRole: ComplianceRole;
  action: string;
  resource: string;
  resourceId: string;
  result: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  sessionMasked: string;
  detail?: string;
  before?: Record<string, string | number | boolean>;
  after?: Record<string, string | number | boolean>;
}

export interface PortalIntegration {
  id: string;
  provider: string;
  purpose: string;
  kind: 'KYC' | 'AML' | 'SCREENING' | 'PAYMENT' | 'NOTIFICATION' | 'DATA';
  country: 'NG' | 'NE' | 'NG+NE';
  status: 'CONNECTED' | 'DEGRADED' | 'ERROR' | 'PAUSED';
  lastSyncAt: string;
  latencyMs?: number;
  webhookPath: string;
  authMode: 'API_KEY' | 'OAUTH' | 'MTLS';
}

export type HealthStatus = 'OPERATIONAL' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';

export interface PortalHealthService {
  id: string;
  name: string;
  category: string;
  status: HealthStatus;
  latencyMs?: number;
  lastCheckAt: string;
  detail?: string;
}

export interface PortalActivityItem {
  id: string;
  at: string;
  actorName: string;
  actorRole?: string;
  type: 'KYC' | 'KYB' | 'AML' | 'SCREENING' | 'CASE' | 'RESTRICTION' | 'SYSTEM' | 'REPORT' | 'APPROVAL';
  headline: string;
  sub?: string;
  href?: string;
  tone: RiskLevel | 'OK';
}

/* AML rule catalogue (display only — no rule editing without backend) */
export interface AmlRule {
  code: string;
  name: string;
  kind: 'VELOCITY' | 'STRUCTURING' | 'GEO_ANOMALY' | 'COUNTERPARTY' | 'AMOUNT' | 'BEHAVIOUR';
  severity: AmlSeverity;
  active: boolean;
  triggered30d: number;
  description: string;
}

/* Portal case (investigations) */
export interface PortalCase {
  id: string;
  caseNumber: string;
  caseType: CaseType;
  title: string;
  customerId?: string;
  customerName?: string;
  jurisdiction: Jurisdiction;
  riskLevel: RiskLevel;
  priority: CasePriority;
  status: CaseStatus;
  assignedOfficerId: string;
  assignedOfficerName: string;
  createdAt: string;
  updatedAt: string;
  deadlineSla: string;
  summary: string;
  amount?: number;
  currency?: 'XOF' | 'NGN';
  relatedAlertIds: string[];
  timeline: AlertTimelineItem[];
  notes: string[];
  decisionSummary?: string;
}
