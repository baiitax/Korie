// Enterprise Integration Fabric, API Gateway & Open Banking Types

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export type EnvironmentTier = 'SANDBOX' | 'PRODUCTION';
export type KybStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type WebhookStatus = 'DELIVERED' | 'RETRYING' | 'DEAD_LETTERED';

export interface ApiGatewayRoute {
  id: string;
  routeCode: string;
  groupName: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  pathPattern: string;
  version: string;
  requiredScope: string;
  rateLimitPerSecond: number;
  p50LatencyMs: number;
  requests24h: number;
  successRatePct: number;
  status: 'ONLINE' | 'DEGRADED' | 'MAINTENANCE';
}

export interface ApiClientCredential {
  id: string;
  partnerId: string;
  partnerName: string;
  clientId: string;
  clientName: string;
  keyPrefix: string;
  apiKeyPreview: string;
  environment: EnvironmentTier;
  allowedScopes: string[];
  rateLimitPerSecond: number;
  status: 'ACTIVE' | 'ROTATION_REQUIRED' | 'REVOKED';
  createdAt: string;
}

export interface IdempotencyRecord {
  id: string;
  clientId: string;
  endpoint: string;
  idempotencyKey: string;
  requestHashSha256: string;
  responseStatus: number;
  responseBody: any;
  resourceId?: string;
  createdAt: string;
  expiresAt: string;
}

export interface EnterpriseEventOutbox {
  id: string;
  eventType: string;
  eventVersion: string;
  aggregateId: string;
  aggregateType: string;
  payload: any;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  publishedAt?: string;
  createdAt: string;
}

export interface EnterpriseEventDeadLetter {
  id: string;
  eventId: string;
  consumerName: string;
  failureReason: string;
  attemptsCount: number;
  status: 'DEAD_LETTERED' | 'REPLAYED' | 'DISMISSED';
  createdAt: string;
}

export interface WebhookDeliveryAttempt {
  id: string;
  subscriptionId: string;
  clientName: string;
  eventId: string;
  eventType: string;
  targetUrl: string;
  httpStatus?: number;
  latencyMs: number;
  attemptNumber: number;
  status: WebhookStatus;
  errorMessage?: string;
  createdAt: string;
}

export interface ProviderNodeAdapter {
  id: string;
  providerCode: string;
  providerName: string;
  providerType: 'COMMERCIAL_BANK' | 'SWITCH' | 'CIT_COURIER' | 'FX_DESK';
  country: 'NG' | 'NE' | 'GLOBAL';
  circuitBreakerStatus: CircuitBreakerState;
  p95LatencyMs: number;
  successRatePct: number;
  isActive: boolean;
}

export interface Partner360Profile {
  id: string;
  partnerCode: string;
  businessName: string;
  country: 'NG' | 'NE';
  kybStatus: KybStatus;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH';
  dailySettlementLimitNgn: number;
  isOpenBankingAis: boolean;
  isOpenBankingPis: boolean;
  activeAppsCount: number;
}

export type SandboxScenario =
  | 'SUCCESS'
  | 'PROVIDER_TIMEOUT'
  | 'INSUFFICIENT_FUNDS'
  | 'AML_STEP_UP'
  | 'RATE_LIMITED';

export interface SandboxExecutionResult {
  scenario: SandboxScenario;
  httpStatus: number;
  success: boolean;
  simulatedResponse: any;
  latencyMs: number;
  idempotencyValidated: boolean;
}

export interface ApiThreatEvent {
  id: string;
  threatType: 'BRUTE_FORCE' | 'IDOR_PROBE' | 'ABNORMAL_BURST' | 'MALFORMED_SIGNATURE';
  sourceIp: string;
  clientId?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionTaken: 'BLOCKED_403' | 'RATE_LIMITED_429' | 'ALERT_SOC';
  createdAt: string;
}

export interface IntegrationFabricSummary {
  totalRequests24h: number;
  gatewaySuccessRatePct: number;
  activeRoutesCount: number;
  activePartnersCount: number;
  activeCredentialsCount: number;
  deadLetterEventsCount: number;
  providusBankLatencyMs: number;
  korisBankLatencyMs: number;
  timestamp: string;
}
