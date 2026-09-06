export type DeveloperEnvironment = 'SANDBOX' | 'PRODUCTION';

export type DeveloperRole = 
  | 'OWNER' 
  | 'ADMIN' 
  | 'DEVELOPER' 
  | 'ANALYST' 
  | 'SUPPORT_CONTACT';

export type ApiCategory = 
  | 'payments' 
  | 'wallets' 
  | 'customers' 
  | 'kyc' 
  | 'merchant' 
  | 'agency' 
  | 'bills' 
  | 'fx_cross_border';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiProductStatus = 'DRAFT' | 'INTERNAL' | 'SANDBOX' | 'PUBLIC_SANDBOX' | 'PRODUCTION' | 'DEPRECATED' | 'SUNSET';

export type WebhookDeliveryStatus = 'DELIVERED' | 'FAILED' | 'RETRYING' | 'PENDING' | 'REPLAYED';

export type ProductionRequestStatus = 'DRAFT' | 'NOT_REQUESTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface DeveloperOrganization {
  id: string;
  name: string;
  slug: string;
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  jurisdiction: 'Nigeria' | 'Niger Republic' | 'Bilateral WAEMU';
  businessType: 'FINTECH' | 'MERCHANT' | 'AGGREGATOR' | 'BANK' | 'ENTERPRISE';
  verificationStatus: 'VERIFIED' | 'PENDING' | 'TIER_1';
  tier: 'STANDARD' | 'ENTERPRISE' | 'PARTNER';
  createdAt: string;
  defaultCurrency: 'NGN' | 'XOF';
}

export interface DeveloperMember {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: DeveloperRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  mfaEnabled: boolean;
  lastLogin: string;
  avatarUrl?: string;
}

export interface DeveloperApplication {
  id: string;
  orgId: string;
  name: string;
  description: string;
  environment: DeveloperEnvironment;
  status: 'ACTIVE' | 'DEPRECATED' | 'REVOKED';
  enabledApis: ApiCategory[];
  scopes: string[];
  ipWhitelist: string[];
  rateLimitPerMinute: number;
  monthlyRequestQuota: number;
  createdAt: string;
  lastUsedAt: string;
}

export interface ApiCredential {
  id: string;
  appId: string;
  orgId: string;
  name: string;
  type: 'SECRET_KEY' | 'PUBLIC_KEY' | 'OAUTH_CLIENT';
  environment: DeveloperEnvironment;
  publicKey: string;
  secretKeyMasked: string;
  secretKeyRaw?: string; // only revealed immediately upon generation
  scopes: string[];
  status: 'ACTIVE' | 'ROTATING' | 'REVOKED' | 'EXPIRED';
  createdAt: string;
  expiresAt?: string;
  gracePeriodExpiresAt?: string;
  lastUsedAt: string;
  createdByName: string;
}

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: any;
  enum?: string[];
}

export interface ApiResponseSchema {
  statusCode: number;
  description: string;
  headers?: Record<string, string>;
  body: Record<string, any>;
}

export interface ApiErrorCodeDef {
  code: string;
  httpStatus: number;
  message: string;
  recommendedAction: string;
  category: 'AUTH' | 'VALIDATION' | 'RATE_LIMIT' | 'PROVIDER' | 'LEDGER' | 'COMPLIANCE';
}

export interface ApiEndpoint {
  id: string;
  productId: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  version: string;
  deprecated?: boolean;
  sunsetDate?: string;
  requiresAuth: boolean;
  requiredScope: string;
  rateLimit: string;
  requestHeaders: ApiParameter[];
  queryParams?: ApiParameter[];
  requestBodySchema?: ApiParameter[];
  sampleRequestBody?: Record<string, any>;
  responses: ApiResponseSchema[];
  errorCodes: ApiErrorCodeDef[];
  jurisdiction: 'NG' | 'NE' | 'ALL';
  supportedCorridors?: string[];
}

export interface ApiProduct {
  id: string;
  category: ApiCategory;
  name: string;
  title: string;
  description: string;
  version: string;
  status: ApiProductStatus;
  baseUrl: {
    sandbox: string;
    production: string;
  };
  endpoints: ApiEndpoint[];
  scopes: string[];
  webhookEvents: string[];
  sdks: string[];
  changelog: {
    version: string;
    date: string;
    summary: string;
    type: 'FEATURE' | 'FIX' | 'BREAKING' | 'SECURITY';
  }[];
}

export interface WebhookEndpoint {
  id: string;
  appId: string;
  orgId: string;
  url: string;
  environment: DeveloperEnvironment;
  status: 'ACTIVE' | 'DISABLED' | 'FAILING';
  events: string[];
  signingSecretMasked: string;
  signingSecretRaw?: string;
  failureCount: number;
  lastDeliveryStatus: WebhookDeliveryStatus;
  lastDeliveredAt: string;
  createdAt: string;
  retryPolicy: 'STANDARD_EXPONENTIAL' | 'AGGRESSIVE' | 'MANUAL_ONLY';
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  endpointUrl: string;
  environment: DeveloperEnvironment;
  attemptNumber: number;
  maxAttempts: number;
  httpStatus: number;
  latencyMs: number;
  status: WebhookDeliveryStatus;
  payload: Record<string, any>;
  responseBody: string;
  timestamp: string;
  signatureHeader: string;
  idempotencyKey: string;
}

export interface WebhookEventDef {
  event: string;
  category: ApiCategory;
  description: string;
  samplePayload: Record<string, any>;
  jurisdiction: 'NG' | 'NE' | 'ALL';
}

export interface ApiRequestLog {
  id: string;
  requestId: string;
  correlationId: string;
  appId: string;
  appName: string;
  environment: DeveloperEnvironment;
  method: HttpMethod;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  ipAddress: string;
  country: 'NG' | 'NE' | 'INTERNATIONAL';
  timestamp: string;
  requestHeadersMasked: Record<string, string>;
  requestBodyMasked?: Record<string, any>;
  responseBodyMasked: Record<string, any>;
  errorMessage?: string;
  providerNode?: 'Providus Bank NG' | 'Coris Bank NE' | 'NIBSS NIP' | 'GIM-UEMOA';
}

export interface ErrorAnalyticsSummary {
  errorCode: string;
  count: number;
  percentage: number;
  endpoint: string;
  method: HttpMethod;
  category: string;
  lastSeen: string;
  recommendedFix: string;
}

export interface RateLimitQuota {
  category: ApiCategory;
  currentRpm: number;
  maxRpm: number;
  requestsToday: number;
  quotaToday: number;
  burstLimit: number;
  throttleCountToday: number;
}

export interface SystemStatusNode {
  id: string;
  name: string;
  category: 'API_GATEWAY' | 'BANKING_NODE' | 'SWITCH' | 'WEBHOOK_DISPATCHER' | 'SANDBOX_ENGINE' | 'KYC_ORCHESTRATOR';
  jurisdiction: 'NG' | 'NE' | 'GLOBAL';
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE' | 'OUTAGE';
  uptime90d: number;
  latencyMs: number;
  lastChecked: string;
  providerName?: string;
}

export interface PlatformIncident {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'MAINTENANCE';
  status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
  affectedNodes: string[];
  affectedEndpoints: string[];
  impactSummary: string;
  startedAt: string;
  resolvedAt?: string;
  updates: {
    timestamp: string;
    status: string;
    message: string;
  }[];
}

export interface SdkPackage {
  id: string;
  language: string;
  name: string;
  version: string;
  packageManager: string;
  installCommand: string;
  repositoryUrl: string;
  docsUrl: string;
  status: 'GA' | 'BETA';
  releaseDate: string;
  features: string[];
}

export interface IntegrationChecklistItem {
  id: string;
  title: string;
  category: 'AUTH' | 'INTEGRATION' | 'WEBHOOK' | 'ERROR_HANDLING' | 'SECURITY' | 'RECONCILIATION';
  status: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS';
  description: string;
  verificationEvidence?: string;
}

export interface ProductionAccessRequest {
  id: string;
  orgId: string;
  orgName: string;
  applicantEmail: string;
  requestedAt: string;
  status: ProductionRequestStatus;
  readinessScore: number;
  complianceKybStatus: 'VERIFIED' | 'UNDER_REVIEW' | 'REJECTED';
  settlementAccountVerified: boolean;
  settlementBank: string;
  settlementNuban: string;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  checklistResults: {
    authentication: boolean;
    sandboxSuccess: boolean;
    webhookSignatureTested: boolean;
    idempotencyEnforced: boolean;
    errorHandlingVerified: boolean;
    ipWhitelistConfigured: boolean;
  };
}

export interface DeveloperSupportCase {
  id: string;
  ticketNumber: string;
  subject: string;
  category: 'API_ERROR' | 'WEBHOOK_FAILURE' | 'CREDENTIAL_ISSUE' | 'RATE_LIMIT' | 'PRODUCTION_ACCESS' | 'INTEGRATION_GUIDANCE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_DEVELOPER' | 'RESOLVED';
  applicationId: string;
  environment: DeveloperEnvironment;
  endpoint?: string;
  requestId?: string;
  errorCode?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
}

export interface DeveloperAuditLog {
  id: string;
  actorEmail: string;
  actorRole: DeveloperRole;
  action: string;
  resourceType: 'APPLICATION' | 'CREDENTIAL' | 'WEBHOOK' | 'PRODUCTION_ACCESS' | 'TEAM' | 'SECURITY_POLICY';
  resourceId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  environment: DeveloperEnvironment;
}

/* ---------------------------------------------------------------- */
/* Server workspace state (BFF /api/developers/workspace DTO)        */
/* ---------------------------------------------------------------- */

export interface DeveloperOnboardingStep {
  key: string;
  done: boolean;
  detail: string;
}

export interface DeveloperWorkspaceCounts {
  credentials: number;
  webhookEndpoints: number;
  requestsToday: number;
  requestsMonth: number;
}

export interface DeveloperWorkspaceState {
  organization: DeveloperOrganization;
  members: DeveloperMember[];
  applications: DeveloperApplication[];
  onboarding: DeveloperOnboardingStep[];
  counts: DeveloperWorkspaceCounts;
  productionAccessStatus: ProductionRequestStatus;
  credentialPreviews: ApiCredential[];
  webhooks: WebhookEndpoint[];
}
