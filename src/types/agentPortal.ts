// =============================================================================
// File: src/types/agentPortal.ts
// Description: Agent kiosk portal view models — engine-shaped data projected
// for the agent UI by AgentPortalEngine. Money fields are WHOLE currency units
// (ledger conversions happen engine-side), matching customer-portal display
// conventions. Demo runtime: the agent persona is resolved server-side from
// the session (engine agent agt-ng-001) — never from the browser.
// =============================================================================

import { SupportedLanguage } from "./customer";

export type AgentPortalCurrency = "NGN" | "XOF";

export interface AgentPortalProfile {
  id: string;
  agentCode: string;
  tradingName: string;
  legalName: string;
  phone: string;
  email: string;
  country: "NG" | "NE";
  stateOrProvince: string;
  lgaOrDistrict: string;
  tier: string;
  status: string;
  kycStatus: string;
  qualityScore: number;
  riskTier: string;
  floatBalance: number;
  commissionEarned24h: number;
  successRate24h: number;
  dailyTransactionLimit: number;
  singleTransactionLimit: number;
  maxCashHolding: number;
  preferredLanguage: SupportedLanguage;
  activeTerminalId: string;
}

export interface AgentPortalTerminal {
  terminalId: string;
  serialNumber: string;
  terminalType: string;
  deviceId?: string;
  status: string;
  capabilities: string[];
  lastHeartbeatAt: string;
  modelLabel: string;
}

export interface AgentPortalFloat {
  walletFloat: number;
  reservedFloat: number;
  availableFloat: number;
  currency: AgentPortalCurrency;
}

export interface AgentPortalTill {
  locationId: string;
  locationName: string;
  expectedPhysicalCash: number;
  availablePhysicalCash: number;
  reservedCash: number;
  targetSafetyBuffer: number;
  liquidityStatus: string;
  lastCountedAt: string;
}

export interface AgentPortalKpi {
  todayTransactionCount: number;
  todayVolume: number;
  todayFeeRevenue: number;
  todayCommissionEarned: number;
  successRatePercent: number;
  openCountToday: number;
  avgResponseSeconds: number;
}

export interface AgentPortalOperationType {
  id: string;
  reference: string;
  ledgerJournalId?: string;
  type: string;
  title: string;
  amount: number;
  customerFee: number;
  agentCommission: number;
  totalAmount: number;
  currency: AgentPortalCurrency;
  status: string;
  customerName?: string;
  customerPhone?: string;
  customerAccount?: string;
  customerBank?: string;
  terminalId: string;
  agentId: string;
  feeRuleApplied?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AgentPortalReconciliation {
  id: string;
  reconciliationDate: string;
  expectedCash: number;
  totalCounted: number;
  varianceAmount: number;
  status: string;
  denominationBreakdown: Record<string, number>;
  submittedAt: string;
}

export interface AgentPortalSettlement {
  id: string;
  reference: string;
  ledgerJournalId?: string;
  amount: number;
  kind: "FLOAT_SWEEP" | "COMMISSION_PAYOUT";
  status: string;
  destinationAccountMasked: string;
  destinationBank: string;
  requestedAt: string;
  errorMessage?: string;
}

export interface AgentPortalComplaint {
  id: string;
  complaintReference: string;
  category: string;
  priority: string;
  status: string;
  transactionReference?: string;
  description: string;
  disputedAmount: number;
  currency: AgentPortalCurrency;
  slaDueAt: string;
  isSlaBreached: boolean;
  createdAt: string;
}

export interface AgentPortalAlert {
  id: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH";
  title: string;
  description: string;
  createdAt: string;
  source: "ENGINE" | "DERIVED";
}

export interface AgentPortalCustomerSummary {
  id: string;
  fullName: string;
  phone: string;
  maskedAccount?: string;
  bankName?: string;
  source: "SERVED" | "BOOKMARKED" | "ONBOARDED";
  lastServedAt?: string;
  transactionCount: number;
  totalVolume: number;
  onboardedCustomerId?: string;
  onboardedCustomerCode?: string;
  kycTier?: string;
}

export interface AgentPortalSettingsView {
  preferredLanguage: SupportedLanguage;
}

export interface AgentPortalSummary {
  agent: AgentPortalProfile;
  terminal: AgentPortalTerminal;
  float: AgentPortalFloat;
  till: AgentPortalTill;
  kpis: AgentPortalKpi;
  recentOperations: AgentPortalOperationType[];
  reconciliations: AgentPortalReconciliation[];
  settlements: AgentPortalSettlement[];
  complaints: AgentPortalComplaint[];
  alerts: AgentPortalAlert[];
  customers: AgentPortalCustomerSummary[];
  availableCommission: number;
  currency: AgentPortalCurrency;
  generatedAt: string;
}

export type AgentPortalOperationKind = "CASH_IN" | "CASH_OUT" | "TRANSFER_NIP";

export interface AgentOperationRequest {
  kind: AgentPortalOperationKind;
  amount: number; // whole units
  customerName: string;
  customerPhone?: string;
  customerAccount?: string;
  customerBank?: string;
  idempotencyKey: string;
}

export interface AgentOperationResult {
  success: boolean;
  operation?: AgentPortalOperationType;
  code?: string;
  message?: string;
}
