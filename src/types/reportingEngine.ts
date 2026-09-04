// Enterprise Regulatory Reporting, Data Warehouse, Lineage & MI Types

export type JurisdictionCode = 'NG' | 'NE' | 'GLOBAL';
export type RegulatorCode = 'CBN' | 'NFIU' | 'NDIC' | 'BCEAO' | 'CENTIF';
export type CurrencyCode = 'NGN' | 'XOF' | 'USD';

export type DataReadinessGate =
  | 'DATA_READY'
  | 'DATA_READY_WITH_WARNINGS'
  | 'DATA_NOT_READY'
  | 'DATA_BLOCKED';

export type ReportStatus =
  | 'DRAFT'
  | 'DATA_COLLECTION'
  | 'DATA_READY'
  | 'VALIDATION'
  | 'PREPARED'
  | 'REVIEW'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'RESTATED'
  | 'CLOSED';

export interface DataDictionaryEntry {
  id: string;
  metricCode: string;
  metricName: string;
  domain: string;
  businessDefinition: string;
  technicalFormula: string;
  dataOwner: string;
  dataSteward: string;
  confidentialityLevel: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED_PII';
  version: string;
  isActive: boolean;
}

export interface DataQualityRun {
  id: string;
  datasetName: string;
  overallScore: number; // e.g. 98.7
  readinessGate: DataReadinessGate;
  completenessScore: number;
  accuracyScore: number;
  reconciliationScore: number;
  consistencyScore: number;
  timelinessScore: number;
  uniquenessScore: number;
  validityScore: number;
  referentialScore: number;
  executedAt: string;
}

export interface DataLineageNode {
  id: string;
  nodeCode: string;
  nodeName: string;
  nodeType: 'REPORT_CELL' | 'METRIC' | 'DATASET' | 'MART_TABLE' | 'WAREHOUSE_FACT' | 'LEDGER_ACCOUNT' | 'TRANSACTION';
  sourceSystem: string;
}

export interface DataLineageTrace {
  reportCell: string;
  metricName: string;
  dataset: string;
  martTable: string;
  warehouseFact: string;
  sourceLedgerAccount: string;
  originatingSystem: string;
  reconciliationVerified: boolean;
}

export interface RegulatoryObligation {
  id: string;
  obligationCode: string;
  regulator: RegulatorCode;
  jurisdiction: JurisdictionCode;
  reportTitle: string;
  frequency: 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'AD_HOC';
  submissionChannel: 'API' | 'SFTP' | 'SECURE_FILE' | 'PORTAL';
  reportOwner: string;
  approverRole: string;
  status: 'ACTIVE' | 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'SUBMITTED' | 'ACKNOWLEDGED';
  nextDueDate: string;
}

export interface RegulatoryReportSnapshot {
  id: string;
  obligationCode: string;
  reportTitle: string;
  regulator: RegulatorCode;
  jurisdiction: JurisdictionCode;
  periodCode: string;
  snapshotHashSha256: string;
  reconciliationStatus: 'BALANCED' | 'IMBALANCE_DETECTED';
  makerPreparer: string;
  checkerApprover?: string;
  status: ReportStatus;
  approvedAt?: string;
  submittedAt?: string;
  acknowledgementToken?: string;
  totalAssetsNgn?: number;
  totalLiabilitiesNgn?: number;
  customerFundsNgn?: number;
  nostroLiquidityNgn?: number;
}

export interface RegulatorySubmission {
  id: string;
  snapshotId: string;
  obligationCode: string;
  idempotencyKey: string;
  submissionChannel: string;
  submittedBy: string;
  submissionRef: string;
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'REJECTED';
  acknowledgementToken?: string;
  acknowledgedAt?: string;
  submittedAt: string;
}

export interface RegulatoryRestatement {
  id: string;
  originalSnapshotId: string;
  amendedSnapshotId: string;
  obligationCode: string;
  periodCode: string;
  restatementReason: string;
  deltaSummary: {
    metric: string;
    originalValue: number;
    amendedValue: number;
    delta: number;
  }[];
  approvedBy: string;
  createdAt: string;
}

export interface ManagementKpi {
  id: string;
  kpiCode: string;
  name: string;
  domain: 'FINANCIAL' | 'PAYMENTS' | 'OPERATIONS' | 'RISK' | 'TREASURY' | 'AML';
  formula: string;
  unit: string;
  targetValue: number;
  actualValue: number;
  budgetValue: number;
  variancePct: number;
  status: 'ON_TRACK' | 'WARNING' | 'CRITICAL';
  currency: CurrencyCode;
  ownerRole: string;
}

export interface BoardReportPack {
  id: string;
  reportCode: string;
  meetingPeriod: string;
  status: 'PUBLISHED' | 'DRAFT';
  generatedBy: string;
  publishedAt: string;
  sectionsCount: number;
  openActionsCount: number;
}

export interface BoardReportAction {
  id: string;
  boardReportId: string;
  directiveTitle: string;
  assignedOwner: string;
  dueDate: string;
  priority: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ReportingAdjustment {
  id: string;
  metricCode: string;
  periodCode: string;
  previousValue: number;
  adjustedValue: number;
  adjustmentReason: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface ReportExportRecord {
  id: string;
  datasetName: string;
  exportFormat: 'PDF' | 'CSV' | 'XLSX' | 'JSON';
  requestedBy: string;
  purpose: string;
  riskAssessment: string;
  status: 'COMPLETED';
  createdAt: string;
}

export interface ExecutiveDashboardSummary {
  enterpriseDataQualityScore: number;
  regulatoryComplianceRate: number;
  reportsDueCount: number;
  reportsSubmittedCount: number;
  reportsAcknowledgedCount: number;
  pendingMakerCheckerCount: number;
  reconciliationStatus: '100% BALANCED';
  timestamp: string;
}
