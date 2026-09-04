import { SupportedLanguage } from "./customer";

export type Jurisdiction = "NG" | "NE" | "CROSS_BORDER";
export type ComplianceCountry = "NG" | "NE";
export type ComplianceCurrency = "NGN" | "XOF" | "USD" | "EUR" | "GBP";

export type ComplianceRole =
  | "MLRO"
  | "HEAD_OF_COMPLIANCE"
  | "COMPLIANCE_MANAGER"
  | "SENIOR_COMPLIANCE_OFFICER"
  | "COMPLIANCE_OFFICER"
  | "AML_ANALYST"
  | "KYC_ANALYST"
  | "KYB_ANALYST"
  | "RISK_ANALYST"
  | "AUDITOR";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ComplianceRiskLevel = RiskLevel;

export type KycTier = "TIER_1" | "TIER_2" | "TIER_3";

export type KycStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "IN_REVIEW"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "INFORMATION_REQUESTED"
  | "REQUIRES_INFO"
  | "EXPIRED"
  | "RESTRICTED";

export type KybStatus = KycStatus;

export type BusinessType =
  | "LIMITED_COMPANY"
  | "SOLE_PROPRIETORSHIP"
  | "PARTNERSHIP"
  | "NGO_NONPROFIT"
  | "GOVERNMENT_AGENCY";

export type AmlSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AmlAlertStatus =
  | "NEW"
  | "ACKNOWLEDGED"
  | "INVESTIGATING"
  | "UNDER_REVIEW"
  | "ESCALATED"
  | "CLEARED"
  | "CONVERTED_TO_CASE"
  | "DISMISSED"
  | "CLOSED";

export type SanctionsAlertStatus =
  | "POTENTIAL_MATCH"
  | "CONFIRMED_MATCH"
  | "FALSE_POSITIVE"
  | "UNDER_REVIEW";

export type CaseStatus =
  | "OPEN"
  | "ASSIGNED"
  | "UNDER_REVIEW"
  | "WAITING_FOR_INFO"
  | "ESCALATED"
  | "PENDING_DECISION"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type ComplianceCaseStatus = CaseStatus;

export type CaseType =
  | "AML_INVESTIGATION"
  | "SUSPICIOUS_ACTIVITY"
  | "SANCTIONS_MATCH"
  | "SANCTIONS_POTENTIAL_MATCH"
  | "PEP_ENHANCED_REVIEW"
  | "FRAUD_INVESTIGATION"
  | "FRAUD_VELOCITY_SPIKE"
  | "KYC_ANOMALY"
  | "KYC_IDENTITY_DISCREPANCY"
  | "ENHANCED_DILIGENCE"
  | "REGULATORY_INQUIRY"
  | "HIGH_VALUE_UNUSUAL_TRANSACTION"
  | "SAR_REGULATORY_ESCALATION"
  | "MERCHANT_DISPUTE_SPIKE"
  | "MANUAL_INVESTIGATION";

export type ComplianceCaseType = CaseType;

export type CasePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type RestrictionType =
  | "TOTAL_FREEZE"
  | "DEBIT_SUSPENSION"
  | "SETTLEMENT_HOLD"
  | "TRANSACTION_LIMIT";

export type AccountRestrictionStatus =
  | "NORMAL"
  | "ACTIVE"
  | "PENDING_MAKER_CHECKER"
  | "LIFTED"
  | "REVIEW_REQUIRED"
  | "RESTRICTED"
  | "TEMPORARILY_LIMITED"
  | "SUSPENDED"
  | "CLOSED";

export type ReportType =
  | "NFIU_CTR"
  | "NFIU_STR"
  | "CENTIF_DECLARATION"
  | "CBN_MONTHLY_AML"
  | "CBN_AML_ANNUAL"
  | "BCEAO_QUARTERLY_RISK";

export interface ComplianceOfficer {
  id: string;
  fullName: string;
  email: string;
  role: ComplianceRole;
  jurisdiction: Jurisdiction;
  country?: ComplianceCountry | "ALL";
  activeCasesCount?: number;
  assignedCasesCount?: number;
  status: "ACTIVE" | "INACTIVE";
  lastActiveAt?: string;
}

export interface DocumentVerificationItem {
  type: string;
  fileName: string;
  status: "VERIFIED" | "PENDING" | "REJECTED";
  fileUrl?: string;
  uploadedAt?: string;
}

export interface KycVerificationRecord {
  id: string;
  customerId: string;
  customerName: string;
  fullName?: string;
  email: string;
  phone: string;
  jurisdiction: Jurisdiction;
  country?: ComplianceCountry;
  tier: KycTier;
  status: KycStatus;
  riskRating: RiskLevel;
  riskLevel?: ComplianceRiskLevel;
  maskedNin: string;
  ninNumberMasked?: string;
  maskedBvn?: string;
  bvnNumberMasked?: string;
  ninVerificationStatus: string;
  bvnVerificationStatus?: string;
  address: string;
  addressVerificationStatus: string;
  documents: DocumentVerificationItem[];
  submittedAt: string;
  updatedAt?: string;
  lastReviewedAt?: string;
  assignedOfficer?: string;
  reviewOfficer?: string;
  verificationNotes?: string;
  notes?: string;
}

export type KycRecord = KycVerificationRecord;

export interface BeneficialOwner {
  name: string;
  ownershipPercentage: number;
  sharePercentage?: number;
  nationality: string;
  maskedIdNumber: string;
  bvnNinMasked?: string;
  pepStatus: boolean;
  role?: string;
}

export interface KybVerificationRecord {
  id: string;
  merchantId: string;
  businessName: string;
  tradingName?: string;
  businessType: BusinessType;
  category?: string;
  registrationNumber: string;
  taxIdentificationNumber: string;
  tinNumber?: string;
  jurisdiction: Jurisdiction;
  country?: ComplianceCountry;
  status: KycStatus;
  riskRating: RiskLevel;
  riskLevel?: ComplianceRiskLevel;
  cacValidationStatus: string;
  beneficialOwners: BeneficialOwner[];
  directors?: { name: string; bvnNinMasked: string; role: string }[];
  operatingAddress: string;
  documents: DocumentVerificationItem[];
  submittedAt: string;
  updatedAt?: string;
  lastReviewedAt?: string;
  assignedOfficer?: string;
  reviewOfficer?: string;
  verificationNotes?: string;
  notes?: string;
}

export type KybRecord = KybVerificationRecord;

export interface AmlAlert {
  id: string;
  ruleCode: string;
  ruleName: string;
  entityType: "CUSTOMER" | "AGENT" | "MERCHANT";
  entityId: string;
  entityName: string;
  entityPhone?: string;
  jurisdiction: Jurisdiction;
  country?: ComplianceCountry;
  transactionAmount: number;
  amount?: number;
  currency: string;
  severity: AmlSeverity;
  riskLevel: RiskLevel;
  status: AmlAlertStatus;
  triggerReason: string;
  triggeredAt: string;
  assignedOfficer?: string;
  dispositionNotes?: string;
  caseId?: string;
  createdAt?: string;
}

export interface SanctionsAlert {
  id: string;
  targetEntityId: string;
  targetEntityName: string;
  entityName?: string;
  entityType: "CUSTOMER" | "MERCHANT" | "AGENT";
  jurisdiction: Jurisdiction;
  watchlistName: string;
  matchedNameOnList: string;
  matchScore: number;
  matchType: "EXACT" | "FUZZY" | "PHONETIC";
  category: "TERRORISM" | "CORRUPTION" | "NARCOTICS" | "PEP" | "PROLIFERATION";
  status: SanctionsAlertStatus;
  screenedAt: string;
  screeningDate?: string;
  reviewedBy?: string;
  reviewOfficer?: string;
  dispositionNotes?: string;
  resolutionNotes?: string;
  matchedAttributes?: string[];
}

export type SanctionsMatchRecord = SanctionsAlert;

export interface CaseTimelineEntry {
  id: string;
  timestamp: string;
  officerName: string;
  actor?: string;
  role?: string;
  action: string;
  description: string;
}

export type ComplianceCaseTimelineEvent = CaseTimelineEntry;

export interface CaseEvidence {
  id: string;
  title: string;
  fileType: string;
  type?: string;
  fileUrl: string;
  reference?: string;
  uploadedByOfficer: string;
  uploader?: string;
  uploadedAt: string;
  notes?: string;
  fileSizeMasked?: string;
}

export type ComplianceCaseEvidence = CaseEvidence;

export interface CaseNote {
  id: string;
  timestamp: string;
  officerName: string;
  content: string;
  isConfidential: boolean;
}

export interface CaseDecision {
  isResolved: boolean;
  resolvedAt?: string;
  makerOfficerId?: string;
  checkerOfficerId?: string;
  rulingSummary?: string;
  requiresNfiuCentifFiling?: boolean;
}

export interface ComplianceCase {
  id: string;
  caseNumber: string;
  caseType: CaseType;
  type?: ComplianceCaseType;
  title: string;
  targetEntityType: "CUSTOMER" | "AGENT" | "MERCHANT";
  entityType?: "CUSTOMER" | "AGENT" | "MERCHANT";
  targetEntityId: string;
  entityId?: string;
  targetEntityName: string;
  entityName?: string;
  jurisdiction: Jurisdiction;
  country?: ComplianceCountry;
  riskLevel: RiskLevel;
  priority: CasePriority;
  status: CaseStatus;
  assignedOfficerId: string;
  assignedOfficerName: string;
  assignedOfficer?: string;
  createdAt: string;
  updatedAt: string;
  deadlineSla: string;
  deadline?: string;
  summary: string;
  involvedAmount: number;
  currency: string;
  relatedAlertIds: string[];
  timeline: CaseTimelineEntry[];
  evidence: CaseEvidence[];
  internalNotes: (CaseNote | string)[];
  decision: CaseDecision;
  restrictionApplied?: AccountRestrictionStatus;
  sarFiled?: boolean;
  sarReference?: string;
}

export interface AccountRestriction {
  id: string;
  targetEntityType: "CUSTOMER" | "MERCHANT" | "AGENT";
  targetEntityId: string;
  targetEntityName: string;
  jurisdiction: Jurisdiction;
  restrictionType: RestrictionType;
  reason: string;
  rationale: string;
  courtOrderReference?: string;
  limitAmount?: number;
  makerOfficerId: string;
  makerOfficerName: string;
  checkerOfficerId?: string;
  checkerOfficerName?: string;
  status: "ACTIVE" | "PENDING_MAKER_CHECKER" | "LIFTED";
  approvalStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  appliedAt: string;
  liftedAt?: string;
  liftedByOfficerId?: string;
  liftReason?: string;
}

export interface RealtimeRiskTelemetry {
  id: string;
  transactionId: string;
  originEntityName: string;
  destinationEntityName: string;
  amount: number;
  currency: string;
  riskScore: number;
  ruleDecision: "PASS" | "FLAG" | "BLOCK";
  timestamp: string;
  node: string;
}

export type TransactionMonitoringRecord = RealtimeRiskTelemetry;

export interface RegulatoryReport {
  id: string;
  reportType: ReportType;
  reportReference?: string;
  regulator: "NFIU" | "CENTIF" | "CBN" | "BCEAO";
  jurisdiction: Jurisdiction | "NIGERIA_NFIU" | "NIGER_CENTIF";
  reportingPeriod: string;
  entityName?: string;
  includedTransactionCount: number;
  totalValueReported: number;
  totalInvolvedAmount?: number;
  currency: string;
  filingStatus: "DRAFT" | "READY_FOR_SUBMISSION" | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "PENDING_MLRO_APPROVAL" | "ACKNOWLEDGED";
  submissionStatus?: string;
  submissionDate?: string;
  submittedByOfficer?: string;
  preparedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  acknowledgementRef?: string;
  createdAt?: string;
}

export interface CompliancePolicy {
  id: string;
  title: string;
  code: string;
  version: string;
  jurisdiction?: Jurisdiction;
  ownerRole?: ComplianceRole;
  approvedBy?: string;
  effectiveDate: string;
  nextReviewDate: string;
  status: "ACTIVE" | "IN_REVIEW" | "ARCHIVED";
  summary: string;
  documentUrl?: string;
}

export interface ComplianceCalendarEvent {
  id: string;
  title: string;
  regulator: string;
  jurisdiction: Jurisdiction | "NIGERIA" | "NIGER_REPUBLIC" | "REGIONAL_UEMOA";
  dueDate: string;
  status: "UPCOMING" | "OVERDUE" | "COMPLETED" | "DUE_SOON";
  priority?: "HIGH" | "CRITICAL" | "NORMAL";
  category?: string;
  assignedTo?: string;
  description: string;
}

export type ComplianceObligationCalendarItem = ComplianceCalendarEvent;

export interface ComplianceAuditEntry {
  id: string;
  timestamp: string;
  officerId: string;
  officerName: string;
  officerRole: ComplianceRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  jurisdiction: Jurisdiction;
  actor?: string;
  actorRole?: ComplianceRole;
  reason?: string;
  correlationId?: string;
  ipAddressMasked?: string;
}

export type ComplianceAuditLogEntry = ComplianceAuditEntry;
