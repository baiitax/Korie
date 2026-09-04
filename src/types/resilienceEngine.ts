export type ServiceCriticalityTier = 
  | 'TIER_0' // Financial Truth (Ledger, DB, Idempotency)
  | 'TIER_1' // Financial Operations (Settlement, Recon, Providers)
  | 'TIER_2' // Security & Identity (Auth, Identity, Risk, Compliance)
  | 'TIER_3' // Operations (Support, Notifications, Analytics)
  | 'TIER_4'; // Non-critical (Content, Marketing)

export type CircuitBreakerState = 
  | 'CLOSED' 
  | 'OPEN' 
  | 'HALF_OPEN';

export type IncidentSeverity = 
  | 'SEV_1' // Critical Financial / Security Outage
  | 'SEV_2' // Major Service Outage
  | 'SEV_3' // Moderate Degraded Performance
  | 'SEV_4'; // Minor / Informational

export type IncidentStatus = 
  | 'INVESTIGATING' 
  | 'CONTAINED' 
  | 'MITIGATED' 
  | 'RESOLVED' 
  | 'CLOSED';

export interface CircuitBreakerRecord {
  id: string;
  serviceKey: string;
  serviceName: string;
  tier: ServiceCriticalityTier;
  state: CircuitBreakerState;
  failureCount: number;
  failureThreshold: number;
  lastFailureAt?: string;
  lastSuccessAt?: string;
  tripReason?: string;
  coolOffSeconds: number;
  updatedAt: string;
}

export interface DeadLetterJobRecord {
  id: string;
  jobKey: string;
  queueName: string;
  payload: Record<string, any>;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  status: 'FAILED' | 'REPLAYED' | 'DISCARDED';
  replayedAt?: string;
  replayedBy?: string;
  createdAt: string;
}

export interface SafeModeState {
  isActive: boolean;
  activationReason?: string;
  activatedBy?: string;
  activatedAt?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
}

export interface RecoveryValidationStep {
  stepNumber: number;
  stepName: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  details: string;
  checkedAt: string;
}

export interface PostRecoveryValidationResult {
  validationId: string;
  overallStatus: 'SAFE_TO_OPERATE' | 'CORRUPTION_DETECTED' | 'WARNING';
  steps: RecoveryValidationStep[];
  ledgerIsBalanced: boolean;
  totalDebitsMinor: number;
  totalCreditsMinor: number;
  executedBy: string;
  executedAt: string;
}

export interface DeepHealthReport {
  timestamp: string;
  platformStatus: 'OPERATIONAL' | 'DEGRADED' | 'SAFE_MODE' | 'CRITICAL';
  environment: 'PRODUCTION';
  safeMode: boolean;
  database: {
    status: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
    readLatencyMs: number;
    writeLatencyMs: number;
    poolActive: number;
    poolMax: number;
  };
  ledger: {
    status: 'BALANCED' | 'IMBALANCE_DETECTED';
    invariantPassed: boolean;
    totalJournalsCount: number;
    debitCreditDeltaMinor: number;
  };
  providers: {
    code: string;
    name: string;
    country: 'NG' | 'NE';
    status: 'CONNECTED' | 'DEGRADED' | 'OFFLINE';
    circuitBreaker: CircuitBreakerState;
    latencyMs: number;
  }[];
  identityEngine: {
    status: 'OPERATIONAL' | 'DEGRADED';
    totalPersonsCount: number;
    totalOrgsCount: number;
    pendingKycCount: number;
  };
  treasury: {
    status: 'HEALTHY' | 'LOW_LIQUIDITY';
    availableLiquidityNgnMinor: number;
    availableLiquidityXofMinor: number;
  };
}

export interface IncidentRecord {
  id: string;
  incidentReference: string;
  severity: IncidentSeverity;
  title: string;
  status: IncidentStatus;
  impactedServices: string[];
  incidentCommander: string;
  rootCause?: string;
  resolutionNotes?: string;
  detectedAt: string;
  containedAt?: string;
  resolvedAt?: string;
}
