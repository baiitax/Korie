export type SupportJurisdiction = "NG" | "NE" | "CROSS_BORDER";

export type SupportRole =
  | "TIER_1_JUNIOR"
  | "TIER_2_SENIOR"
  | "TIER_3_FINANCE"
  | "TIER_3_FRAUD"
  | "TIER_3_COMPLIANCE"
  | "TIER_3_TECH_OPS"
  | "SUPPORT_SUPERVISOR"
  | "SUPPORT_MANAGER"
  | "SUPPORT_READ_ONLY"
  | "SUPER_ADMIN";

export type SupportTier =
  | "TIER_0_AUTOMATION"
  | "TIER_1_JUNIOR"
  | "TIER_2_SENIOR"
  | "TIER_3_SPECIALIST"
  | "MANAGEMENT";

export type TicketStatus =
  | "NEW"
  | "TRIAGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "WAITING_FOR_INTERNAL_TEAM"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type TicketCategory =
  | "TRANSFER"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "AIRTIME"
  | "DATA"
  | "BILLS"
  | "CARD"
  | "AGENT_FLOAT"
  | "MERCHANT_SETTLEMENT"
  | "WALLET"
  | "REFUND"
  | "FAILED_TRANSACTION"
  | "PENDING_TRANSACTION"
  | "REVERSAL"
  | "KYC_TIER"
  | "FRAUD_SECURITY"
  | "LOGIN_ACCESS"
  | "COMMISSION"
  | "TECHNICAL_API"
  | "COMPLAINT";

export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";

export type CustomerType = "CUSTOMER" | "AGENT" | "MERCHANT" | "AGGREGATOR" | "PARTNER";

export type SupportChannel =
  | "IN_APP"
  | "WEB_PORTAL"
  | "EMAIL"
  | "AGENT_PORTAL"
  | "MERCHANT_PORTAL"
  | "AGGREGATOR_PORTAL"
  | "HOTLINE"
  | "WHATSAPP"
  | "SYSTEM_EVENT";

export type SlaState = "HEALTHY" | "APPROACHING_BREACH" | "BREACHED" | "RESOLVED_ON_TIME";

export interface SupportOfficer {
  id: string;
  fullName: string;
  email: string;
  role: SupportRole;
  tier: SupportTier;
  jurisdiction: SupportJurisdiction;
  languages: ("en" | "ha" | "fr")[];
  activeTicketCount: number;
  maxCapacity: number;
  status: "ONLINE" | "BUSY" | "ON_BREAK" | "OFFLINE";
  qaScore: number;
  avatarUrl?: string;
  skills: string[];
  joinedDate: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: "CUSTOMER" | "AGENT" | "SYSTEM" | "AUTOMATION";
  senderId: string;
  senderName: string;
  content: string;
  isInternalNote: boolean;
  attachments?: {
    name: string;
    url: string;
    sizeMasked: string;
    fileType: string;
  }[];
  timestamp: string;
  macroUsed?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customerType: CustomerType;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  jurisdiction: SupportJurisdiction;
  channel: SupportChannel;
  language: "en" | "ha" | "fr";
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  tierAssigned: SupportTier;
  relatedTransactionId?: string;
  incidentId?: string;
  createdAt: string;
  updatedAt: string;
  firstResponseDueAt: string;
  resolutionDueAt: string;
  firstRespondedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaStatus: SlaState;
  tags: string[];
  sentiment: "POSITIVE" | "NEUTRAL" | "FRUSTRATED" | "CRITICAL_ANGRY";
  satisfactionRating?: number; // 1-5
  satisfactionComment?: string;
  rootCauseCategory?: string;
  isDuplicateOf?: string;
  messages: TicketMessage[];
}

export interface Customer360Context {
  customerId: string;
  fullName: string;
  emailMasked: string;
  phoneMasked: string;
  country: "NG" | "NE";
  preferredLanguage: "en" | "ha" | "fr";
  kycTier: "TIER_1" | "TIER_2" | "TIER_3";
  accountStatus: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "PENDING_VERIFICATION";
  walletBalanceMasked: string;
  currency: string;
  totalTransactionsCount: number;
  failedTransactionsCount: number;
  registrationDate: string;
  activeTicketsCount: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  securityEvents: {
    event: string;
    device: string;
    ipMasked: string;
    timestamp: string;
  }[];
}

export interface TransactionInvestigationContext {
  transactionId: string;
  reference: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: "SUCCESSFUL" | "PENDING" | "FAILED" | "REVERSED";
  channel: string;
  originEntity: string;
  destinationEntity: string;
  providerNode: string;
  providerReference: string;
  webhookStatus: "RECEIVED_CONFIRMED" | "PENDING_ACK" | "FAILED_TIMEOUT";
  ledgerPostingStatus: "POSTED_BALANCED" | "PENDING_RECONCILIATION" | "HOLD";
  failureReason?: string;
  canAutomateRefund: boolean;
  timeline: {
    stage: string;
    timestamp: string;
    status: "PASS" | "WARN" | "FAIL";
    details: string;
  }[];
}

export interface PlaybookStep {
  stepNumber: number;
  title: string;
  instructions: string;
  checklistItems: string[];
  recommendedAction: string;
  macroResponseKey?: string;
}

export interface SupportPlaybook {
  id: string;
  title: string;
  category: TicketCategory;
  targetTier: SupportTier;
  estimatedMinutes: number;
  steps: PlaybookStep[];
  requiredRole: SupportRole;
  applicableJurisdictions: SupportJurisdiction[];
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: TicketCategory;
  audience: "CUSTOMER_FACING" | "INTERNAL_OFFICER" | "AGENT_OPERATOR" | "MERCHANT_SUPPORT";
  language: "en" | "ha" | "fr";
  problem: string;
  symptoms: string[];
  resolution: string;
  escalationCondition: string;
  requiredPermissions: SupportRole;
  version: string;
  updatedAt: string;
  author: string;
  tags: string[];
  helpfulCount: number;
}

export interface SupportIncident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  affectedServices: string[];
  affectedProviders: string[];
  jurisdiction: SupportJurisdiction;
  severity: "MINOR" | "MAJOR" | "CRITICAL";
  status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
  startTime: string;
  resolvedTime?: string;
  linkedTicketsCount: number;
  customerNotice: string;
}

export interface AutomationRule {
  id: string;
  ruleName: string;
  description: string;
  triggerEvent: string;
  category: TicketCategory;
  conditions: {
    field: string;
    operator: "EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN";
    value: string;
  }[];
  actions: {
    actionType: "AUTO_RESPOND" | "AUTO_ROUTE" | "AUTO_ASSIGN" | "AUTO_RESOLVE" | "ESCALATE";
    parameters: Record<string, any>;
  }[];
  enabled: boolean;
  executionCount: number;
  successRate: number;
  lastTriggered?: string;
  requiresHumanApproval: boolean;
  isDryRun: boolean;
}

export interface AutomationExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  ticketId: string;
  triggerTimestamp: string;
  status: "SUCCESS" | "FAILED" | "PENDING_APPROVAL" | "DRY_RUN_MATCH";
  actionTaken: string;
  timeSavedMinutes: number;
  error?: string;
}

export interface QaReview {
  id: string;
  ticketId: string;
  officerId: string;
  officerName: string;
  reviewerName: string;
  score: number; // 0-100
  criteriaRatings: {
    identityVerification: number;
    accuracy: number;
    professionalism: number;
    playbookAdherence: number;
    resolutionSpeed: number;
  };
  feedback: string;
  reviewedAt: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  tier: SupportTier;
  estimatedMinutes: number;
  modulesCount: number;
  completed: boolean;
  score?: number;
  certificationName: string;
  keySkills: string[];
}

export interface StaffCapacityMetric {
  currentWorkforce: number;
  peakQueueRequirement: number;
  recommendedJuniorOfficers: number;
  primaryNeedCategory: string;
  languageDemand: {
    english: number;
    hausa: number;
    french: number;
  };
}

export interface SupportHealthScore {
  overallScore: number; // 0-100
  responsePerformance: number;
  resolutionPerformance: number;
  slaCompliance: number;
  csat: number;
  automationEfficiency: number;
  backlogHealth: number;
  staffCapacity: number;
}

export interface SupportAuditEntry {
  id: string;
  timestamp: string;
  officerId: string;
  officerName: string;
  officerRole: SupportRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  beforeState?: string;
  afterState?: string;
  jurisdiction: SupportJurisdiction;
}
