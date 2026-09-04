// Type definitions for Consumer Protection, Complaints, Systemic Customer Harm & Regulatory Reporting

export type ComplaintCategory =
  | 'FAILED_TRANSFER'
  | 'DUPLICATE_DEBIT'
  | 'AGENT_OVERCHARGING'
  | 'AGENT_HARASSMENT'
  | 'UNAUTHORIZED_TRANSACTION'
  | 'POS_TERMINAL_GLITCH'
  | 'REFUND_DELAY'
  | 'FEE_DISPUTE'
  | 'ACCOUNT_RESTRICTION';

export type ComplaintPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type ComplaintStatus =
  | 'OPENED'
  | 'ACKNOWLEDGED'
  | 'CLASSIFIED'
  | 'ASSIGNED'
  | 'INVESTIGATING'
  | 'PENDING_CUSTOMER'
  | 'PENDING_PROVIDER'
  | 'RESOLUTION_PROPOSED'
  | 'RESOLVED'
  | 'CLOSED';

export interface ComplaintRecord {
  id: string;
  complaintReference: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  country: 'NG' | 'NE';
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  transactionReference?: string;
  paymentId?: string;
  agentId?: string;
  terminalId?: string;
  disputedAmount: number;
  currency: 'NGN' | 'XOF';
  description: string;
  assignedTo?: string;
  assignedToEmail?: string;
  slaDueAt: string;
  isSlaBreached: boolean;
  resolutionType?: string;
  resolutionNotes?: string;
  financialCompensationAmount?: number;
  glJournalId?: string;
  createdAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

export interface SystemicIncidentRecord {
  id: string;
  incidentReference: string;
  title: string;
  severity: 'SEV_1_CRITICAL' | 'SEV_2_HIGH' | 'SEV_3_MODERATE';
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'REMEDIATING' | 'RESOLVED' | 'POSTMORTEM_PUBLISHED';
  affectedProvider?: string;
  affectedCorridor?: string;
  affectedCustomersCount: number;
  affectedAgentsCount: number;
  totalFinancialExposure: number;
  currency: string;
  rootCause?: string;
  remediationPlan?: string;
  regulatoryNotified: boolean;
  regulatoryFilingReference?: string;
  startedAt: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export type ObligationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'REJECTED'
  | 'OVERDUE';

export interface RegulatoryObligation {
  id: string;
  obligationCode: string;
  jurisdiction: 'NG' | 'NE' | 'REGIONAL_UEMOA';
  regulatorName: string;
  title: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ON_EVENT';
  reportingPeriod: string;
  dueDate: string;
  status: ObligationStatus;
  responsibleDepartment: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegulatoryReportRecord {
  id: string;
  reportReference: string;
  obligationId: string;
  version: number;
  reportingPeriod: string;
  dataSnapshot: Record<string, any>;
  dataHash: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'SUBMITTED' | 'ARCHIVED';
  preparerEmail: string;
  reviewerEmail?: string;
  approverEmail?: string;
  submissionReceiptHash?: string;
  submittedAt?: string;
  createdAt: string;
}
