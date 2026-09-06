/* Admin Configuration & Automation Hub — domain types (server-owned). */

export type ConnectorCategory =
  | "PAYMENT_GATEWAY"
  | "SETTLEMENT_RAIL"
  | "BANK_NODE"
  | "BANK_LIQUIDITY_POOL"
  | "WHATSAPP_AGENT"
  | "KYC_SOURCE"
  | "FX_SOURCE"
  | "CIT_COURIER"
  | "NOTIFICATION_PROVIDER"
  | "AI_DECISION_SERVICE"
  | "CUSTOM_REST";

export type ConnectorEnvironment = "SANDBOX" | "PRODUCTION";
export type ConnectorStatus =
  | "CONFIGURED"
  | "CONNECTING"
  | "CONNECTED"
  | "DEGRADED"
  | "FAILED"
  | "PAUSED";
export type ConnectorRole = "PRIMARY" | "FAILOVER" | "OBSERVE" | "NONE";
export type ConnectorAuthType = "BEARER" | "API_KEY" | "BASIC" | "OAUTH2" | "NONE";

export interface ConnectorCapability {
  key: string;
  label: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  discovered: boolean; // true when auto-mapped from an OpenAPI/spec fetch
}

export interface ConnectorProbeResult {
  at: string;
  ok: boolean;
  httpStatus?: number;
  latencyMs?: number;
  error?: string;
}

export interface ConnectorRecord {
  id: string;
  code: string;
  name: string;
  vendor: string;
  category: ConnectorCategory;
  country: string;
  currency: string;
  environment: ConnectorEnvironment;
  baseUrl: string;
  healthPath?: string;
  authType: ConnectorAuthType;
  secretMasked: string;
  hasSecretConfigured: boolean;
  capabilities: ConnectorCapability[];
  role: ConnectorRole;
  status: ConnectorStatus;
  lastProbe?: ConnectorProbeResult;
  metadata: Record<string, string>; // category-specific fields (pool cap, phone id, queue…)
  createdAt: string;
  updatedAt: string;
  createdByName: string;
}

export interface CategoryFieldSpec {
  key: string;
  label: string;
  kind: "text" | "number" | "select";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface ConnectorCategorySpec {
  key: ConnectorCategory;
  label: string;
  description: string;
  healthPathDefault?: string;
  fields: CategoryFieldSpec[];
}

/* ------------------------------------------------ automation */

export interface AutomationContext {
  amount?: number;
  currency?: string;
  country?: string;
  riskLevel?: string;
  category?: string;
  detail?: string;
}

export interface AutomationRule {
  id: string;
  actionKey: string; // workflow action this rule governs
  name: string;
  enabled: boolean;
  dryRun: boolean; // true = simulate + audit, never actually auto-executes
  maxAmount?: number; // currency units (rule.currency)
  currency?: string;
  countries?: string[];
  riskLevels?: string[];
  category?: ConnectorCategory;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
}

export interface AutomationActionSpec {
  key: string;
  label: string;
  module: string;
  description: string;
  defaultMaxAmount?: number;
  defaultCurrency?: string;
  exampleScopes: string[];
}

export type AutomationDecision = "AUTO_EXECUTE" | "REQUIRE_REVIEW";

export interface AutomationDecisionResult {
  decision: AutomationDecision;
  reason: string;
  ruleId?: string;
  ruleName?: string;
  decisionId?: string; // for AUTO_EXECUTE — used to finalize the audit trail
  dryRun?: boolean;
}

export type AutomationAuditKind =
  | "AUTO_EXECUTED"
  | "AUTO_EXECUTE_FAILED"
  | "RULE_CREATED"
  | "RULE_UPDATED"
  | "RULE_REMOVED"
  | "CONNECTOR_ADDED"
  | "CONNECTOR_UPDATED"
  | "CONNECTOR_REMOVED"
  | "CONNECTOR_PROBED"
  | "CONNECTOR_CAPABILITIES"
  | "PARAMETERS_UPDATED";

export interface AutomationAuditEntry {
  id: string;
  at: string;
  actor: string;
  kind: AutomationAuditKind;
  actionKey?: string;
  ruleId?: string;
  ruleName?: string;
  connectorId?: string;
  connectorName?: string;
  detail: string;
  decisionId?: string;
  outcome?: "SUCCESS" | "FAILED";
}

/* ------------------------------------------------ system parameters */

export type ParameterType = "number" | "text";

export interface SystemParameter {
  key: string;
  label: string;
  group: "NIGERIA" | "NIGER_REPUBLIC" | "FEE_ENGINE" | "REGULATORY_REPORTING";
  type: ParameterType;
  value: string;
  currency?: string;
  locked?: boolean;
  lockedHint?: string;
}

export interface AdminConfigOverview {
  connectors: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byRole: Record<string, number>;
  };
  automationRules: { total: number; enabled: number; dryRun: number };
  recentAudit: AutomationAuditEntry[];
  demoProviders: { code: string; name: string; country: string }[];
}
