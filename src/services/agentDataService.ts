import {
  AgentUser,
  AgentLiquidity,
  AgentCustomer,
  AgencyTransaction,
  AgentCommissionRecord,
  DailyCashReconciliation,
  AgentTerminalInfo,
  AgencyRiskAlert,
  AgentCurrency,
  FloatTopUpRequest,
  SubAgent,
  FloatAllocationRecord,
} from "@/types/agent";

// ==========================================
// 1. AUTHENTICATED AGENT PROFILE
// ==========================================
export const CURRENT_AGENT: AgentUser = {
  id: "ag-usr-0042",
  agentCode: "AG-NG-KAN-0042",
  agentName: "Alhaji Garba Sani",
  businessName: "Kano Central Agency Banking Outpost",
  phone: "+234 802 998 1234",
  email: "garba.kano@korieagent.com",
  country: "NG",
  countryName: "Nigeria",
  stateOrRegion: "Kano State",
  cityOrLGA: "Fagge LGA, Kano Central",
  tier: "SUPER_AGENT",
  status: "ACTIVE",
  kycStatus: "VERIFIED",
  preferredLanguage: "ha",
  terminalId: "POS-NG-KAN-0042",
  dailyCashLimit: 10000000,
  dailyCashSpent: 1450000,
  commissionBalance: 42500,
};

// ==========================================
// 2. AGENT FLOAT & LIQUIDITY REPOSITORY
// ==========================================
export const INITIAL_LIQUIDITY: AgentLiquidity = {
  walletFloat: 3200000,
  cashInHand: 850000,
  totalLiquidity: 4050000,
  reservedFloat: 250000,
  pendingSettlement: 180000,
  currency: "NGN",
  health: "HEALTHY",
  cashThresholdMin: 200000,
  todayCashInVolume: 840000,
  todayCashOutVolume: 610000,
};

// ==========================================
// 3. FREQUENT & RECENT AGENCY CUSTOMERS
// ==========================================
export const AGENT_CUSTOMERS: AgentCustomer[] = [
  {
    id: "cust-01",
    fullName: "Aisha Mohammed",
    phone: "+234 803 123 4567",
    accountNumberMasked: "0142****91",
    bankName: "Guaranty Trust Bank (GTBank)",
    bankCode: "058",
    kycTier: "TIER_2",
    isVerified: true,
    totalTransactionsCount: 34,
    lastActivityDate: "2026-09-03",
  },
  {
    id: "cust-02",
    fullName: "Mamadou Oumarou",
    phone: "+227 90 12 34 56",
    accountNumberMasked: "NE0200****23",
    bankName: "Coris Bank Niger Republic",
    bankCode: "NE020",
    kycTier: "TIER_2",
    isVerified: true,
    totalTransactionsCount: 18,
    lastActivityDate: "2026-09-02",
  },
  {
    id: "cust-03",
    fullName: "Aliyu Harouna",
    phone: "+234 802 449 8812",
    accountNumberMasked: "2019****03",
    bankName: "Zenith Bank",
    bankCode: "057",
    kycTier: "TIER_1",
    isVerified: true,
    totalTransactionsCount: 12,
    lastActivityDate: "2026-08-30",
  },
  {
    id: "cust-04",
    fullName: "Zainab Moussa SARL",
    phone: "+227 96 44 11 22",
    accountNumberMasked: "NE0140****00",
    bankName: "Banque Agricole du Niger (BAGRI)",
    bankCode: "NE014",
    kycTier: "TIER_3",
    isVerified: true,
    totalTransactionsCount: 45,
    lastActivityDate: "2026-08-28",
  },
];

// ==========================================
// 4. AGENCY TRANSACTIONS FEED
// ==========================================
export const AGENCY_TRANSACTIONS: AgencyTransaction[] = [
  {
    id: "ag-tx-001",
    reference: "KP-2026-CSHOUT-88120",
    providerReference: "PRV-NIP-991204",
    type: "CASH_OUT",
    title: "Customer Cash-Out Withdrawal",
    amount: 50000,
    customerFee: 100,
    agentCommission: 25,
    totalAmount: 50100,
    currency: "NGN",
    status: "SUCCESSFUL",
    customerName: "Aisha Mohammed",
    customerPhone: "+234 803 123 4567",
    customerAccount: "0142981891",
    customerBank: "Guaranty Trust Bank (GTBank)",
    terminalId: "POS-NG-KAN-0042",
    agentId: "ag-usr-0042",
    createdAt: "2026-09-03T11:15:00Z",
    completedAt: "2026-09-03T11:15:02Z",
  },
  {
    id: "ag-tx-002",
    reference: "KP-2026-CSHIN-88119",
    providerReference: "PRV-INW-881203",
    type: "CASH_IN",
    title: "Customer Cash-In Account Deposit",
    amount: 100000,
    customerFee: 150,
    agentCommission: 45,
    totalAmount: 100000,
    currency: "NGN",
    status: "SUCCESSFUL",
    customerName: "Aliyu Harouna",
    customerPhone: "+234 802 449 8812",
    customerAccount: "2019481203",
    customerBank: "Zenith Bank",
    terminalId: "POS-NG-KAN-0042",
    agentId: "ag-usr-0042",
    createdAt: "2026-09-03T10:30:00Z",
    completedAt: "2026-09-03T10:30:02Z",
  },
  {
    id: "ag-tx-003",
    reference: "KP-2026-BILL-88118",
    type: "BILL_ELECTRICITY",
    title: "KEDCO Prepaid Electricity Vending",
    amount: 15000,
    customerFee: 100,
    agentCommission: 20,
    totalAmount: 15100,
    currency: "NGN",
    status: "SUCCESSFUL",
    customerName: "Suleiman Dan-Kano",
    billerProvider: "KEDCO Kano",
    billerToken: "4819-2049-1823-9940-1209",
    terminalId: "POS-NG-KAN-0042",
    agentId: "ag-usr-0042",
    createdAt: "2026-09-03T09:45:00Z",
    completedAt: "2026-09-03T09:45:02Z",
  },
  {
    id: "ag-tx-004",
    reference: "KP-2026-AIRT-88117",
    type: "BILL_AIRTIME",
    title: "MTN VTU Airtime Top-Up",
    amount: 5000,
    customerFee: 0,
    agentCommission: 15,
    totalAmount: 5000,
    currency: "NGN",
    status: "SUCCESSFUL",
    customerName: "Hauwa Bello",
    customerPhone: "+234 803 999 4412",
    billerProvider: "MTN Nigeria",
    terminalId: "POS-NG-KAN-0042",
    agentId: "ag-usr-0042",
    createdAt: "2026-09-03T08:20:00Z",
    completedAt: "2026-09-03T08:20:01Z",
  },
];

// ==========================================
// 5. DAILY CASH RECONCILIATIONS
// ==========================================
export const DAILY_RECONCILIATIONS: DailyCashReconciliation[] = [
  {
    id: "rec-2026-09-02",
    reconciliationDate: "2026-09-02",
    openingCash: 500000,
    todayCashIn: 1200000,
    todayCashOut: 850000,
    expectedClosingCash: 850000,
    actualPhysicalCash: 850000,
    difference: 0,
    status: "APPROVED",
    notes: "Physical cash vault balanced with Providus clearing ledger.",
    submittedAt: "2026-09-02T20:30:00Z",
    reviewedBy: "Operations Supervisor (Kano Desk)",
  },
];

// ==========================================
// 6. SMART POS TERMINAL TELEMETRY
// ==========================================
export const ACTIVE_TERMINAL: AgentTerminalInfo = {
  terminalId: "POS-NG-KAN-0042",
  model: "KoriePay Smart Android POS V3",
  serialNumber: "KP-TER-99481203",
  status: "ACTIVE",
  batteryLevel: 92,
  networkType: "4G",
  signalStrength: 4,
  lastSyncTime: new Date().toISOString(),
  appVersion: "v2.8.4-prod",
};

// ==========================================
// 7. AGENCY RISK & FRAUD ALERTS
// ==========================================
export const AGENCY_ALERTS: AgencyRiskAlert[] = [
  {
    id: "alt-01",
    severity: "INFO",
    title: "Providus Bank & Coris Bank Nodes Online",
    description: "Average interbank response time 142ms. Real-time agency float sweeping active.",
    timestamp: "10 mins ago",
    isResolved: true,
  },
  {
    id: "alt-02",
    severity: "LOW",
    title: "Cash Liquidity Watch Threshold",
    description: "Physical cash position currently ₦850,000. Operating above ₦200,000 threshold.",
    timestamp: "1 hour ago",
    isResolved: true,
  },
];

// ==========================================
// 8. HELPER CALCULATORS
// ==========================================
export function calculateAgentCommission(type: string, amount: number): {
  customerFee: number;
  agentCommission: number;
} {
  switch (type) {
    case "CASH_OUT":
      return { customerFee: 100, agentCommission: 25 };
    case "CASH_IN":
      return { customerFee: 100, agentCommission: 35 };
    case "BILL_ELECTRICITY":
      return { customerFee: 100, agentCommission: 20 };
    case "BILL_AIRTIME":
      return { customerFee: 0, agentCommission: amount * 0.02 };
    default:
      return { customerFee: 50, agentCommission: 15 };
  }
}

/**
 * Derives a real commission breakdown by transaction type from the agent's
 * actual transaction feed instead of a hardcoded display array. Only
 * SUCCESSFUL transactions count toward earned commission.
 */
export function computeCommissionBreakdown(transactions: AgencyTransaction[]): {
  service: string;
  type: string;
  earned: number;
  count: number;
}[] {
  const labels: Record<string, string> = {
    CASH_IN: "Cash-In (Deposits)",
    CASH_OUT: "Cash-Out (Withdrawals)",
    TRANSFER_NIP: "Interbank Transfers",
    TRANSFER_CROSS_BORDER: "Cross-Border Transfers",
    BILL_AIRTIME: "Airtime & Data VTU",
    BILL_DATA: "Airtime & Data VTU",
    BILL_ELECTRICITY: "Electricity Token Vending",
    BILL_CABLE_TV: "Cable TV Vending",
  };

  const byType = new Map<string, { earned: number; count: number }>();

  for (const tx of transactions) {
    if (tx.status !== "SUCCESSFUL") continue;
    const key = tx.type;
    const existing = byType.get(key) || { earned: 0, count: 0 };
    existing.earned += tx.agentCommission;
    existing.count += 1;
    byType.set(key, existing);
  }

  return Array.from(byType.entries())
    .map(([type, stats]) => ({
      service: labels[type] || type,
      type,
      earned: stats.earned,
      count: stats.count,
    }))
    .sort((a, b) => b.earned - a.earned);
}

/**
 * Sums commission earned across transactions that fall within `days` of now.
 * Used to compute weekly/monthly commission totals from real data instead of
 * static placeholder figures.
 */
export function computeCommissionForPeriod(transactions: AgencyTransaction[], days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return transactions
    .filter((tx) => tx.status === "SUCCESSFUL" && new Date(tx.createdAt).getTime() >= cutoff)
    .reduce((sum, tx) => sum + tx.agentCommission, 0);
}

// ==========================================
// 9. FLOAT TOP-UP REQUESTS (pending approval queue)
// ==========================================
export const FLOAT_TOPUP_REQUESTS: FloatTopUpRequest[] = [
  {
    id: "ftr-2026-0031",
    agentId: "ag-usr-0042",
    amount: 500000,
    currency: "NGN",
    method: "BANK_TRANSFER",
    proofReference: "NIP-TRF-88213094",
    status: "APPROVED",
    requestedAt: "2026-09-02T08:15:00Z",
    reviewedAt: "2026-09-02T08:22:00Z",
    reviewedBy: "Treasury Ops (Kano Desk)",
    notes: "Matched incoming NUBAN credit. Float credited instantly.",
  },
  {
    id: "ftr-2026-0030",
    agentId: "ag-usr-0042",
    amount: 250000,
    currency: "NGN",
    method: "CASH_DEPOSIT_HUB",
    proofReference: "CIT-DEP-99120",
    status: "REJECTED",
    requestedAt: "2026-08-30T14:05:00Z",
    reviewedAt: "2026-08-30T15:40:00Z",
    reviewedBy: "Treasury Ops (Kano Desk)",
    notes: "Deposit slip amount mismatch — resubmit with correct CIT reference.",
  },
];

// ==========================================
// 10. SUB-AGENT / TEAM ROSTER (for SUPER_AGENT tier)
// ==========================================
export const SUB_AGENTS: SubAgent[] = [
  {
    id: "sub-ag-101",
    agentCode: "AG-NG-KAN-0101",
    agentName: "Fatima Usman",
    businessName: "Kantin Kwari Float Point 4",
    phone: "+234 803 221 5590",
    country: "NG",
    cityOrLGA: "Kantin Kwari, Kano",
    status: "LOW_FLOAT",
    walletFloat: 85000,
    cashInHand: 210000,
    currency: "NGN",
    cashThresholdMin: 250000,
    health: "LOW",
    dailyCashLimit: 5000000,
    dailyCashSpent: 1180000,
    todayTransactionCount: 22,
    todayVolume: 1180000,
    onboardedAt: "2026-03-14T00:00:00Z",
    lastActiveAt: "2026-09-05T09:40:00Z",
  },
  {
    id: "sub-ag-102",
    agentCode: "AG-NG-KAN-0102",
    agentName: "Ibrahim Suleiman",
    businessName: "Sabon Gari Digital Kiosk",
    phone: "+234 802 774 1123",
    country: "NG",
    cityOrLGA: "Sabon Gari, Kano",
    status: "ACTIVE",
    walletFloat: 1450000,
    cashInHand: 620000,
    currency: "NGN",
    cashThresholdMin: 200000,
    health: "HEALTHY",
    dailyCashLimit: 8000000,
    dailyCashSpent: 2340000,
    todayTransactionCount: 41,
    todayVolume: 2340000,
    onboardedAt: "2026-01-22T00:00:00Z",
    lastActiveAt: "2026-09-05T10:12:00Z",
  },
  {
    id: "sub-ag-103",
    agentCode: "AG-NE-MRD-0103",
    agentName: "Zeinabou Abdou",
    businessName: "Maradi Cross-Border Agency Point",
    phone: "+227 90 55 12 40",
    country: "NE",
    cityOrLGA: "Maradi Grand Marché",
    status: "ACTIVE",
    walletFloat: 980000,
    cashInHand: 340000,
    currency: "XOF",
    cashThresholdMin: 150000,
    health: "WATCH",
    dailyCashLimit: 6000000,
    dailyCashSpent: 1620000,
    todayTransactionCount: 15,
    todayVolume: 1620000,
    onboardedAt: "2026-05-02T00:00:00Z",
    lastActiveAt: "2026-09-05T08:55:00Z",
  },
  {
    id: "sub-ag-104",
    agentCode: "AG-NG-KAN-0104",
    agentName: "Chinedu Okafor",
    businessName: "Fagge Road Agency Outlet",
    phone: "+234 806 442 9081",
    country: "NG",
    cityOrLGA: "Fagge LGA, Kano",
    status: "SUSPENDED",
    walletFloat: 0,
    cashInHand: 0,
    currency: "NGN",
    cashThresholdMin: 200000,
    health: "CRITICAL",
    dailyCashLimit: 4000000,
    dailyCashSpent: 0,
    todayTransactionCount: 0,
    todayVolume: 0,
    onboardedAt: "2026-02-10T00:00:00Z",
    lastActiveAt: "2026-08-21T00:00:00Z",
  },
];

// ==========================================
// 11. FLOAT ALLOCATION HISTORY (Super Agent ↔ Sub-Agent)
// ==========================================
export const FLOAT_ALLOCATIONS: FloatAllocationRecord[] = [
  {
    id: "falc-9001",
    subAgentId: "sub-ag-102",
    subAgentName: "Ibrahim Suleiman",
    direction: "ALLOCATE",
    amount: 500000,
    currency: "NGN",
    timestamp: "2026-09-04T16:20:00Z",
    note: "Weekly float replenishment ahead of Kano market day.",
  },
  {
    id: "falc-9000",
    subAgentId: "sub-ag-104",
    subAgentName: "Chinedu Okafor",
    direction: "RECLAIM",
    amount: 320000,
    currency: "NGN",
    timestamp: "2026-08-21T11:10:00Z",
    note: "Reclaimed full float balance ahead of compliance suspension.",
  },
];
