// =============================================================================
// File: src/lib/agent/FxDeskServiceEngine.ts
// Description: Stage-4 BDC corridor FX desk for the agent portal (NGN till).
// RATE TRUTH: reference rates are read from the treasury FxPositionEngine
// (NGN/XOF 0.3920 XOF per ₦ seed). The desk quotes around the reference with a
// seeded spread (buy 250bps / sell 200bps) and journals the NGN leg:
//   BUY_XOF (customer gives ₦ for XOF):   DR agent cash (charge)
//                                         CR fx corridor payable (ref value)
//                                         CR commissions payable (margin)
//   SELL_XOF (customer gives XOF for ₦):  DR corridor advance (ref value)
//                                         CR agent cash (payout)
//                                         CR commissions payable (margin)
// XOF legs settle in the treasury corridor float — a documented seam, not a
// till fiction (no fake XOF cash on the naira till). Orders persist in a
// file-backed store; the kiosk operation stream records each completed order.
// =============================================================================

import fs from "fs";
import path from "path";
import { AgentKioskStore } from "./AgentKioskStore";
import { LedgerService } from "../services/LedgerService";
import { FxPositionEngine } from "../treasury/FxPositionEngine";
import { AgentPortalOperationType } from "@/types/agentPortal";
import { AgentFxDirection, AgentFxOrder } from "@/types/agentProducts";
import { AGENT_PORTAL_CURRENCY, AGENT_PORTAL_ENGINE_AGENT_ID, AGENT_PORTAL_TERMINAL_ID } from "./agentPortalConstants";
import { AGENT_SINGLE_OP_LIMIT_NGN } from "./BillerServiceEngine";

const STORE_PATH = process.env.FX_DESK_STORE_PATH || "/tmp/korie-fx-orders.json";
const ORG_ID = "org_kor_99182";
const AGENT_CASH = "acc_asset_agent_cash_ngn";
const CORRIDOR_PAYABLE = "acc_liab_fx_corridor_payable_ngn";
const CORRIDOR_ADVANCE = "acc_asset_fx_corridor_advance_ngn";
const COMMISSIONS_PAYABLE = "acc_liab_agent_commissions_payable_ngn";

/** Desk config seeds (engine truth): margin bps per direction + daily naira cap. */
const DESK_CONFIG = {
  BUY_XOF: { marginBps: 250 }, // customer buys XOF → spread above reference
  SELL_XOF: { marginBps: 200 }, // customer sells XOF → spread below reference
  minXofAmount: 1_000,
  dailyNgnCap: 1_000_000,
};

function agentId(): string {
  return AGENT_PORTAL_ENGINE_AGENT_ID;
}

function wholeToMinor(n: number): number {
  return Math.round(n * 100);
}

function nairaPerXof(referenceXofPerNgn: number): number {
  return 1 / referenceXofPerNgn;
}

interface FxState {
  orders: AgentFxOrder[];
}

class FxDeskStore {
  private state: FxState = { orders: [] };

  private hydrate() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
      if (Array.isArray(data.orders)) this.state.orders = data.orders;
    } catch {
      /* corrupt/missing store — keep empty state */
    }
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.state));
    } catch {
      /* non-fatal */
    }
  }

  get orders(): AgentFxOrder[] {
    this.hydrate();
    return [...this.state.orders];
  }

  upsert(order: AgentFxOrder) {
    this.hydrate();
    const idx = this.state.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) this.state.orders[idx] = order;
    else this.state.orders.unshift(order);
    this.persist();
  }
}

const store = new FxDeskStore();

export class FxDeskServiceEngine {
  private static instance: FxDeskServiceEngine;

  public static getInstance(): FxDeskServiceEngine {
    if (!FxDeskServiceEngine.instance) FxDeskServiceEngine.instance = new FxDeskServiceEngine();
    return FxDeskServiceEngine.instance;
  }

  /** Corridor reference from the treasury engine (engine truth, XOF per ₦). */
  public corridorReference(): { pair: string; referenceRateXofPerNgn: number; status: string } | null {
    const pos = FxPositionEngine.getPosition("NGN/XOF");
    if (!pos) return null;
    return { pair: pos.currencyPair, referenceRateXofPerNgn: pos.currentReferenceRate, status: pos.status };
  }

  public usdMarketCard(): { pair: string; referenceRate: number; exposureBaseMinor: number; status: string } | null {
    const pos = FxPositionEngine.getPosition("USD/NGN");
    if (!pos) return null;
    return { pair: pos.currencyPair, referenceRate: pos.currentReferenceRate, exposureBaseMinor: pos.netExposureBaseMinor, status: pos.status };
  }

  public listOrders(limit = 100): AgentFxOrder[] {
    return store.orders.slice(0, limit);
  }

  /** Today's completed naira volume for the daily cap check. */
  private todayNgnVolume(): number {
    const today = new Date().toISOString().slice(0, 10);
    return store.orders
      .filter((o) => o.status === "COMPLETED" && o.createdAt.slice(0, 10) === today)
      .reduce((s, o) => s + o.ngnAmount, 0);
  }

  /** Quote for display — engine-derived, never a page constant. */
  public quote(direction: AgentFxDirection, xofAmount: number): {
    referenceRateXofPerNgn: number;
    referenceNairaPerXof: number;
    appliedNairaPerXof: number;
    ngnAmount: number;
    marginNgn: number;
  } | null {
    const corridor = this.corridorReference();
    if (!corridor) return null;
    const refNaira = nairaPerXof(corridor.referenceRateXofPerNgn);
    const margin = DESK_CONFIG[direction].marginBps / 10000;
    const applied = direction === "BUY_XOF" ? refNaira * (1 + margin) : refNaira * (1 - margin);
    const ngn = direction === "BUY_XOF" ? Math.round(xofAmount * applied) : Math.round(xofAmount * applied);
    const refValue = Math.round(xofAmount * refNaira);
    return {
      referenceRateXofPerNgn: corridor.referenceRateXofPerNgn,
      referenceNairaPerXof: refNaira,
      appliedNairaPerXof: applied,
      ngnAmount: ngn,
      marginNgn: Math.abs(ngn - refValue),
    };
  }

  public async convert(params: {
    direction: AgentFxDirection;
    xofAmount: number;
    idempotencyKey: string;
    customerName?: string;
    customerPhone?: string;
  }): Promise<{ success: boolean; order?: AgentFxOrder; code?: string; message?: string }> {
    const { direction, xofAmount, idempotencyKey } = params;

    if (!idempotencyKey || idempotencyKey.length < 8) {
      return { success: false, code: "IDEMPOTENCY_REQUIRED", message: "An idempotency key is required." };
    }
    const existing = AgentKioskStore.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const cached = store.orders.find((o) => o.orderReference === existing.serviceRef);
      return { success: true, order: cached, code: "IDEMPOTENT_REPLAY" };
    }
    if (!Number.isInteger(xofAmount) || xofAmount < DESK_CONFIG.minXofAmount) {
      return { success: false, code: "BELOW_MINIMUM", message: `The corridor desk minimum is ${DESK_CONFIG.minXofAmount.toLocaleString()} XOF.` };
    }
    const quote = this.quote(direction, xofAmount);
    if (!quote) return { success: false, code: "CORRIDOR_UNAVAILABLE", message: "The NGN/XOF corridor is not quoting right now." };
    if (quote.ngnAmount > AGENT_SINGLE_OP_LIMIT_NGN) {
      return { success: false, code: "ABOVE_SINGLE_LIMIT", message: `This conversion exceeds the single-operation naira limit of ₦${AGENT_SINGLE_OP_LIMIT_NGN.toLocaleString()}.` };
    }
    if (this.todayNgnVolume() + quote.ngnAmount > DESK_CONFIG.dailyNgnCap) {
      return { success: false, code: "DAILY_CAP_REACHED", message: "The desk's daily naira conversion cap is reached for this till." };
    }

    const till = AgentKioskStore.getRunningTill();
    if (direction === "SELL_XOF" && till < quote.ngnAmount) {
      return { success: false, code: "INSUFFICIENT_TILL_CASH", message: `Physical till ₦${till.toLocaleString()} cannot cover the ₦${quote.ngnAmount.toLocaleString()} payout.` };
    }

    const referenceValueNgn = Math.round(xofAmount * quote.referenceNairaPerXof);
    const marginNgn = quote.marginNgn;
    const isBuy = direction === "BUY_XOF";

    const ledgerTx = await LedgerService.postTransaction({
      orgId: ORG_ID,
      transactionReference: `KP-AGT-FX-${idempotencyKey.slice(0, 18)}`,
      description: `Corridor FX ${direction.replace("_", " ")} — ${xofAmount.toLocaleString()} XOF`,
      currency: AGENT_PORTAL_CURRENCY,
      entries: isBuy
        ? [
            { accountId: AGENT_CASH, entryType: "DEBIT", amount: wholeToMinor(quote.ngnAmount), narration: `FX ${direction}: naira cash collected at till for ${xofAmount} XOF` },
            { accountId: CORRIDOR_PAYABLE, entryType: "CREDIT", amount: wholeToMinor(referenceValueNgn), narration: "FX corridor payable — corridor cost of XOF delivered" },
            { accountId: COMMISSIONS_PAYABLE, entryType: "CREDIT", amount: wholeToMinor(marginNgn), narration: "FX desk margin accrued to agent commission payable" },
          ]
        : [
            { accountId: CORRIDOR_ADVANCE, entryType: "DEBIT", amount: wholeToMinor(referenceValueNgn), narration: "FX corridor advance — till cash paid awaiting corridor reimbursement" },
            { accountId: AGENT_CASH, entryType: "CREDIT", amount: wholeToMinor(quote.ngnAmount), narration: `FX ${direction}: naira cash paid from till for ${xofAmount} XOF` },
            { accountId: COMMISSIONS_PAYABLE, entryType: "CREDIT", amount: wholeToMinor(marginNgn), narration: "FX desk margin accrued to agent commission payable" },
          ],
    });

    AgentKioskStore.setRunningTill(isBuy ? till + quote.ngnAmount : till - quote.ngnAmount);

    const now = new Date().toISOString();
    const order: AgentFxOrder = {
      id: `fx-ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderReference: ledgerTx.transaction.transactionReference,
      direction,
      currencyPair: "NGN/XOF",
      xofAmount,
      ngnAmount: quote.ngnAmount,
      referenceRate: quote.referenceRateXofPerNgn,
      appliedRate: quote.appliedNairaPerXof,
      marginNgn,
      agentCommissionNgn: marginNgn,
      ledgerJournalId: ledgerTx.transaction.id,
      status: "COMPLETED",
      customerName: params.customerName,
      createdAt: now,
      completedAt: now,
    };
    store.upsert(order);

    const operation: AgentPortalOperationType = {
      id: `ag-op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference: ledgerTx.transaction.transactionReference,
      ledgerJournalId: ledgerTx.transaction.id,
      type: "FX_CONVERSION",
      title: `FX ${direction.replace("_", " ")} — ${xofAmount.toLocaleString()} XOF`,
      amount: quote.ngnAmount,
      customerFee: 0,
      agentCommission: marginNgn,
      totalAmount: quote.ngnAmount,
      currency: AGENT_PORTAL_CURRENCY,
      status: "SUCCESSFUL",
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      terminalId: AGENT_PORTAL_TERMINAL_ID,
      agentId: agentId(),
      feeRuleApplied: `RULE_FX_DESK_${direction}`,
      service: "FX",
      serviceRef: order.orderReference,
      createdAt: now,
      completedAt: now,
    };
    AgentKioskStore.addOperation(agentId(), operation);
    AgentKioskStore.recordIdempotencyKey(idempotencyKey, operation.id);
    return { success: true, order };
  }
}
