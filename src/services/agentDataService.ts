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
  tier: "TIER_2",
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
