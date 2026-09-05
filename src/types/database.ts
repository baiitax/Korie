import { CurrencyCode, MinorUnitsAmount, LedgerAccountType, LedgerEntryType, LedgerPostingStatus } from './ledger';

export type TransactionStatus = 
  | 'INITIATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'REVERSED'
  | 'CANCELLED'
  | 'DISPUTED';

export type TransactionType = 
  | 'CROSS_BORDER_TRANSFER'
  | 'NIP_OUTWARD_TRANSFER'
  | 'NIP_INWARD_SETTLEMENT'
  | 'MERCHANT_CHECKOUT'
  | 'VIRTUAL_ACCOUNT_CREDIT'
  | 'AGENCY_CASH_IN'
  | 'AGENCY_CASH_OUT'
  | 'BILL_VEND'
  | 'FX_CONVERSION'
  | 'WALLET_FUNDING'
  | 'WALLET_TRANSFER'
  | 'FEE_CHARGE'
  | 'COMMISSION_PAYOUT';

export interface DbOrganization {
  id: string;
  name: string;
  slug: string;
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  jurisdiction: 'Nigeria' | 'Niger Republic' | 'Bilateral WAEMU';
  business_type: 'FINTECH' | 'MERCHANT' | 'AGGREGATOR' | 'BANK' | 'ENTERPRISE';
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'ENTERPRISE';
  verification_status: 'VERIFIED' | 'PENDING' | 'TIER_1';
  created_at: string;
  updated_at: string;
}

export interface DbCustomer {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: 'NG' | 'NE';
  kyc_tier: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';
  status: 'ACTIVE' | 'SUSPENDED' | 'FROZEN';
  bvn_masked?: string;
  nin_masked?: string;
  nif_masked?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Owner of a transaction. Set by the engine at execution time and used by
 * customer-facing read paths to enforce object-level authorization.
 * NEVER accepted from a client request body or query string.
 */
export interface DbTransactionOwnership {
  /** KoriePay customer id that owns this transaction (cust-…). */
  owner_customer_id?: string;
}

export interface DbWallet {
  id: string;
  customer_id?: string;
  org_id: string;
  ledger_account_id: string;
  currency: CurrencyCode;
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  balance: MinorUnitsAmount;
  locked_balance: MinorUnitsAmount;
  status: 'ACTIVE' | 'RESTRICTED' | 'FROZEN' | 'CLOSED';
  daily_limit: MinorUnitsAmount;
  daily_spent: MinorUnitsAmount;
  created_at: string;
  updated_at: string;
}

export interface DbTransaction extends DbTransactionOwnership {
  id: string;
  org_id: string;
  wallet_id?: string;
  ledger_transaction_id?: string;
  reference: string;
  external_reference?: string;
  idempotency_key: string;
  request_id: string;
  correlation_id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: MinorUnitsAmount;
  fee: MinorUnitsAmount;
  net_amount: MinorUnitsAmount;
  currency: CurrencyCode;
  source_currency?: CurrencyCode;
  destination_currency?: CurrencyCode;
  exchange_rate?: number;
  recipient_name?: string;
  recipient_bank?: string;
  recipient_account?: string;
  provider_code?: string;
  provider_reference?: string;
  provider_response_code?: string;
  narration?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DbIdempotencyKey {
  id: string;
  key: string;
  org_id: string;
  user_id?: string;
  endpoint: string;
  request_hash: string;
  response_status?: number;
  response_body?: Record<string, any>;
  status: 'PROCESSING' | 'COMMITTED' | 'FAILED';
  locked_until: string;
  created_at: string;
  expires_at: string;
}

export interface DbOutboxEvent {
  id: string;
  org_id: string;
  event_name: string;
  aggregate_type: 'TRANSACTION' | 'LEDGER' | 'CUSTOMER' | 'WALLET' | 'WEBHOOK';
  aggregate_id: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED' | 'DEAD_LETTER';
  retry_count: number;
  max_retries: number;
  last_error?: string;
  created_at: string;
  published_at?: string;
}

export interface DbProviderNode {
  id: string;
  code: 'PROVIDUS_NG' | 'KORIS_NE' | 'NIBSS_NIP' | 'GIM_UEMOA';
  name: string;
  country: 'NG' | 'NE';
  status: 'CONNECTED' | 'DEGRADED' | 'OFFLINE' | 'MAINTENANCE';
  is_active: boolean;
  base_url: string;
  health_check_url: string;
  latency_ms: number;
  success_rate_24h: number;
  last_ping_at: string;
  circuit_breaker_state: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

export interface DbAuditEvent {
  id: string;
  org_id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  ip_address: string;
  user_agent?: string;
  request_id: string;
  correlation_id: string;
  created_at: string;
}
