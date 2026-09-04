// Type definitions for Tier-1 Payment Switch & Orchestration Engine

export type PaymentCountry = 'NG' | 'NE' | 'CROSS_BORDER';
export type PaymentCurrency = 'NGN' | 'XOF' | 'USD';
export type PaymentDirection = 'INBOUND' | 'OUTBOUND' | 'FX_TRANSFER';
export type PaymentChannel = 'NIP' | 'CARD' | 'VIRTUAL_ACCOUNT' | 'USSD' | 'DIRECT_DEBIT' | 'SAHEL_SWITCH';

export type PaymentBusinessState =
  | 'INITIATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSED'
  | 'REFUNDED'
  | 'DISPUTED';

export type PaymentFinancialState =
  | 'UNPOSTED'
  | 'HELD'
  | 'POSTED'
  | 'PARTIALLY_REVERSED'
  | 'FULLY_REVERSED';

export type PaymentSettlementState =
  | 'UNSETTLED'
  | 'IN_SETTLEMENT'
  | 'SETTLED'
  | 'PARTIALLY_SETTLED'
  | 'SETTLEMENT_EXCEPTION';

export type PaymentReconciliationState =
  | 'UNRECONCILED'
  | 'MATCHED'
  | 'MISMATCH'
  | 'EXCEPTION'
  | 'MANUAL_REVIEW';

export type AttemptStatus =
  | 'INITIATED'
  | 'SENT'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'CIRCUIT_BROKEN';

export interface PaymentAttempt {
  id: string;
  paymentId: string;
  attemptNumber: number;
  providerCode: string;
  providerNodeUrl?: string;
  providerReference?: string;
  sessionId?: string;
  status: AttemptStatus;
  requestHeaders?: Record<string, string>;
  requestPayload?: any;
  responseHeaders?: Record<string, string>;
  responsePayload?: any;
  responseCode?: string;
  responseMessage?: string;
  latencyMs?: number;
  circuitBreakerState?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  errorType?: string;
  isTerminal: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentRecord {
  id: string;
  reference: string;
  externalReference?: string;
  tenantId: string;
  customerId?: string;
  merchantId?: string;
  country: PaymentCountry;
  currency: PaymentCurrency;
  amount: number;
  feeAmount: number;
  vatAmount: number;
  netAmount: number;
  direction: PaymentDirection;
  channel: PaymentChannel;
  businessState: PaymentBusinessState;
  financialState: PaymentFinancialState;
  settlementState: PaymentSettlementState;
  reconciliationState: PaymentReconciliationState;
  selectedProvider?: string;
  activeAttemptId?: string;
  totalAttempts: number;
  senderAccountNumber?: string;
  senderBankCode?: string;
  senderName?: string;
  beneficiaryAccountNumber?: string;
  beneficiaryBankCode?: string;
  beneficiaryName?: string;
  narration?: string;
  fxQuoteId?: string;
  fxSourceCurrency?: PaymentCurrency;
  fxTargetCurrency?: PaymentCurrency;
  fxRate?: number;
  fxTargetAmount?: number;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
  postedAt?: string;
  attempts?: PaymentAttempt[];
}

export interface RoutingRule {
  id: string;
  country: PaymentCountry;
  currency: PaymentCurrency;
  channel: PaymentChannel;
  minAmount: number;
  maxAmount?: number;
  primaryProvider: string;
  secondaryProvider?: string;
  fallbackProvider?: string;
  weightPrimary: number; // 0-100
  isActive: boolean;
  priority: number;
}

export interface ProviderCapability {
  providerCode: string;
  providerName: string;
  country: PaymentCountry;
  supportedCurrencies: PaymentCurrency[];
  supportedChannels: PaymentChannel[];
  supportsOutwardNIP: boolean;
  supportsVirtualAccounts: boolean;
  supportsCardProcessing: boolean;
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  avgLatencyMs: number;
  successRate24h: number; // percentage e.g. 99.85
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  isOperational: boolean;
}

export interface WebhookEventRecord {
  id: string;
  providerCode: string;
  eventId?: string;
  eventType: string;
  payloadHash: string;
  rawPayload: any;
  headers: Record<string, string>;
  signature?: string;
  isSignatureValid: boolean;
  processingStatus: 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'IGNORED' | 'REPLAYED';
  paymentId?: string;
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}

export interface PaymentInitiationRequest {
  idempotencyKey: string;
  tenantId: string;
  customerId?: string;
  merchantId?: string;
  country: PaymentCountry;
  currency: PaymentCurrency;
  amount: number;
  channel: PaymentChannel;
  direction: PaymentDirection;
  senderAccountNumber?: string;
  senderBankCode?: string;
  senderName?: string;
  beneficiaryAccountNumber?: string;
  beneficiaryBankCode?: string;
  beneficiaryName?: string;
  narration?: string;
  metadata?: Record<string, any>;
  fxTargetCurrency?: PaymentCurrency;
}
