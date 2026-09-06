import { AgentUser, AgentLiquidity, AgencyTransaction } from "@/types/agent";

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
// HELPER CALCULATORS
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

