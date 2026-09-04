// Enterprise Risk Management (ERM), GRC & Operational Risk Domain Types

export type RiskCategoryCode =
  | 'CREDIT_RISK'
  | 'LIQUIDITY_RISK'
  | 'MARKET_FX_RISK'
  | 'OPERATIONAL_RISK'
  | 'TECHNOLOGY_RISK'
  | 'CYBERSECURITY_RISK'
  | 'FRAUD_RISK'
  | 'AML_CFT_RISK'
  | 'CONDUCT_RISK'
  | 'CONSUMER_PROTECTION_RISK'
  | 'REGULATORY_COMPLIANCE_RISK'
  | 'THIRD_PARTY_RISK'
  | 'CONCENTRATION_RISK'
  | 'MODEL_RISK'
  | 'DATA_PRIVACY_RISK'
  | 'BUSINESS_CONTINUITY_RISK'
  | 'PHYSICAL_SECURITY_RISK'
  | 'GEOPOLITICAL_RISK';

export type RiskAppetiteStatus = 'WITHIN_APPETITE' | 'EARLY_WARNING' | 'BREACH' | 'CRITICAL_BREACH';

export interface RiskAppetiteStatement {
  id: string;
  statementCode: string;
  categoryCode: RiskCategoryCode;
  title: string;
  statementText: string;
  targetMetric: string;
  appetiteLevel: 'ZERO_TOLERANCE' | 'LOW' | 'MODERATE' | 'FLEXIBLE';
  warningThreshold: number;
  breachThreshold: number;
  currentValue: number;
  unit: string;
  status: RiskAppetiteStatus;
  ownerRole: string;
  version: string;
}

export interface KriMetricRecord {
  id: string;
  kriCode: string;
  name: string;
  category: RiskCategoryCode;
  formula: string;
  currentValue: number;
  warningThreshold: number;
  breachThreshold: number;
  unit: string;
  frequency: 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  status: 'GREEN' | 'AMBER' | 'RED';
  owner: string;
  lastCalculatedAt: string;
}

export interface EnterpriseRiskRecord {
  id: string;
  riskCode: string;
  title: string;
  categoryCode: RiskCategoryCode;
  country: 'NG' | 'NE' | 'GLOBAL';
  inherentLikelihood: number; // 1-5
  inherentImpact: number; // 1-5
  inherentRiskScore: number; // 1-25
  controlEffectivenessPct: number; // 0-100%
  residualRiskScore: number;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskOwner: string;
  treatmentStrategy: 'MITIGATE' | 'ACCEPT' | 'TRANSFER' | 'AVOID';
  status: 'IDENTIFIED' | 'ASSESSED' | 'MITIGATION' | 'MONITORING' | 'ACCEPTED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface ControlLibraryRecord {
  id: string;
  controlCode: string;
  name: string;
  controlType: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE' | 'COMPENSATING';
  nature: 'AUTOMATED' | 'MANUAL' | 'HYBRID_SEMI_AUTOMATED';
  ownerRole: string;
  testingFrequency: string;
  effectiveness: 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'INEFFECTIVE' | 'NOT_TESTED';
  lastTestedAt?: string;
}

export interface RiskIssueRecord {
  id: string;
  issueCode: string;
  riskId?: string;
  controlId?: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rootCause: string;
  remediationAction: string;
  assignedOwner: string;
  dueDate: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_VALIDATION' | 'CLOSED' | 'OVERDUE';
  createdAt: string;
}

export interface OperationalLossRecord {
  id: string;
  eventCode: string;
  title: string;
  category: string;
  grossLossAmount: number;
  recoveredAmount: number;
  netLossAmount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  eventDate: string;
  rootCause: string;
  status: 'DETECTED' | 'RECORDED' | 'QUANTIFIED' | 'REMEDIED' | 'CLOSED';
  createdAt: string;
}

export interface ThirdPartyVendorRecord {
  id: string;
  vendorCode: string;
  name: string;
  vendorType: string;
  criticality: 'TIER_1_MISSION_CRITICAL' | 'TIER_2_HIGH_IMPACT' | 'TIER_3_STANDARD';
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  uptimeSlaTargetPct: number;
  lastAssessmentDate: string;
  failoverTested: boolean;
}

export interface ModelRiskRecord {
  id: string;
  modelCode: string;
  modelName: string;
  owner: string;
  version: string;
  status: 'DEVELOPMENT' | 'VALIDATED' | 'PRODUCTION' | 'RETIRED';
  lastValidatedAt: string;
  driftStatus: 'STABLE' | 'DRIFT_DETECTED';
}

export interface BoardRiskSummary {
  enterpriseRiskScore: number;
  criticalRisksCount: number;
  appetiteBreachesCount: number;
  openHighIssuesCount: number;
  totalNetLosses24h: number;
  currency: 'NGN';
}
