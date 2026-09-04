// API Gateway, Partner Management & Provider Connectivity Types

export type GatewayEnvironment = 'SANDBOX' | 'PRODUCTION';
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export type ProviderHealthState = 'HEALTHY' | 'DEGRADED' | 'UNSTABLE' | 'DOWN' | 'MAINTENANCE';

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string[];
    retryable: boolean;
  };
  meta: {
    requestId: string;
    correlationId: string;
    timestamp: string;
    apiVersion: string;
  };
}

export interface PartnerRecord {
  id: string;
  partnerCode: string;
  businessName: string;
  category:
    | 'BANK'
    | 'PAYMENT_PROVIDER'
    | 'FINTECH'
    | 'AGGREGATOR'
    | 'MERCHANT'
    | 'AGENCY_PARTNER'
    | 'BDC_PARTNER'
    | 'KYC_PROVIDER'
    | 'OTHER';
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  legalEntity: string;
  kybStatus: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
  lifecycleStatus:
    | 'PROSPECT'
    | 'APPLICATION'
    | 'DUE_DILIGENCE'
    | 'APPROVED'
    | 'SANDBOX'
    | 'PILOT'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'TERMINATED';
  tier: 'STANDARD' | 'ENTERPRISE' | 'STRATEGIC';
  createdAt: string;
  updatedAt: string;
}

export interface ApiClientRecord {
  id: string;
  partnerId: string;
  partnerName?: string;
  clientId: string;
  clientName: string;
  environment: GatewayEnvironment;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  allowedScopes: string[];
  allowedIps: string[];
  rateLimitPerSecond: number;
  createdAt: string;
  apiKeyPreview?: string;
}

export interface ProviderNodeRecord {
  id: string;
  providerCode: string;
  name: string;
  country: 'NG' | 'NE' | 'GLOBAL';
  currency: 'NGN' | 'XOF' | 'USD';
  adapterClass: string;
  healthStatus: ProviderHealthState;
  circuitBreakerState: CircuitBreakerState;
  supportedCapabilities: string[];
  avgLatencyMs: number;
  successRate24h: number;
  lastHeartbeatAt: string;
  createdAt: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  subscriptionId: string;
  clientName?: string;
  targetUrl: string;
  eventId: string;
  eventType: string;
  payload: Record<string, any>;
  attemptNumber: number;
  status: 'PENDING' | 'DELIVERED' | 'RETRYING' | 'DEAD_LETTERED';
  responseCode?: number;
  latencyMs: number;
  errorMessage?: string;
  nextRetryAt?: string;
  createdAt: string;
}
