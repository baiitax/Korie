// Type definitions for Tier-1 AML Transaction Monitoring, Cases, Graph & STR Filings

export type AmlSeverity = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';

export type AmlAlertStatus =
  | 'NEW'
  | 'QUEUED'
  | 'ASSIGNED'
  | 'IN_REVIEW'
  | 'ESCALATED'
  | 'FALSE_POSITIVE'
  | 'DISMISSED'
  | 'CONVERTED_TO_CASE'
  | 'CLOSED';

export type AmlCaseStatus =
  | 'OPEN'
  | 'TRIAGE'
  | 'INVESTIGATION'
  | 'INFORMATION_REQUESTED'
  | 'ESCALATED'
  | 'DECISION_PENDING'
  | 'ACTION_PENDING'
  | 'CLOSED';

export type AmlScenarioCategory =
  | 'STRUCTURING'
  | 'VELOCITY'
  | 'PASS_THROUGH'
  | 'DORMANT_REACTIVATION'
  | 'CASH_ANOMALY'
  | 'GRAPH_CIRCULAR'
  | 'MULE_RING'
  | 'CROSS_BORDER_FX';

export interface AmlScenarioRecord {
  id: string;
  scenarioCode: string;
  name: string;
  description: string;
  category: AmlScenarioCategory;
  severity: AmlSeverity;
  jurisdiction: 'GLOBAL' | 'NG' | 'NE';
  isActive: boolean;
  version: number;
  thresholdAmount?: number;
  timeWindowSeconds: number;
  ruleConfig?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AmlAlertRecord {
  id: string;
  alertReference: string;
  scenarioId: string;
  scenarioCode: string;
  scenarioVersion: number;
  customerId: string;
  customerName?: string;
  accountId?: string;
  transactionId?: string;
  transactionReference?: string;
  severity: AmlSeverity;
  status: AmlAlertStatus;
  disputedOrTriggeredAmount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  whatHappened: string;
  whySuspicious: string;
  whoInvolved: string;
  howPatternDetected: string;
  featureSnapshot: Record<string, any>;
  assignedTo?: string;
  slaDueAt: string;
  isSlaBreached: boolean;
  caseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AmlCaseRecord {
  id: string;
  caseReference: string;
  title: string;
  primaryCustomerId: string;
  primaryCustomerName?: string;
  jurisdiction: 'NG' | 'NE';
  priority: AmlSeverity;
  status: AmlCaseStatus;
  totalExposureAmount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  leadInvestigator: string;
  assignedTeam: string;
  finalDecision?: string;
  decisionNotes?: string;
  decisionMaker?: string;
  decisionChecker?: string;
  decidedAt?: string;
  slaDueAt: string;
  createdAt: string;
  closedAt?: string;
  alerts?: AmlAlertRecord[];
  notes?: AmlCaseNote[];
  evidence?: AmlCaseEvidence[];
}

export interface AmlCaseNote {
  id: string;
  caseId: string;
  authorEmail: string;
  noteType: string;
  content: string;
  createdAt: string;
}

export interface AmlCaseEvidence {
  id: string;
  caseId: string;
  evidenceName: string;
  fileHash: string;
  mimeType: string;
  storagePath: string;
  uploadedBy: string;
  chainOfCustodyNotes?: string;
  createdAt: string;
}

export interface AmlGraphNode {
  id: string;
  nodeId: string;
  nodeType: 'CUSTOMER' | 'ACCOUNT' | 'BENEFICIARY' | 'DEVICE' | 'AGENT' | 'MERCHANT' | 'IP_ADDRESS';
  label: string;
  riskScore: number;
  metadata?: Record<string, any>;
}

export interface AmlGraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: 'TRANSFERRED_TO' | 'SHARED_DEVICE' | 'SHARED_PHONE' | 'SHARED_BENEFICIARY' | 'AGENT_SERVICED';
  weight: number;
  transactionCount: number;
  totalVolume: number;
  lastSeenAt: string;
}

export interface AmlRegulatoryStrFiling {
  id: string;
  filingReference: string;
  caseId: string;
  jurisdiction: 'NG' | 'NE';
  regulatorName: string;
  typologyClassification: string;
  reportedVolume: number;
  currency: string;
  narrativeSummary: string;
  status: 'DRAFT' | 'READY_FOR_APPROVAL' | 'APPROVED_BY_MLRO' | 'TRANSMITTED_TO_REGULATOR' | 'ACKNOWLEDGED';
  preparedBy: string;
  mlroApprover?: string;
  submissionReceiptHash?: string;
  transmittedAt?: string;
  createdAt: string;
}
