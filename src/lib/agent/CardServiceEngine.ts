// =============================================================================
// File: src/lib/agent/CardServiceEngine.ts
// Description: Stage-4 ATM/card application engine for the agent portal.
// Card products are seed config (fee, delivery, KYC floor). Applications move
// ONLY through explicit operator/issuer events (received → verified → at
// issuer → issued → delivered; cancel pre-issue). The issue fee is collected
// in cash at the till and journaled (DR agent cash · CR commissions payable +
// fee revenue, engine 60/40 product rule). Applications persist in a
// file-backed store; the masked card ref is derived deterministically from the
// application record — no PII, no fake full PANs.
// =============================================================================

import fs from "fs";
import path from "path";
import { AgentKioskStore } from "./AgentKioskStore";
import { LedgerService } from "../services/LedgerService";
import { AccountLifecycleEngine } from "../customer/AccountLifecycleEngine";
import { AgentPortalOperationType } from "@/types/agentPortal";
import {
  AgentCardApplication,
  AgentCardApplicationStatus,
  AgentCardProduct,
} from "@/types/agentProducts";
import { AGENT_PORTAL_CURRENCY, AGENT_PORTAL_ENGINE_AGENT_ID, AGENT_PORTAL_TERMINAL_ID } from "./agentPortalConstants";

const STORE_PATH = process.env.CARD_SERVICE_STORE_PATH || "/tmp/korie-card-apps.json";
const ORG_ID = "org_kor_99182";
const AGENT_CASH = "acc_asset_agent_cash_ngn";
const COMMISSIONS_PAYABLE = "acc_liab_agent_commissions_payable_ngn";
const FEE_REVENUE = "acc_rev_tx_fees_ngn";

const CARD_PRODUCT_SEEDS: AgentCardProduct[] = [
  {
    productId: "crd-ngn-atm-01",
    productCode: "KORIE_ATM_DEBIT_NGN",
    name: "KoriePay Debit (ATM & POS)",
    description: "Standard ATM debit card linked to the customer's opened KoriePay NGN account.",
    networkLabel: "KoriePay Debit (NGN)",
    issueFeeNgn: 2_500,
    deliveryEstimateDays: "7–10 business days",
    status: "ACTIVE",
    minKycTier: "TIER_1",
    feeRuleApplied: "RULE_CARD_FEE_60_40_SPLIT",
  },
  {
    productId: "crd-ngn-premium-01",
    productCode: "KORIE_ATM_DEBIT_PREMIUM_NGN",
    name: "KoriePay Premium Debit (ATM & POS)",
    description: "Premium debit card with priority issuer handling for verified customers.",
    networkLabel: "KoriePay Premium (NGN)",
    issueFeeNgn: 5_000,
    deliveryEstimateDays: "4–7 business days",
    status: "ACTIVE",
    minKycTier: "TIER_2",
    feeRuleApplied: "RULE_CARD_FEE_60_40_SPLIT",
  },
];

interface CardState {
  applications: AgentCardApplication[];
}

class CardServiceStore {
  private state: CardState = { applications: [] };

  private hydrate() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
      if (Array.isArray(data.applications)) this.state.applications = data.applications;
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

  get applications(): AgentCardApplication[] {
    this.hydrate();
    return [...this.state.applications];
  }

  find(id: string): AgentCardApplication | undefined {
    return this.applications.find((a) => a.id === id);
  }

  upsert(app: AgentCardApplication) {
    this.hydrate();
    const idx = this.state.applications.findIndex((a) => a.id === app.id);
    if (idx >= 0) this.state.applications[idx] = app;
    else this.state.applications.unshift(app);
    this.persist();
  }
}

const store = new CardServiceStore();

function agentId(): string {
  return AGENT_PORTAL_ENGINE_AGENT_ID;
}

function wholeToMinor(n: number): number {
  return Math.round(n * 100);
}

const TRANSITIONS: Record<AgentCardApplicationStatus, AgentCardApplicationStatus[]> = {
  APPLICATION_RECEIVED: ["KYC_VERIFIED", "CANCELLED"],
  KYC_VERIFIED: ["AT_ISSUER", "CANCELLED"],
  AT_ISSUER: ["ISSUED", "CANCELLED"],
  ISSUED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export class CardServiceEngine {
  private static instance: CardServiceEngine;

  public static getInstance(): CardServiceEngine {
    if (!CardServiceEngine.instance) CardServiceEngine.instance = new CardServiceEngine();
    return CardServiceEngine.instance;
  }

  public listProducts(): AgentCardProduct[] {
    return CARD_PRODUCT_SEEDS.filter((p) => p.status === "ACTIVE");
  }

  public getProduct(productId: string): AgentCardProduct | undefined {
    return CARD_PRODUCT_SEEDS.find((p) => p.productId === productId);
  }

  public listApplications(): AgentCardApplication[] {
    return store.applications;
  }

  public getApplication(id: string): AgentCardApplication | undefined {
    return store.find(id);
  }

  public async apply(params: {
    cardProductId: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    kycTier: string;
    accountNumber: string;
    idempotencyKey: string;
  }): Promise<{ success: boolean; application?: AgentCardApplication; code?: string; message?: string }> {
    const { cardProductId, customerId, idempotencyKey } = params;
    if (!idempotencyKey || idempotencyKey.length < 8) {
      return { success: false, code: "IDEMPOTENCY_REQUIRED", message: "An idempotency key is required." };
    }
    const existing = AgentKioskStore.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const app = store.applications.find((a) => a.applicationReference === existing.serviceRef);
      return { success: true, application: app, code: "IDEMPOTENT_REPLAY" };
    }
    const product = this.getProduct(cardProductId);
    if (!product) return { success: false, code: "CARD_PRODUCT_INACTIVE", message: "That card product is not available." };

    // Eligibility: opened NGN account + KYC floor.
    const account = AccountLifecycleEngine.getInstance().getAccount(params.accountNumber);
    if (!account || account.status !== "OPEN" || account.currency !== "NGN" || account.customerId !== customerId) {
      return { success: false, code: "CARD_ACCOUNT_REQUIRED", message: "The customer needs an open KoriePay NGN account issued at this terminal." };
    }
    const tierOrder: Record<string, number> = { TIER_1: 1, TIER_2: 2, TIER_3: 3 };
    if ((tierOrder[params.kycTier] || 0) < (tierOrder[product.minKycTier] || 1)) {
      return { success: false, code: "CARD_KYC_BELOW_FLOOR", message: `${product.name} requires ${product.minKycTier.replace("_", " ")} or higher.` };
    }
    const duplicate = store.applications.find(
      (a) => a.customerId === customerId && a.cardProductCode === product.productCode && a.status !== "CANCELLED" && a.status !== "DELIVERED",
    );
    if (duplicate) {
      return { success: false, code: "CARD_APPLICATION_EXISTS", message: `This customer already has an open ${product.name} application (${duplicate.applicationReference}).` };
    }

    const fee = product.issueFeeNgn;
    const agentCommission = Math.round(fee * 0.6);
    const platformFee = fee - agentCommission;
    const feeSplit = product.feeRuleApplied;

    const ledgerTx = await LedgerService.postTransaction({
      orgId: ORG_ID,
      transactionReference: `KP-AGT-CARD-${idempotencyKey.slice(0, 18)}`,
      description: `Card issue fee — ${product.name} for ${params.customerName}`,
      currency: AGENT_PORTAL_CURRENCY,
      entries: [
        { accountId: AGENT_CASH, entryType: "DEBIT", amount: wholeToMinor(fee), narration: `Card issue fee cash collected at till — ${product.name}` },
        { accountId: COMMISSIONS_PAYABLE, entryType: "CREDIT", amount: wholeToMinor(agentCommission), narration: `Agent commission payable — ${product.name} issue fee` },
        { accountId: FEE_REVENUE, entryType: "CREDIT", amount: wholeToMinor(platformFee), narration: `Platform fee revenue — ${product.name} issue fee` },
      ],
    });

    const till = AgentKioskStore.getRunningTill();
    AgentKioskStore.setRunningTill(till + fee);

    const now = new Date().toISOString();
    const applicationReference = `CARD-${now.slice(0, 10).replace(/-/g, "")}-${idempotencyKey.slice(0, 6).toUpperCase()}`;
    const application: AgentCardApplication = {
      id: `card-app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationReference,
      cardProductId: product.productId,
      cardProductCode: product.productCode,
      customerId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      accountNumber: params.accountNumber,
      kycTier: params.kycTier,
      status: "APPLICATION_RECEIVED",
      issueFeeNgn: fee,
      agentCommissionNgn: agentCommission,
      ledgerJournalId: ledgerTx.transaction.id,
      feeReference: ledgerTx.transaction.transactionReference,
      statusHistory: [{ status: "APPLICATION_RECEIVED", at: now, by: agentId() }],
      createdAt: now,
      updatedAt: now,
    };
    store.upsert(application);

    const operation: AgentPortalOperationType = {
      id: `ag-op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference: ledgerTx.transaction.transactionReference,
      ledgerJournalId: ledgerTx.transaction.id,
      type: "CARD_APPLICATION_FEE",
      title: `${product.name} issue fee`,
      amount: fee,
      customerFee: 0,
      agentCommission,
      totalAmount: fee,
      currency: AGENT_PORTAL_CURRENCY,
      status: "SUCCESSFUL",
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      terminalId: AGENT_PORTAL_TERMINAL_ID,
      agentId: agentId(),
      feeRuleApplied: feeSplit,
      service: "CARD",
      serviceRef: applicationReference,
      createdAt: now,
      completedAt: now,
    };
    AgentKioskStore.addOperation(agentId(), operation);
    AgentKioskStore.recordIdempotencyKey(idempotencyKey, operation.id);
    return { success: true, application };
  }

  public transition(
    applicationId: string,
    next: AgentCardApplicationStatus,
    actorId: string,
  ): { success: boolean; application?: AgentCardApplication; code?: string; message?: string } {
    const app = store.find(applicationId);
    if (!app) return { success: false, code: "APPLICATION_NOT_FOUND", message: "Card application not found." };
    const allowed = TRANSITIONS[app.status];
    if (!allowed.includes(next)) {
      return {
        success: false,
        code: "INVALID_TRANSITION",
        message: `Cannot move application from ${app.status.replace(/_/g, " ").toLowerCase()} to ${next.replace(/_/g, " ").toLowerCase()}.`,
      };
    }
    const now = new Date().toISOString();
    const updated: AgentCardApplication = {
      ...app,
      status: next,
      maskedCardRef:
        next === "ISSUED" ? `KORIE••••${applicationId.replace(/\D/g, "").slice(-4) || "0000"}` : app.maskedCardRef,
      statusHistory: [...app.statusHistory, { status: next, at: now, by: actorId }],
      updatedAt: now,
    };
    store.upsert(updated);
    return { success: true, application: updated };
  }
}
