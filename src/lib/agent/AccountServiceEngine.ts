// =============================================================================
// File: src/lib/agent/AccountServiceEngine.ts
// Description: Stage-4 agent account-opening service. The agent opens a real
// KoriePay NGN account for an already-onboarded kiosk customer through
// AccountLifecycleEngine.openAccount (Providus NGN wallet product), which mints
// the account number and auto-provisions the customer wallet subledger. Product
// eligibility (ACTIVE, jurisdiction NG, currency NGN, minKycTier) is read from
// BankingProductFactory — never hard-coded on a page.
// =============================================================================

import { AgentKioskStore } from "./AgentKioskStore";
import { AccountLifecycleEngine } from "../customer/AccountLifecycleEngine";
import { BankingProductFactory } from "../products/BankingProductFactory";
import { AgentPortalOperationType } from "@/types/agentPortal";
import { AGENT_PORTAL_CURRENCY, AGENT_PORTAL_ENGINE_AGENT_ID, AGENT_PORTAL_TERMINAL_ID } from "./agentPortalConstants";

function agentId(): string {
  return AGENT_PORTAL_ENGINE_AGENT_ID;
}

export interface AgentOpenableProduct {
  productCode: string;
  name: string;
  description: string;
  minKycTier: string;
  singleTransactionLimit: number;
  dailyTransactionLimit: number;
  maxBalanceCap: number;
}

interface OnboardedCustomerRow {
  customerId: string;
  customerCode: string;
  fullName: string;
  phone: string;
  kycTier: string;
  registeredAt: string;
}

export class AccountServiceEngine {
  private static instance: AccountServiceEngine;

  public static getInstance(): AccountServiceEngine {
    if (!AccountServiceEngine.instance) AccountServiceEngine.instance = new AccountServiceEngine();
    return AccountServiceEngine.instance;
  }

  /** NGN consumer-wallet products the agent may open at this till. */
  public listOpenableProducts(): AgentOpenableProduct[] {
    const codes = ["KORIE_WALLET_NGN_BASIC", "KORIE_WALLET_NGN_TIER2"];
    const factory = BankingProductFactory.getInstance();
    const out: AgentOpenableProduct[] = [];
    for (const code of codes) {
      const p = factory.getProduct(code);
      if (!p || p.status !== "ACTIVE" || p.jurisdiction !== "NG" || p.currency !== "NGN") continue;
      out.push({
        productCode: p.productCode,
        name: p.name,
        description: p.description,
        minKycTier: p.minKycTier,
        singleTransactionLimit: p.singleTransactionLimit,
        dailyTransactionLimit: p.dailyTransactionLimit,
        maxBalanceCap: p.maxBalanceCap,
      });
    }
    return out;
  }

  public listOnboarded(): OnboardedCustomerRow[] {
    return AgentKioskStore.getOnboardedCustomers() as OnboardedCustomerRow[];
  }

  public accountsForCustomer(customerId: string) {
    return AccountLifecycleEngine.getInstance().getAccounts(customerId);
  }

  /** Joined view: every onboarded kiosk customer with their opened accounts. */
  public portalAccounts() {
    return this.listOnboarded().map((c) => ({
      customer: c,
      accounts: this.accountsForCustomer(c.customerId),
    }));
  }

  public async openAccount(params: {
    customerPhone: string;
    productCode: string;
    idempotencyKey: string;
  }): Promise<{ success: boolean; account?: any; operation?: AgentPortalOperationType; code?: string; message?: string }> {
    const { customerPhone, productCode, idempotencyKey } = params;
    if (!idempotencyKey || idempotencyKey.length < 8) {
      return { success: false, code: "IDEMPOTENCY_REQUIRED", message: "An idempotency key is required." };
    }
    const existing = AgentKioskStore.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const account = AccountLifecycleEngine.getInstance().getAccount(String(existing.serviceRef || ""));
      return { success: true, account, operation: existing, code: "IDEMPOTENT_REPLAY" };
    }

    const phone = customerPhone.replace(/\s/g, "");
    const customer = this.listOnboarded().find((c) => c.phone.replace(/\s/g, "") === phone);
    if (!customer) {
      return {
        success: false,
        code: "CUSTOMER_NOT_ONBOARDED",
        message: "Onboard this customer first from the Customers page, then open the account.",
      };
    }
    const product = BankingProductFactory.getInstance().getProduct(productCode);
    if (!product || product.status !== "ACTIVE" || product.jurisdiction !== "NG" || product.currency !== "NGN") {
      return { success: false, code: "PRODUCT_NOT_OPENABLE", message: "That account product cannot be opened at this terminal." };
    }
    const tierRank: Record<string, number> = { TIER_1: 1, TIER_2: 2, TIER_3: 3 };
    if ((tierRank[customer.kycTier] || 0) < (tierRank[product.minKycTier] || 9)) {
      return {
        success: false,
        code: "KYC_BELOW_PRODUCT_FLOOR",
        message: `${product.name} requires ${product.minKycTier.replace("_", " ")}; this customer is ${customer.kycTier.replace("_", " ")}.`,
      };
    }
    const dupes = this.accountsForCustomer(customer.customerId).filter(
      (a) => a.productCode === productCode && a.status === "OPEN",
    );
    if (dupes.length > 0) {
      return { success: false, code: "ACCOUNT_ALREADY_EXISTS", message: `Customer already holds ${product.name} (account ${dupes[0].accountNumber}).` };
    }

    const opened = AccountLifecycleEngine.getInstance().openAccount({
      customerId: customer.customerId,
      productCode,
      accountName: customer.fullName,
      country: "NG",
      currency: "NGN",
    });
    if (!opened.success || !opened.account) {
      return { success: false, code: "ACCOUNT_OPEN_FAILED", message: opened.error || "The account could not be opened." };
    }

    const now = new Date().toISOString();
    const operation: AgentPortalOperationType = {
      id: `ag-op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference: `KP-AGT-ACCT-${idempotencyKey.slice(0, 18)}`,
      type: "ACCOUNT_OPENING",
      title: `Account opened — ${product.name}`,
      amount: 0,
      customerFee: 0,
      agentCommission: 0,
      totalAmount: 0,
      currency: AGENT_PORTAL_CURRENCY,
      status: "SUCCESSFUL",
      customerName: customer.fullName,
      customerPhone: phone,
      customerAccount: opened.account.accountNumber,
      terminalId: AGENT_PORTAL_TERMINAL_ID,
      agentId: agentId(),
      service: "ACCOUNT_OPENING",
      serviceRef: opened.account.accountNumber,
      createdAt: now,
      completedAt: now,
    };
    AgentKioskStore.addOperation(agentId(), operation);
    AgentKioskStore.recordIdempotencyKey(idempotencyKey, operation.id);
    return { success: true, account: opened.account, operation };
  }
}
