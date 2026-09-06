/**
 * Resource registry — the single source of truth for what the Admin Portal
 * may read and mutate in the database.
 *
 * Rules (audit doc 00, "honesty first"):
 *  - Every admin list/detail view reads a REAL table through this registry.
 *    No page ships hardcoded rows, and no page reads the in-memory engine.
 *  - Only whitelisted columns can be filtered on — never raw user input in a
 *    query. Search runs `ilike` over the resource's declared search columns.
 *  - Mutations are explicit: whitelisted columns + (for status flips) the
 *    exact allowed values. Every PATCH writes an audit_events row.
 */

export type FilterOp = "eq" | "in" | "gte" | "lte";

export interface ResourceFilterDef {
  column: string;
  op: FilterOp;
  /** Coerce "true"/"false" query values to booleans. */
  boolean?: boolean;
}

export interface ResourceMutationDef {
  /** Columns a PATCH may set. */
  columns: string[];
}

export interface ResourceDef {
  /** Supabase table (schema-qualified where needed, e.g. "adashi.groups"). */
  table: string;
  /** Columns to select. "*" for narrow tables; explicit for payload-heavy ones. */
  select?: string;
  orderBy: string;
  asc?: boolean;
  /** ilike search target columns for ?q= */
  search?: string[];
  filters?: Record<string, ResourceFilterDef>;
  defaultLimit?: number;
  mutations?: ResourceMutationDef;
}

export const RESOURCES: Record<string, ResourceDef> = {
  /* ── Customers & wallets ─────────────────────────────────────────── */
  "customers": {
    table: "customers",
    orderBy: "created_at",
    search: ["first_name", "last_name", "email", "phone"],
    filters: {
      status: { column: "status", op: "eq" },
      country: { column: "country", op: "eq" },
      kyc_tier: { column: "kyc_tier", op: "eq" },
    },
    mutations: { columns: ["status"] },
  },
  /* customers mutations: real, audited status changes (support/ops actions) */
  "customer-accounts": {
    table: "customer_accounts",
    orderBy: "created_at",
    search: ["account_number"],
    filters: { customer_id: { column: "customer_id", op: "eq" }, currency: { column: "currency", op: "eq" } },
  },
  "customer-360": {
    table: "customer_360_profiles",
    orderBy: "updated_at",
    filters: { churn_risk_band: { column: "churn_risk_band", op: "eq" }, jurisdiction: { column: "jurisdiction", op: "eq" } },
  },
  "customer-transactions": {
    table: "customer_transactions",
    orderBy: "created_at",
    search: ["reference", "recipient_name", "narration", "provider_name"],
    filters: {
      status: { column: "status", op: "eq" },
      transaction_type: { column: "transaction_type", op: "eq" },
      currency: { column: "currency", op: "eq" },
      customer_id: { column: "customer_id", op: "eq" },
      created_after: { column: "created_at", op: "gte" },
    },
  },
  "wallets": {
    table: "wallets",
    orderBy: "updated_at",
    filters: {
      status: { column: "status", op: "eq" },
      country: { column: "country", op: "eq" },
      currency: { column: "currency", op: "eq" },
      customer_id: { column: "customer_id", op: "eq" },
    },
  },
  "kyc-documents": {
    table: "customer_kyc_documents",
    orderBy: "uploaded_at",
    search: ["original_filename", "document_type"],
    filters: { status: { column: "status", op: "eq" }, customer_id: { column: "customer_id", op: "eq" } },
    mutations: {
      columns: ["status", "reviewed_by", "rejection_reason"],
    },
  },

  /* ── Agency network ──────────────────────────────────────────────── */
  "agents": {
    table: "agents",
    orderBy: "created_at",
    search: ["agent_code", "trading_name", "legal_name", "email", "phone"],
    filters: {
      status: { column: "status", op: "eq" },
      country: { column: "country", op: "eq" },
      tier: { column: "tier", op: "eq" },
      aggregator_id: { column: "aggregator_id", op: "eq" },
    },
    mutations: { columns: ["status"] },
  },
  "agent-applications": {
    table: "agent_onboarding_applications",
    orderBy: "submitted_at",
    search: ["applicant_full_name", "business_name", "email", "phone"],
    filters: {
      status: { column: "status", op: "eq" },
      country: { column: "country", op: "eq" },
    },
    mutations: {
      columns: ["status", "reviewed_by", "rejection_reason"],
    },
  },
  "agent-kyc-documents": {
    table: "agent_kyc_documents",
    orderBy: "uploaded_at",
    search: ["original_filename", "document_type"],
    filters: { status: { column: "status", op: "eq" }, agent_id: { column: "agent_id", op: "eq" } },
    mutations: {
      columns: ["status", "reviewed_by", "rejection_reason"],
    },
  },
  "agency-transactions": {
    table: "agency_transactions",
    orderBy: "created_at",
    search: ["reference", "customer_name", "customer_phone"],
    filters: {
      status: { column: "status", op: "eq" },
      transaction_type: { column: "transaction_type", op: "eq" },
      agent_id: { column: "agent_id", op: "eq" },
    },
  },
  "agent-commissions": {
    table: "agent_commissions",
    orderBy: "earned_at",
    filters: { status: { column: "status", op: "eq" }, agent_id: { column: "agent_id", op: "eq" } },
  },
  "agent-locations": {
    table: "agent_locations",
    orderBy: "created_at",
    filters: { agent_id: { column: "agent_id", op: "eq" } },
  },
  "agency-terminals": {
    table: "agency_terminals",
    orderBy: "created_at",
    search: ["terminal_id"],
    filters: { status: { column: "status", op: "eq" }, agent_id: { column: "agent_id", op: "eq" } },
  },
  "aggregators": {
    table: "aggregators",
    orderBy: "created_at",
    search: ["aggregator_code", "business_name", "legal_entity"],
    filters: {
      status: { column: "status", op: "eq" },
      country: { column: "country", op: "eq" },
      kyb_status: { column: "kyb_status", op: "eq" },
    },
  },

  /* ── Merchants / partners / businesses ───────────────────────────── */
  "partners": {
    table: "partner_registry",
    orderBy: "created_at",
    search: ["partner_code", "legal_entity"],
    filters: {
      category: { column: "category", op: "eq" },
      country: { column: "country", op: "eq" },
      lifecycle_status: { column: "lifecycle_status", op: "eq" },
      kyb_status: { column: "kyb_status", op: "eq" },
    },
  },
  "merchant-profiles": {
    table: "merchant_intelligence_profiles",
    orderBy: "updated_at",
    search: ["business_name"],
    filters: { status: { column: "status", op: "eq" } },
  },
  "identity-organizations": {
    table: "identity_organizations",
    orderBy: "created_at",
    search: ["trading_name", "registration_number", "identity_reference"],
    filters: {
      kyb_status: { column: "kyb_status", op: "eq" },
      business_type: { column: "business_type", op: "eq" },
      country: { column: "country_code", op: "eq" },
    },
  },

  /* ── Banking nodes / platform infra ──────────────────────────────── */
  "banking-nodes": {
    table: "provider_nodes",
    orderBy: "code",
    search: ["code", "name"],
    filters: {
      status: { column: "status", op: "eq" },
      country: { column: "country", op: "eq" },
      circuit_breaker_state: { column: "circuit_breaker_state", op: "eq" },
    },
  },
  "circuit-breakers": {
    table: "circuit_breaker_states",
    orderBy: "updated_at",
    search: ["service_key"],
    filters: { state: { column: "state", op: "eq" }, service_key: { column: "service_key", op: "eq" } },
  },
  "webhook-deliveries": {
    table: "webhook_delivery_logs",
    select: "id,webhook_id,event_name,endpoint_url,environment,attempt_number,max_attempts,http_status,latency_ms,status,signature_header,created_at",
    orderBy: "created_at",
    search: ["event_name", "endpoint_url"],
    filters: { status: { column: "status", op: "eq" }, environment: { column: "environment", op: "eq" } },
  },
  "provider-webhooks": {
    table: "provider_webhook_events",
    select: "id,provider_code,event_id,event_type,is_signature_valid,processing_status,payment_id,error_message,created_at,processed_at",
    orderBy: "created_at",
    search: ["provider_code", "event_type", "event_id"],
    filters: { processing_status: { column: "processing_status", op: "eq" }, provider_code: { column: "provider_code", op: "eq" } },
  },
  "webhook-endpoints": {
    table: "webhook_endpoints",
    orderBy: "created_at",
    search: ["url"],
    filters: { status: { column: "status", op: "eq" }, environment: { column: "environment", op: "eq" } },
    mutations: { columns: ["status"] },
  },
  "api-clients": {
    table: "api_clients",
    orderBy: "created_at",
    search: ["client_id"],
    filters: {
      status: { column: "status", op: "eq" },
      environment: { column: "environment", op: "eq" },
    },
    mutations: { columns: ["status"] },
  },
  "api-credentials": {
    table: "api_client_credentials",
    select: "id,partner_id,client_id,client_name,key_prefix,environment,rate_limit_per_second,status,last_used_at,created_at",
    orderBy: "created_at",
    search: ["client_id", "client_name", "key_prefix"],
    filters: {
      status: { column: "status", op: "eq" },
      environment: { column: "environment", op: "eq" },
    },
    mutations: { columns: ["status"] },
  },
  "api-routes": {
    table: "api_gateway_routes",
    orderBy: "route_code",
    search: ["route_code", "group_name"],
    filters: {
      http_method: { column: "http_method", op: "eq" },
      is_active: { column: "is_active", op: "eq", boolean: true },
    },
    mutations: { columns: ["is_active", "rate_limit_per_second"] },
  },
  "api-threats": {
    table: "api_threat_events",
    orderBy: "created_at",
    search: ["threat_type", "client_id"],
    filters: { severity: { column: "severity", op: "eq" } },
  },
  "outbox-events": {
    table: "outbox_events",
    select: "id,org_id,event_name,aggregate_type,aggregate_id,status,retry_count,max_retries,last_error,created_at,published_at",
    orderBy: "created_at",
    filters: { status: { column: "status", op: "eq" } },
  },
  "dead-letter-jobs": {
    table: "dead_letter_jobs",
    select: "id,job_key,queue_name,error_message,retry_count,max_retries,status,created_at",
    orderBy: "created_at",
    search: ["job_key", "queue_name"],
    filters: { status: { column: "status", op: "eq" } },
  },
  "incidents": {
    table: "incident_records",
    select: "id,incident_reference,severity,status,incident_commander,root_cause,resolution_notes,detected_at,contained_at,resolved_at",
    orderBy: "detected_at",
    search: ["incident_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      severity: { column: "severity", op: "eq" },
    },
    mutations: {
      columns: ["status", "incident_commander", "resolution_notes", "root_cause"],
    },
  },

  /* ── Finance: ledger / GL / recon / settlements / treasury ───────── */
  "ledger-accounts": {
    table: "ledger_accounts",
    orderBy: "account_number",
    search: ["account_number", "name"],
    filters: { type: { column: "type", op: "eq" }, currency: { column: "currency", op: "eq" }, status: { column: "status", op: "eq" } },
  },
  "journal-entries": {
    table: "journal_entries",
    orderBy: "created_at",
    search: ["journal_number", "description", "source_reference"],
    filters: { status: { column: "status", op: "eq" }, currency: { column: "currency", op: "eq" } },
  },
  "gl-accounts": {
    table: "gl_accounts",
    orderBy: "account_code",
    search: ["account_code", "account_name"],
    filters: { category: { column: "category", op: "eq" }, currency: { column: "currency", op: "eq" }, is_active: { column: "is_active", op: "eq", boolean: true } },
  },
  "gl-journal-lines": {
    table: "gl_journal_lines",
    orderBy: "created_at",
    filters: { journal_id: { column: "journal_id", op: "eq" }, account_code: { column: "account_code", op: "eq" } },
  },
  "reconciliation-exceptions": {
    table: "reconciliation_exceptions",
    orderBy: "created_at",
    search: ["provider_reference", "discrepancy_type", "transaction_id"],
    filters: {
      status: { column: "status", op: "eq" },
      currency: { column: "currency", op: "eq" },
    },
    mutations: {
      columns: ["status", "resolved_by"],
    },
  },
  "reconciliation-runs": {
    table: "reconciliation_runs",
    orderBy: "created_at",
    search: ["provider_code"],
    filters: { status: { column: "status", op: "eq" }, provider_code: { column: "provider_code", op: "eq" } },
  },
  "bank-statements": {
    table: "bank_statements",
    orderBy: "imported_at",
    search: ["statement_reference"],
    filters: { currency: { column: "currency", op: "eq" }, is_integrity_verified: { column: "is_integrity_verified", op: "eq", boolean: true } },
  },
  "suspense-items": {
    table: "suspense_items",
    orderBy: "created_at",
    search: ["source_reference", "suspense_account_code"],
    filters: {
      status: { column: "status", op: "eq" },
      currency: { column: "currency", op: "eq" },
    },
    mutations: { columns: ["status"] },
  },
  "settlement-batches": {
    table: "settlement_batches",
    orderBy: "created_at",
    search: ["batch_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      settlement_node: { column: "settlement_node", op: "eq" },
      currency: { column: "currency", op: "eq" },
    },
  },
  "settlement-lines": {
    table: "settlement_batch_lines",
    orderBy: "created_at",
    filters: { settlement_batch_id: { column: "settlement_batch_id", op: "eq" }, status: { column: "status", op: "eq" } },
  },
  "treasury-deals": {
    table: "treasury_deals",
    orderBy: "created_at",
    search: ["deal_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      deal_type: { column: "deal_type", op: "eq" },
      currency: { column: "currency", op: "eq" },
    },
    mutations: { columns: ["status"] },
  },
  "treasury-positions": {
    table: "treasury_positions",
    orderBy: "position_code",
    search: ["position_code"],
    filters: { liquidity_status: { column: "liquidity_status", op: "eq" }, currency: { column: "currency", op: "eq" } },
  },
  "treasury-accounts": {
    table: "treasury_accounts",
    orderBy: "account_code",
    search: ["account_code"],
    filters: { account_type: { column: "account_type", op: "eq" }, status: { column: "status", op: "eq" }, currency: { column: "currency", op: "eq" } },
  },
  "funding-facilities": {
    table: "funding_facilities",
    orderBy: "facility_code",
    search: ["facility_code", "legal_entity"],
    filters: {
      status: { column: "status", op: "eq" },
      facility_type: { column: "facility_type", op: "eq" },
    },
  },
  "fx-rates": {
    table: "fx_rates",
    orderBy: "updated_at",
    search: ["source_currency", "destination_currency", "source"],
  },
  "fx-transactions": {
    table: "liquidity.fx_transactions",
    orderBy: "created_at",
    search: ["fx_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      source_currency: { column: "source_currency", op: "eq" },
      target_currency: { column: "target_currency", op: "eq" },
    },
  },
  "fx-positions": {
    table: "treasury_fx_positions",
    orderBy: "currency_pair",
    filters: { currency_pair: { column: "currency_pair", op: "eq" } },
  },

  /* ── Payments & disputes ─────────────────────────────────────────── */
  "payments": {
    table: "payments",
    select: "id,reference,external_reference,tenant_id,customer_id,merchant_id,country,currency,amount,fee_amount,vat_amount,net_amount,direction,channel,business_state,financial_state,settlement_state,reconciliation_state,total_attempts,sender_name,beneficiary_name,beneficiary_account_number,beneficiary_bank_code,narration,fx_source_currency,fx_target_currency,fx_rate,fx_target_amount,created_at,updated_at,settled_at",
    orderBy: "created_at",
    search: ["reference", "external_reference", "beneficiary_name", "sender_name"],
    filters: {
      status: { column: "status", op: "eq" },
      country: { column: "country", op: "eq" },
      currency: { column: "currency", op: "eq" },
      channel: { column: "channel", op: "eq" },
      direction: { column: "direction", op: "eq" },
      customer_id: { column: "customer_id", op: "eq" },
    },
  },
  "payment-attempts": {
    table: "payment_attempts",
    select: "id,payment_id,attempt_number,provider_code,provider_reference,status,response_code,response_message,latency_ms,circuit_breaker_state,error_type,is_terminal,created_at,completed_at",
    orderBy: "created_at",
    filters: { payment_id: { column: "payment_id", op: "eq" }, status: { column: "status", op: "eq" }, provider_code: { column: "provider_code", op: "eq" } },
  },
  "payment-refunds": {
    table: "payment_refunds",
    orderBy: "created_at",
    search: ["refund_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      currency: { column: "currency", op: "eq" },
    },
    mutations: {
      columns: ["status", "approved_by"],
    },
  },
  "customer-disputes": {
    table: "customer_disputes",
    orderBy: "created_at",
    search: ["ticket_number", "transaction_reference", "description"],
    filters: {
      status: { column: "status", op: "eq" },
      priority: { column: "priority", op: "eq" },
      category: { column: "category", op: "eq" },
    },
    mutations: {
      columns: ["status", "assigned_to", "resolution_notes"],
    },
  },
  "dispute-cases": {
    table: "dispute_cases",
    orderBy: "created_at",
    search: ["dispute_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      priority: { column: "priority", op: "eq" },
    },
    mutations: {
      columns: ["status", "decision_notes", "decided_by"],
    },
  },
  "chargebacks": {
    table: "chargeback_cases",
    orderBy: "created_at",
    search: ["chargeback_reference", "transaction_reference"],
    filters: {
      status: { column: "status", op: "eq" },
    },
    mutations: {
      columns: ["status"],
    },
  },

  /* ── Risk & compliance ───────────────────────────────────────────── */
  "risk-cases": {
    table: "risk_cases",
    orderBy: "created_at",
    search: ["case_reference", "transaction_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      risk_band: { column: "risk_band", op: "eq" },
    },
    mutations: {
      columns: ["status", "assigned_officer", "resolution_notes"],
    },
  },
  "risk-rules": {
    table: "risk_rules",
    orderBy: "rule_code",
    search: ["rule_code", "rule_name"],
    filters: {
      severity: { column: "severity", op: "eq" },
      scope: { column: "scope", op: "eq" },
    },
  },
  "aml-alerts": {
    table: "aml_alerts",
    select: "id,alert_reference,scenario_code,scenario_version,customer_id,account_id,transaction_id,transaction_reference,severity,status,disputed_or_triggered_amount,currency,why_suspicious,assigned_to,sla_due_at,is_sla_breached,case_id,created_at,updated_at",
    orderBy: "created_at",
    search: ["alert_reference", "transaction_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      severity: { column: "severity", op: "eq" },
    },
    mutations: {
      columns: ["status", "assigned_to"],
    },
  },
  "aml-cases": {
    table: "aml_cases",
    orderBy: "created_at",
    search: ["case_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      priority: { column: "priority", op: "eq" },
      jurisdiction: { column: "jurisdiction", op: "eq" },
    },
    mutations: {
      columns: ["status", "final_decision", "decision_notes", "decided_at"],
    },
  },
  "regulatory-reports": {
    table: "regulatory_reports",
    orderBy: "created_at",
    search: ["report_reference"],
    filters: {
      status: { column: "status", op: "eq" },
    },
    mutations: {
      columns: ["status", "preparer_email", "reviewer_email", "approver_email"],
    },
  },
  "regulatory-restatements": {
    table: "regulatory_restatements",
    orderBy: "created_at",
    search: ["restatement_reason", "approved_by"],
  },
  "provider-nodes": {
    table: "provider_nodes",
    orderBy: "created_at",
    search: ["code", "name"],
    filters: {
      country: { column: "country", op: "eq" },
      status: { column: "status", op: "eq" },
      is_active: { column: "is_active", op: "eq", boolean: true },
    },
  },
  "regulatory-obligations": {
    table: "regulatory_obligations",
    mutations: { columns: ["status"] },
    orderBy: "created_at",
    search: ["obligation_code", "regulator_name"],
    filters: {
      status: { column: "status", op: "eq" },
      jurisdiction: { column: "jurisdiction", op: "eq" },
    },
  },
  "early-warnings": {
    table: "early_warning_alerts",
    orderBy: "created_at",
    search: ["alert_code", "domain"],
    filters: {
      severity: { column: "severity", op: "eq" },
      status: { column: "status", op: "eq" },
    },
    mutations: { columns: ["status"] },
  },

  /* ── Security & audit ────────────────────────────────────────────── */
  "audit-events": {
    table: "audit_events",
    select: "id,org_id,actor_id,actor_email,actor_role,action,resource_type,resource_id,details,ip_address,request_id,correlation_id,created_at",
    orderBy: "created_at",
    search: ["actor_email", "action", "resource_type", "resource_id"],
    filters: {
      actor_role: { column: "actor_role", op: "eq" },
      action: { column: "action", op: "eq" },
      resource_type: { column: "resource_type", op: "eq" },
      created_after: { column: "created_at", op: "gte" },
    },
  },
  "security-incidents": {
    table: "security_incidents",
    orderBy: "created_at",
    search: ["incident_reference", "incident_commander"],
    filters: {
      severity: { column: "severity", op: "eq" },
      status: { column: "status", op: "eq" },
    },
    mutations: {
      columns: ["status", "containment_state", "incident_commander"],
    },
  },
  "security-alerts": {
    table: "security_alerts",
    orderBy: "created_at",
    search: ["alert_code", "summary", "target_identity"],
    filters: {
      severity: { column: "severity", op: "eq" },
      status: { column: "status", op: "eq" },
    },
    mutations: {
      columns: ["status", "assigned_analyst"],
    },
  },
  "iam-sessions": {
    table: "iam_sessions",
    select: "id,identity_id,aal_level,device_id,device_platform,ip_address,country_code,is_active,revoked_at,revocation_reason,last_activity_at,expires_at,created_at",
    orderBy: "last_activity_at",
    filters: { is_active: { column: "is_active", op: "eq", boolean: true } },
  },
  "pam-requests": {
    table: "iam_privileged_access_requests",
    orderBy: "created_at",
    search: ["request_reference", "target_role_code", "justification"],
    filters: {
      status: { column: "status", op: "eq" },
    },
    mutations: { columns: ["status", "checker_email", "decided_at"] },
  },

  /* ── Support ─────────────────────────────────────────────────────── */
  "support-tickets": {
    table: "support_tickets",
    select: "id,ticket_number,subject,description,category,priority,status,customer_type,customer_name,customer_email,customer_phone,jurisdiction,channel,language,assigned_officer_id,tier_assigned,related_transaction_reference,first_response_due_at,resolution_due_at,first_responded_at,resolved_at,closed_at,sentiment,satisfaction_rating,root_cause_category,created_at,updated_at",
    orderBy: "created_at",
    search: ["ticket_number", "subject", "customer_name", "customer_email", "related_transaction_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      priority: { column: "priority", op: "eq" },
      category: { column: "category", op: "eq" },
      jurisdiction: { column: "jurisdiction", op: "eq" },
    },
    mutations: {
      columns: ["status", "assigned_officer_id"],
    },
  },
  "support-officers": {
    table: "support_officers",
    orderBy: "full_name",
    search: ["officer_code", "full_name", "email"],
    filters: { status: { column: "status", op: "eq" }, tier: { column: "tier", op: "eq" }, jurisdiction: { column: "jurisdiction", op: "eq" } },
  },
  "support-escalations": {
    table: "support_escalations",
    orderBy: "created_at",
    search: ["escalation_number", "reason"],
    filters: {
      status: { column: "status", op: "eq" },
    },
    mutations: { columns: ["status", "resolution_note"] },
  },

  /* ── Cash operations ─────────────────────────────────────────────── */
  "cash-movements": {
    table: "cash_movements",
    orderBy: "created_at",
    search: ["movement_reference", "movement_type"],
    filters: {
      status: { column: "status", op: "eq" },
      movement_type: { column: "movement_type", op: "eq" },
      currency: { column: "currency", op: "eq" },
    },
  },
  "cash-counts": {
    table: "cash_counts",
    orderBy: "created_at",
    filters: { count_status: { column: "count_status", op: "eq" }, currency: { column: "currency", op: "eq" } },
  },
  "cash-variances": {
    table: "cash_variances",
    orderBy: "created_at",
    search: ["variance_reference"],
    filters: {
      status: { column: "status", op: "eq" },
      severity: { column: "severity", op: "eq" },
    },
    mutations: {
      columns: ["status", "investigated_by", "root_cause_notes"],
    },
  },
  "tills": {
    table: "tills",
    orderBy: "till_code",
    search: ["till_code", "assigned_operator"],
    filters: { status: { column: "status", op: "eq" }, currency: { column: "currency", op: "eq" } },
  },
  "till-handovers": {
    table: "till_handovers",
    orderBy: "created_at",
    filters: { handover_status: { column: "handover_status", op: "eq" } },
  },
  "vaults": {
    table: "vaults",
    orderBy: "vault_code",
    search: ["vault_code"],
    filters: { status: { column: "status", op: "eq" }, country: { column: "country", op: "eq" } },
  },
  "cit-shipments": {
    table: "cit_shipments",
    orderBy: "created_at",
    search: ["shipment_code", "cit_provider"],
    filters: {
      status: { column: "status", op: "eq" },
    },
    mutations: { columns: ["status"] },
  },
  "cash-locations": {
    table: "cash_locations",
    orderBy: "location_code",
    search: ["location_code"],
    filters: { location_type: { column: "location_type", op: "eq" }, country: { column: "country", op: "eq" }, status: { column: "status", op: "eq" } },
  },

  /* ── Products / Adashi / intelligence ────────────────────────────── */
  "products": {
    table: "banking_products",
    orderBy: "created_at",
    search: ["product_code", "name"],
    filters: {
      status: { column: "status", op: "eq" },
      jurisdiction: { column: "jurisdiction", op: "eq" },
      product_type: { column: "product_type", op: "eq" },
      customer_type: { column: "customer_type", op: "eq" },
    },
    mutations: { columns: ["status", "approved_by"] },
  },
  "adashi-groups": {
    table: "adashi.groups",
    orderBy: "created_at",
    search: ["public_reference", "name"],
    filters: {
      status: { column: "status", op: "eq" },
      country_code: { column: "country_code", op: "eq" },
      frequency: { column: "frequency", op: "eq" },
    },
  },
  "adashi-members": {
    table: "adashi.members",
    orderBy: "joined_at",
    filters: {
      membership_status: { column: "membership_status", op: "eq" },
      group_id: { column: "group_id", op: "eq" },
    },
  },
  "adashi-cycles": {
    table: "adashi.cycles",
    orderBy: "created_at",
    filters: {
      status: { column: "status", op: "eq" },
      group_id: { column: "group_id", op: "eq" },
    },
  },
  "adashi-payouts": {
    table: "adashi.payouts",
    orderBy: "created_at",
    filters: {
      status: { column: "status", op: "eq" },
      group_id: { column: "group_id", op: "eq" },
    },
  },
  "adashi-exceptions": {
    table: "adashi.exceptions",
    orderBy: "created_at",
    filters: {
      status: { column: "status", op: "eq" },
      severity: { column: "severity", op: "eq" },
    },
    mutations: { columns: ["status", "resolution_notes", "resolved_by"] },
  },
  "adashi-defaults": {
    table: "adashi.defaults",
    orderBy: "opened_at",
    filters: {
      status: { column: "status", op: "eq" },
      group_id: { column: "group_id", op: "eq" },
    },
  },
  "adashi-disputes": {
    table: "adashi.disputes",
    orderBy: "created_at",
    filters: {
      status: { column: "status", op: "eq" },
    },
    mutations: { columns: ["status", "resolution", "resolved_by"] },
  },
  "management-kpis": {
    table: "management_kpis",
    orderBy: "updated_at",
    search: ["kpi_code", "name"],
    filters: { domain: { column: "domain", op: "eq" }, status: { column: "status", op: "eq" } },
  },
  "board-reports": {
    table: "board_reports",
    orderBy: "created_at",
    search: ["report_code"],
    filters: { status: { column: "status", op: "eq" } },
  },
  "decision-recommendations": {
    table: "decision_recommendations",
    orderBy: "created_at",
    search: ["decision_code", "title"],
    filters: {
      status: { column: "status", op: "eq" },
      materiality_tier: { column: "materiality_tier", op: "eq" },
    },
    mutations: { columns: ["status"] },
  },
  "financial-forecasts": {
    table: "financial_forecasts",
    orderBy: "created_at",
    filters: { status: { column: "status", op: "eq" } },
  },
  "report-exports": {
    table: "report_exports",
    orderBy: "created_at",
    filters: { status: { column: "status", op: "eq" } },
  },

  /* ── Org / settings ──────────────────────────────────────────────── */
  "organizations": {
    table: "organizations",
    orderBy: "created_at",
    search: ["name", "slug"],
    filters: { country: { column: "country", op: "eq" }, verification_status: { column: "verification_status", op: "eq" } },
  },
  "workforce-identities": {
    table: "workforce_identities",
    orderBy: "created_at",
    search: ["employee_id", "email", "full_name", "department"],
    filters: {
      lifecycle_status: { column: "lifecycle_status", op: "eq" },
      country: { column: "country", op: "eq" },
      department: { column: "department", op: "eq" },
    },
  },
  "user-profiles": {
    table: "user_profiles",
    orderBy: "created_at",
    search: ["full_name", "phone"],
    filters: { status: { column: "status", op: "eq" }, country: { column: "country", op: "eq" } },
  },
  /* ── Compliance portal domain (identity, AML, complaints, network) ── */
  "identity-persons": {
    table: "identity_persons",
    orderBy: "created_at",
    search: ["identity_reference", "first_name", "middle_name", "last_name", "email_primary", "phone_primary"],
    filters: {
      country_code: { column: "country_code", op: "eq" },
      kyc_tier: { column: "kyc_tier", op: "eq" },
      kyc_status: { column: "kyc_status", op: "eq" },
      identity_status: { column: "identity_status", op: "eq" },
      risk_level: { column: "risk_level", op: "eq" },
    },
  },
  "identity-documents": {
    table: "identity_documents",
    orderBy: "uploaded_at",
    search: ["document_type", "identity_id"],
    filters: { verification_status: { column: "verification_status", op: "eq" }, identity_id: { column: "identity_id", op: "eq" } },
  },
  "identity-verifications": {
    table: "identity_verifications",
    orderBy: "created_at",
    search: ["provider_code", "verification_type"],
    filters: { status: { column: "status", op: "eq" }, identity_id: { column: "identity_id", op: "eq" } },
  },
  "aml-scenarios": {
    table: "aml_scenarios",
    orderBy: "scenario_code",
    search: ["scenario_code", "description"],
    filters: { is_active: { column: "is_active", op: "eq", boolean: true }, jurisdiction: { column: "jurisdiction", op: "eq" }, severity: { column: "severity", op: "eq" } },
  },
  "aml-customer-profiles": {
    table: "aml_customer_profiles",
    orderBy: "updated_at",
    search: ["customer_id"],
    filters: { aml_risk_tier: { column: "aml_risk_tier", op: "eq" } },
  },
  "aml-case-notes": {
    table: "aml_case_notes",
    orderBy: "created_at",
    search: ["author_email", "content"],
    filters: { case_id: { column: "case_id", op: "eq" }, note_type: { column: "note_type", op: "eq" } },
  },
  "risk-decisions": {
    table: "risk_decisions",
    select: "id,transaction_reference,entity_id,composite_score,risk_band,decision,decision_reason,policy_version,model_version,execution_latency_ms,rule_hits,created_at",
    orderBy: "created_at",
    search: ["transaction_reference", "entity_id"],
    filters: { risk_band: { column: "risk_band", op: "eq" }, decision: { column: "decision", op: "eq" } },
  },
  "complaints": {
    table: "complaints",
    orderBy: "created_at",
    search: ["complaint_reference", "customer_name", "customer_phone", "description"],
    filters: {
      status: { column: "status", op: "eq" },
      priority: { column: "priority", op: "eq" },
      country: { column: "country", op: "eq" },
      category: { column: "category", op: "eq" },
    },
    mutations: {
      columns: ["status", "assigned_to", "assigned_to_email", "resolution_notes", "resolution_type"],
    },
  },
  "customer-restrictions": {
    table: "customer_account_restrictions",
    orderBy: "applied_at",
    search: ["reason_code", "notes", "account_id"],
    filters: { is_active: { column: "is_active", op: "eq", boolean: true }, restriction_type: { column: "restriction_type", op: "eq" } },
    mutations: {
      columns: ["is_active", "lifted_by", "notes"],
    },
  },
  "network-nodes": {
    table: "network_graph_nodes",
    orderBy: "node_key",
    search: ["node_key"],
    filters: { node_type: { column: "node_type", op: "eq" }, risk_rating: { column: "risk_rating", op: "eq" } },
  },
  "network-edges": {
    table: "network_graph_edges",
    orderBy: "created_at",
    filters: { relationship_type: { column: "relationship_type", op: "eq" } },
  },
  "risk-issues": {
    table: "risk_issues",
    orderBy: "created_at",
    search: ["issue_code", "title"],
    filters: { status: { column: "status", op: "eq" }, severity: { column: "severity", op: "eq" } },
  },
  "risk-controls": {
    table: "risk_controls",
    orderBy: "created_at",
    search: ["control_code", "name"],
    filters: { control_type: { column: "control_type", op: "eq" }, effectiveness: { column: "effectiveness", op: "eq" } },
  },

  /* ── Compliance portal: officer directory ─────────────────────────── */
  "roles": {
    table: "roles",
    orderBy: "name",
    search: ["name", "description"],
  },
};

/** PostgREST-unsafe characters stripped from search terms. */
export function sanitizeSearchTerm(q: string): string {
  return q.replace(/[,()%\\]/g, "").slice(0, 80);
}

export type ResourceName = keyof typeof RESOURCES;
