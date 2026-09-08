// =============================================================================
// File: src/lib/agent/BillerServiceEngine.ts
// Description: Stage-4 agent bill-pay engine — biller catalog (seed truth) and
// cash-at-till bill payments journaled through the ledger. The customer pays
// principal + service charge in cash; journals:
//   DR acc_asset_agent_cash_ngn (principal + charge)
//   CR acc_liab_biller_settlements_ngn (principal)
//   CR acc_liab_agent_commissions_payable_ngn (agent share of charge)
//   CR acc_rev_tx_fees_ngn (platform share of charge)
// Fee split follows the shared agency commission rule RULE_AGENCY_COMMISSION_60_40_SPLIT:
// 60% of the *biller's catalogued service charge* accrues to the agent, 40% is
// retained platform fee revenue. The service charge is fixed per biller in the
// catalog — it is deliberately not fed through FeeAndCommissionEngine.calculateAgencySplit,
// which sizes a customer fee from the principal for the cash rails.
// Every payment is idempotent via AgentKioskStore idempotency map.
// =============================================================================

import { AgentKioskStore } from "./AgentKioskStore";
import { LedgerService } from "../services/LedgerService";
import { AgentPortalOperationType } from "@/types/agentPortal";
import { AgentBiller, AgentBillerCategory } from "@/types/agentProducts";
import { AGENT_PORTAL_CURRENCY, AGENT_PORTAL_ENGINE_AGENT_ID, AGENT_PORTAL_TERMINAL_ID } from "./agentPortalConstants";

export const AGENT_SINGLE_OP_LIMIT_NGN = 200_000;

const ORG_ID = "org_kor_99182";
const AGENT_CASH = "acc_asset_agent_cash_ngn";
const BILLER_SETTLEMENTS = "acc_liab_biller_settlements_ngn";
const COMMISSIONS_PAYABLE = "acc_liab_agent_commissions_payable_ngn";
const FEE_REVENUE = "acc_rev_tx_fees_ngn";

function wholeToMinor(n: number): number {
  return Math.round(n * 100);
}

function agentId(): string {
  return AGENT_PORTAL_ENGINE_AGENT_ID;
}

/** Seeded biller catalog — engine truth for names, categories, charges, ranges. */
const BILLER_SEEDS: AgentBiller[] = [
  // Airtime
  { billerId: "BLR-MTN-AIRTIME-NG", category: "AIRTIME", name: "MTN Airtime", serviceChargeNgn: 50, minAmountNgn: 50, maxAmountNgn: 50_000, denominationsNgn: [100, 200, 500, 1000, 2000, 5000], status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  { billerId: "BLR-AIRTEL-AIRTIME-NG", category: "AIRTIME", name: "Airtel Airtime", serviceChargeNgn: 50, minAmountNgn: 50, maxAmountNgn: 50_000, denominationsNgn: [100, 200, 500, 1000, 2000, 5000], status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  { billerId: "BLR-GLO-AIRTIME-NG", category: "AIRTIME", name: "Glo Airtime", serviceChargeNgn: 50, minAmountNgn: 50, maxAmountNgn: 50_000, denominationsNgn: [100, 200, 500, 1000, 2000, 5000], status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  { billerId: "BLR-9MOBILE-AIRTIME-NG", category: "AIRTIME", name: "9mobile Airtime", serviceChargeNgn: 50, minAmountNgn: 50, maxAmountNgn: 50_000, denominationsNgn: [100, 200, 500, 1000, 2000, 5000], status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  // Data
  { billerId: "BLR-MTN-DATA-NG", category: "DATA", name: "MTN Data Bundle", serviceChargeNgn: 100, minAmountNgn: 200, maxAmountNgn: 100_000, denominationsNgn: [500, 1000, 2000, 5000, 10000], status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  { billerId: "BLR-AIRTEL-DATA-NG", category: "DATA", name: "Airtel Data Bundle", serviceChargeNgn: 100, minAmountNgn: 200, maxAmountNgn: 100_000, denominationsNgn: [500, 1000, 2000, 5000, 10000], status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  // Electricity
  { billerId: "BLR-AEDC-POSTPAID-NG", category: "ELECTRICITY", name: "Abuja Electricity (AEDC)", serviceChargeNgn: 150, minAmountNgn: 500, maxAmountNgn: 200_000, status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  { billerId: "BLR-IKEDC-POSTPAID-NG", category: "ELECTRICITY", name: "Ikeja Electric (IKEDC)", serviceChargeNgn: 150, minAmountNgn: 500, maxAmountNgn: 200_000, status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  // Cable TV
  { billerId: "BLR-DSTV-NG", category: "CABLE_TV", name: "DStv", serviceChargeNgn: 100, minAmountNgn: 1_000, maxAmountNgn: 60_000, denominationsNgn: [3500, 6000, 9500, 14500], status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  { billerId: "BLR-GOTV-NG", category: "CABLE_TV", name: "GOtv", serviceChargeNgn: 100, minAmountNgn: 500, maxAmountNgn: 25_000, denominationsNgn: [2300, 3900], status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  // Internet + water
  { billerId: "BLR-SPECTRANET-NG", category: "INTERNET", name: "Spectranet Internet", serviceChargeNgn: 100, minAmountNgn: 1_000, maxAmountNgn: 50_000, status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
  { billerId: "BLR-FCT-WATER-NG", category: "WATER", name: "FCT Water Board", serviceChargeNgn: 50, minAmountNgn: 200, maxAmountNgn: 20_000, status: "ACTIVE", feeRuleApplied: "RULE_AGENCY_COMMISSION_60_40_SPLIT" },
];

export class BillerServiceEngine {
  private static instance: BillerServiceEngine;

  public static getInstance(): BillerServiceEngine {
    if (!BillerServiceEngine.instance) BillerServiceEngine.instance = new BillerServiceEngine();
    return BillerServiceEngine.instance;
  }

  public listBillers(category?: AgentBillerCategory): AgentBiller[] {
    const all = BILLER_SEEDS.filter((b) => b.status === "ACTIVE");
    return category ? all.filter((b) => b.category === category) : all;
  }

  public getBiller(billerId: string): AgentBiller | undefined {
    return BILLER_SEEDS.find((b) => b.billerId === billerId);
  }

  public listCategories(): AgentBillerCategory[] {
    return Array.from(new Set(BILLER_SEEDS.map((b) => b.category)));
  }

  /** Payments recorded on this portal (from the kiosk operation stream). */
  public listPayments(limit = 100): AgentPortalOperationType[] {
    return AgentKioskStore.getOperations(agentId(), 500)
      .filter((op) => op.type === "BILL_PAYMENT")
      .slice(0, limit);
  }

  public async payBill(params: {
    billerId: string;
    amount: number;
    idempotencyKey: string;
    customerName?: string;
    customerPhone?: string;
  }): Promise<{ success: boolean; operation?: AgentPortalOperationType; code?: string; message?: string }> {
    const { billerId, amount, idempotencyKey } = params;

    if (!idempotencyKey || idempotencyKey.length < 8) {
      return { success: false, code: "IDEMPOTENCY_REQUIRED", message: "An idempotency key is required." };
    }
    const existing = AgentKioskStore.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { success: true, operation: existing, code: "IDEMPOTENT_REPLAY" };
    }
    const biller = this.getBiller(billerId);
    if (!biller || biller.status !== "ACTIVE") {
      return { success: false, code: "BILLER_INACTIVE", message: "That biller is not currently available at this terminal." };
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, code: "INVALID_AMOUNT", message: "Enter a positive whole-₦ amount." };
    }
    if (amount < biller.minAmountNgn || amount > biller.maxAmountNgn) {
      return {
        success: false,
        code: "OUTSIDE_BILLER_RANGE",
        message: `${biller.name} accepts ₦${biller.minAmountNgn.toLocaleString()} – ₦${biller.maxAmountNgn.toLocaleString()}.`,
      };
    }
    if (amount > AGENT_SINGLE_OP_LIMIT_NGN) {
      return { success: false, code: "ABOVE_SINGLE_LIMIT", message: `Amount exceeds the single-transaction limit of ₦${AGENT_SINGLE_OP_LIMIT_NGN.toLocaleString()}.` };
    }

    const serviceCharge = biller.serviceChargeNgn;
    const agentCommission = Math.round((serviceCharge * 60) / 100);
    const platformFee = serviceCharge - agentCommission;
    const total = amount + serviceCharge;

    const ledgerTx = await LedgerService.postTransaction({
      orgId: ORG_ID,
      transactionReference: `KP-AGT-BILL-${idempotencyKey.slice(0, 18)}`,
      description: `Agent bill payment — ${biller.name}`,
      currency: AGENT_PORTAL_CURRENCY,
      entries: [
        { accountId: AGENT_CASH, entryType: "DEBIT", amount: wholeToMinor(total), narration: `Bill payment cash collected at till — ${biller.name}` },
        { accountId: BILLER_SETTLEMENTS, entryType: "CREDIT", amount: wholeToMinor(amount), narration: `Biller settlement payable — ${biller.name}` },
        { accountId: COMMISSIONS_PAYABLE, entryType: "CREDIT", amount: wholeToMinor(agentCommission), narration: `Agent commission payable — ${biller.name} bill service charge` },
        { accountId: FEE_REVENUE, entryType: "CREDIT", amount: wholeToMinor(platformFee), narration: `Platform fee revenue — ${biller.name} bill service charge` },
      ],
    });

    const till = AgentKioskStore.getRunningTill();
    AgentKioskStore.setRunningTill(till + total);

    const now = new Date().toISOString();
    const operation: AgentPortalOperationType = {
      id: `ag-op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference: ledgerTx.transaction.transactionReference,
      ledgerJournalId: ledgerTx.transaction.id,
      type: "BILL_PAYMENT",
      title: `${biller.name} payment`,
      amount,
      customerFee: serviceCharge,
      agentCommission,
      totalAmount: total,
      currency: AGENT_PORTAL_CURRENCY,
      status: "SUCCESSFUL",
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      terminalId: AGENT_PORTAL_TERMINAL_ID,
      agentId: agentId(),
      feeRuleApplied: biller.feeRuleApplied,
      service: "BILL",
      serviceRef: biller.billerId,
      createdAt: now,
      completedAt: now,
    };
    AgentKioskStore.addOperation(agentId(), operation);
    AgentKioskStore.recordIdempotencyKey(idempotencyKey, operation.id);
    return { success: true, operation };
  }
}
