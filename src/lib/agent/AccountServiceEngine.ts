// =============================================================================
// File: src/lib/agent/AccountServiceEngine.ts
// Description: Stage-4 agent account-opening service. The agent opens a real
// KoriePay NGN account for an already-onboarded kiosk customer through
// AccountLifecycleEngine.openAccount (Providus NGN wallet product), which mints
// the account number and auto-provisions the customer wallet subledger. Product
// eligibility (ACTIVE, jurisdiction NG, currency NGN, minKycTier) is read from
// BankingProductFactory — never hard-coded on a page.
//
// Stage-5 additions:
//  - portalAccounts rows carry each account's live wallet available balance
//    (wallet subledger = display truth; ledger holds the double-entry journal).
//  - openAccount accepts optional fullName/email: when the phone is not yet
//    onboarded at this terminal, the customer is onboarded first (customer
//    master + kiosk registry — same sequence the Customers page onboarding
//    performs) so "onboard + open" is a single engine intent.
// =============================================================================

import { AgentKioskStore } from "./AgentKioskStore";
import { AccountLifecycleEngine } from "../customer/AccountLifecycleEngine";
import { CustomerLifecycleEngine } from "../customer/CustomerLifecycleEngine";
import { BankingProductFactory } from "../products/BankingProductFactory";
import { SubledgerEngine } from "../financial/SubledgerEngine";
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

  /**
   * Live NGN wallet available balance for a customer (whole ₦, wallet
   * subledger display truth). Zero when no active NGN wallet subledger exists.
   */
  public walletBalanceFor(customerId: string): number {
    const wallet = SubledgerEngine.getInstance().getSubledger("CUSTOMER_WALLET", customerId, "NGN");
    return wallet && wallet.isActive ? wallet.availableBalance : 0;
  }

  // ---------------------------------------------------------------------------
  // Onboarding (mirror of the Customers-page sequence — CustomerLifecycleEngine
  // master + kiosk registry record). Shared so the one-tap flow below does not
  // diverge from manual onboarding. Mirrors AgentPortalEngine.onboardCustomer
  // (name/phone validation, canonical phone, TIER_1 walk-in, email fallback).
  // ---------------------------------------------------------------------------

  private findMasterByPhone(phone: string) {
    const norm = (p: string) => p.replace(/\s/g, "");
    return CustomerLifecycleEngine.getInstance()
      .getCustomers()
      .find((c) => norm(c.phone) === norm(phone));
  }

  /** Onboards a brand-new walk-in (master + kiosk registry). No-ops when already present. */
  private onboardNewCustomer(params: { fullName: string; phone: string; email?: string }): {
    ok: boolean;
    customer?: OnboardedCustomerRow;
    code?: string;
    message?: string;
  } {
    const fullName = (params.fullName || "").trim();
    const phone = (params.phone || "").replace(/\s/g, "");
    if (fullName.length < 3) {
      return { ok: false, code: "NAME_REQUIRED", message: "Enter the customer's full name." };
    }
    if (!/^\+?\d{10,15}$/.test(phone)) {
      return { ok: false, code: "PHONE_REQUIRED", message: "Enter a valid phone number." };
    }

    let master = this.findMasterByPhone(phone);
    if (!master) {
      master = CustomerLifecycleEngine.getInstance().registerCustomer({
        tenantId: "tenant-korie-core",
        fullName,
        email: (params.email || "").trim() || `${phone.replace(/\D/g, "")}@walkin.koriepay.ng`,
        phone,
        country: "NG",
        customerType: "PERSONAL",
        kycTier: "TIER_1",
        riskStatus: "LOW",
      });
    }

    const alreadyOnboarded = this.listOnboarded().some(
      (c) => c.phone.replace(/\s/g, "") === phone,
    );
    if (!alreadyOnboarded) {
      AgentKioskStore.addOnboardedCustomer({
        customerId: master.id,
        customerCode: master.customerCode,
        fullName: master.fullName,
        phone: master.phone,
        kycTier: master.kycTier,
        registeredAt: new Date().toISOString(),
      });
    }

    const row = this.listOnboarded().find((c) => c.phone.replace(/\s/g, "") === phone);
    return row ? { ok: true, customer: row } : { ok: false, code: "ONBOARD_FAILED", message: "The customer could not be onboarded." };
  }

  public async openAccount(params: {
    customerPhone: string;
    productCode: string;
    idempotencyKey: string;
    /** Present = one-tap flow: onboard the walk-in first when the phone is unknown. */
    fullName?: string;
    email?: string;
  }): Promise<{
    success: boolean;
    account?: any;
    operation?: AgentPortalOperationType;
    customer?: OnboardedCustomerRow;
    onboarded?: boolean;
    code?: string;
    message?: string;
  }> {
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
    let customer = this.listOnboarded().find((c) => c.phone.replace(/\s/g, "") === phone);
    let onboarded = false;
    if (!customer) {
      // One-tap intent: customer is a walk-in who isn't at this terminal yet.
      if (!params.fullName) {
        return {
          success: false,
          code: "CUSTOMER_NOT_ONBOARDED",
          message: "Onboard this customer first (or use the one-tap Onboard & open flow) before opening the account.",
        };
      }
      const onboardedNow = this.onboardNewCustomer({
        fullName: params.fullName,
        phone,
        email: params.email,
      });
      if (!onboardedNow.ok || !onboardedNow.customer) {
        return {
          success: false,
          code: onboardedNow.code || "ONBOARD_FAILED",
          message: onboardedNow.message || "The customer could not be onboarded.",
        };
      }
      customer = onboardedNow.customer;
      onboarded = true;
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
    return {
      success: true,
      account: opened.account,
      operation,
      customer,
      onboarded,
      code: onboarded ? "ONBOARDED_AND_OPENED" : "ACCOUNT_OPENED",
    };
  }
}
