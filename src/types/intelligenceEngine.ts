// Enterprise Customer Intelligence, BI & AI Decision Types

export type RfmSegment =
  | 'CHAMPIONS'
  | 'LOYAL_CUSTOMERS'
  | 'POTENTIAL_GROWTH'
  | 'AT_RISK'
  | 'DORMANT';

export type DecisionMaterialityTier =
  | 'TIER_1_INFO'
  | 'TIER_2_REC'
  | 'TIER_3_ACTION'
  | 'TIER_4_CRITICAL';

export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AiCitationTag =
  | 'FACT'
  | 'CALCULATION'
  | 'PREDICTION'
  | 'INFERENCE'
  | 'RECOMMENDATION';

export interface Customer360Profile {
  id: string;
  customerId: string;
  fullNameMasked: string;
  jurisdiction: 'NG' | 'NE';
  kycTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  rfmSegment: RfmSegment;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  historicalClvNgn: number;
  predictedClvNgn: number;
  churnProbability: number;
  churnRiskBand: 'LOW' | 'MEDIUM' | 'HIGH';
  primaryChannel: string;
  lastActiveAt: string;
}

export interface CustomerNextBestAction {
  id: string;
  customerId: string;
  recommendationTitle: string;
  recommendationType: 'RETENTION' | 'ACTIVATION' | 'CROSS_SELL' | 'EDUCATION';
  reasoning: string;
  confidenceScore: number;
}

export interface AgentIntelligenceProfile {
  id: string;
  agentId: string;
  agentName: string;
  locationState: string;
  country: 'NG' | 'NE';
  productivityScore: number;
  liquidityHealthScore: number;
  cashVarianceRate: number;
  reversalRate: number;
  performanceTier: 'TOP_PERFORMER' | 'STANDARD' | 'NEEDS_ATTENTION';
  stressProbability: number;
}

export interface MerchantIntelligenceProfile {
  id: string;
  merchantId: string;
  businessName: string;
  monthlyGmvNgn: number;
  processingMarginPct: number;
  disputeRatioPct: number;
  growthTrendPct: number;
  status: 'HEALTHY' | 'STABLE' | 'ELEVATED_DISPUTES';
}

export interface NetworkGraphNode {
  id: string;
  nodeKey: string;
  nodeType: 'CUSTOMER' | 'AGENT' | 'MERCHANT' | 'PROVIDER' | 'BANK_NODE' | 'TERMINAL';
  label: string;
  clusterId: string;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface NetworkGraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: 'TRANSACTS_WITH' | 'SETTLES_WITH' | 'USES_DEVICE' | 'REPLENISHES_FLOAT';
  weight: number;
}

export interface FinancialForecastRecord {
  id: string;
  forecastCode: string;
  targetMetric: string;
  horizon: '7_DAY' | '30_DAY' | '90_DAY' | '12_MONTH';
  baselineValue: number;
  predictedP50: number;
  lowerBoundP10: number;
  upperBoundP90: number;
  confidenceScore: number;
  modelVersion: string;
  unit: string;
}

export interface EarlyWarningAlert {
  id: string;
  alertCode: string;
  domain: 'FINANCIAL' | 'OPERATIONS' | 'LIQUIDITY' | 'AGENT' | 'FRAUD';
  title: string;
  observedValue: number;
  expectedValue: number;
  deviationPct: number;
  severity: AlertSeverity;
  primaryDriver: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
}

export interface DecisionRecommendationCard {
  id: string;
  decisionCode: string;
  title: string;
  domain: 'FINANCIAL' | 'OPERATIONS' | 'TREASURY' | 'AGENT' | 'RISK';
  materialityTier: DecisionMaterialityTier;
  observedTelemetry: string;
  recommendedAction: string;
  expectedImpact: string;
  confidencePct: number;
  approverRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  createdAt: string;
}

export interface ScenarioSimulationRequest {
  scenarioName: string;
  volumeShockPct: number; // e.g. -20
  providerDowntimeHours: number; // e.g. 4
  fxShiftPct: number; // e.g. +15
  liquidityRunPct: number; // e.g. +25
}

export interface ScenarioSimulationResult {
  scenarioName: string;
  projectedRevenueNgn: number;
  revenueImpactPct: number;
  projectedEbitdaNgn: number;
  ebitdaImpactPct: number;
  liquidityBufferCoveragePct: number;
  capitalSolvencyRatioPct: number;
  resilienceRating: 'STABLE' | 'MODERATE_STRESS' | 'SEVERE_STRESS';
  simulatedAt: string;
}

export interface AiModelRegistryRecord {
  id: string;
  modelCode: string;
  modelName: string;
  domain: string;
  version: string;
  algorithm: string;
  status: 'PRODUCTION' | 'SHADOW' | 'VALIDATION' | 'SUSPENDED';
  driftStatus: 'STABLE' | 'WARNING' | 'DRIFT_DETECTED';
  validationMetric: string;
  ownerDesk: string;
}

export interface AiCopilotQueryRequest {
  queryText: string;
  userRole?: string;
}

export interface AiCopilotResponse {
  answer: string;
  classificationTag: AiCitationTag;
  confidencePct: number;
  citations: {
    sourceName: string;
    metricCode: string;
    version: string;
  }[];
  timestamp: string;
}

export interface AiKillSwitchRecord {
  id: string;
  switchTarget: string;
  isActive: boolean;
  activatedBy?: string;
  activatedAt?: string;
  reason?: string;
}

export interface ExecutiveIntelligenceSummary {
  activeCustomersCount: number;
  topPerformingAgentsPct: number;
  predictedMonthlyRevenueNgn: number;
  activeEarlyWarningsCount: number;
  pendingDecisionsCount: number;
  modelsHealthyCount: number;
  aiSafetyStatus: 'SECURE_AND_ACTIVE';
  timestamp: string;
}
