export type RiskEntityType = 
  | 'CUSTOMER' 
  | 'AGENT' 
  | 'MERCHANT' 
  | 'AGGREGATOR' 
  | 'DEVICE' 
  | 'BENEFICIARY' 
  | 'IP_ADDRESS';

export type RiskBand = 
  | 'VERY_LOW' 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH' 
  | 'VERY_HIGH' 
  | 'CRITICAL';

export type RiskDecisionOutcome = 
  | 'ALLOW' 
  | 'ALLOW_WITH_STEP_UP' 
  | 'REVIEW' 
  | 'HOLD' 
  | 'DECLINE' 
  | 'BLOCK';

export type RiskHoldType = 
  | 'RISK_HOLD' 
  | 'COMPLIANCE_HOLD' 
  | 'CHARGEBACK_HOLD' 
  | 'MANUAL_REVIEW_HOLD' 
  | 'LIQUIDITY_HOLD';

export type RiskHoldStatus = 
  | 'ACTIVE' 
  | 'RELEASED' 
  | 'EXPIRED' 
  | 'SEIZED';

export type FraudCaseStatus = 
  | 'OPEN' 
  | 'INVESTIGATING' 
  | 'WAITING_FOR_INFORMATION' 
  | 'ESCALATED' 
  | 'RESOLVED' 
  | 'CONFIRMED_FRAUD' 
  | 'FALSE_POSITIVE' 
  | 'CLOSED';

export type FraudCasePriority = 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH' 
  | 'CRITICAL';

export interface DeviceTelemetry {
  deviceId: string;
  ipAddress: string;
  userAgent?: string;
  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  isNewDevice?: boolean;
  deviceAccountsCount24h?: number;
  countryCode?: string;
}

export interface BeneficiaryTelemetry {
  accountNumber: string;
  bankCode: string;
  accountName?: string;
  isNewBeneficiary?: boolean;
  previousTransactionCount?: number;
}

export interface RiskEvaluationRequest {
  transactionReference: string;
  entityId: string;
  entityType: RiskEntityType;
  amountMinor: number;
  currency: 'NGN' | 'XOF' | 'USD';
  countryCode: 'NG' | 'NE';
  transactionType?: string;
  device?: DeviceTelemetry;
  beneficiary?: BeneficiaryTelemetry;
  counterpartyId?: string;
  agentId?: string;
  merchantId?: string;
  metadata?: Record<string, any>;
}

export interface RiskRuleHit {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  scoreDelta: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  forcedAction?: RiskDecisionOutcome;
  description: string;
}

export interface RiskDecisionRecord {
  id: string;
  transactionReference: string;
  entityId: string;
  entityType: RiskEntityType;
  compositeScore: number;
  riskBand: RiskBand;
  decision: RiskDecisionOutcome;
  decisionReason: string;
  ruleHits: RiskRuleHit[];
  signalsSnapshot: Record<string, any>;
  policyVersion: string;
  modelVersion: string;
  executionLatencyMs: number;
  createdAt: string;
}

export interface RiskHoldRecord {
  id: string;
  holdReference: string;
  entityId: string;
  transactionReference?: string;
  amountMinor: number;
  currency: 'NGN' | 'XOF' | 'USD';
  holdType: RiskHoldType;
  status: RiskHoldStatus;
  reason: string;
  createdBy: string;
  releasedBy?: string;
  releaseReason?: string;
  createdAt: string;
  releasedAt?: string;
}

export interface FraudCaseRecord {
  id: string;
  caseReference: string;
  entityId: string;
  entityType: RiskEntityType;
  transactionReference?: string;
  riskScore: number;
  riskBand: RiskBand;
  status: FraudCaseStatus;
  priority: FraudCasePriority;
  assignedDesk: string;
  assignedOfficer?: string;
  slaDueAt: string;
  isSlaBreached: boolean;
  ruleHits: RiskRuleHit[];
  evidenceSummary: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface EntityRiskProfile {
  id: string;
  entityId: string;
  entityType: RiskEntityType;
  entityReference: string;
  countryCode: 'NG' | 'NE';
  currentRiskScore: number;
  currentRiskBand: RiskBand;
  restrictionStatus: 'UNRESTRICTED' | 'STEP_UP_REQUIRED' | 'UNDER_INVESTIGATION' | 'TEMPORARY_FREEZE' | 'PERMANENT_BLOCK';
  lifetimeFraudLossMinor: number;
  lifetimePreventedLossMinor: number;
  chargebackCount: number;
  reversalCount: number;
  alertCount: number;
  knownDevices: string[];
  knownIps: string[];
  knownBeneficiaries: string[];
  updatedAt: string;
}

export interface NetworkRelationshipLink {
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: 'SHARED_DEVICE' | 'SHARED_IP' | 'SHARED_BENEFICIARY' | 'AGENT_CUSTOMER_CYCLING';
  firstObservedAt: string;
  lastObservedAt: string;
  weight: number;
}
