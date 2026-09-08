// =============================================================================
// File: src/lib/agent/AgentPortalEngine.ts
// Description: Engine facade for the agent kiosk portal (DEMO runtime). All
// money movement posts REAL double-entry journals through LedgerService and
// moves the agent's AGENT_FLOAT subledger; physical till is anchored to the
// engine till position and tracked per-operation; end-of-day reconciliation
// runs through CashReconciliationEngine; tickets through
// ComplaintDisputeEngine; onboarding through CustomerLifecycleEngine.
//
// Agent identity is server-resolved (agt-ng-001 in the sandbox) — see
// agentScope.ts. Kiosk-only facts (bookmarks, per-op history with their real
// journal references) live in the file-backed AgentKioskStore.
// =============================================================================

import { LedgerService } from "../services/LedgerService";
import { SubledgerEngine } from "../financial/SubledgerEngine";
import { AgentManagementEngine } from "../agents/AgentManagementEngine";
import { TerminalManagementEngine } from "../agency/TerminalManagementEngine";
import { DeviceManagementEngine } from "../devices/DeviceManagementEngine";
import { CashPositionEngine } from "../cash/CashPositionEngine";
import { CashReconciliationEngine } from "../agency/CashReconciliationEngine";
import { ComplaintDisputeEngine } from "../complaints/ComplaintDisputeEngine";
import { FeeAndCommissionEngine } from "../financial/FeeAndCommissionEngine";
import { CustomerLifecycleEngine } from "../customer/CustomerLifecycleEngine";
import { AgentKioskStore } from "./AgentKioskStore";
import {
  AGENT_PORTAL_AGENT_EMAIL,
  AGENT_PORTAL_CURRENCY,
  AGENT_PORTAL_DEVICE_ID,
  AGENT_PORTAL_ENGINE_AGENT_ID,
  AGENT_PORTAL_SETTLEMENT_ACCOUNT,
  AGENT_PORTAL_TERMINAL_ID,
  AGENT_PORTAL_TILL_LOCATION_ID,
} from "./agentPortalConstants";
import {
  AgentOperationRequest,
  AgentOperationResult,
  AgentPortalAlert,
  AgentPortalComplaint,
  AgentPortalCustomerSummary,
  AgentPortalOperationType,
  AgentPortalReconciliation,
  AgentPortalSettlement,
  AgentPortalSummary,
} from "@/types/agentPortal";

const FLOAT_ACCOUNT_ID = "acc_liab_agent_floats_ngn";
const CLEARING_POOL_ACCOUNT_ID = "acc_asset_providus_ngn";

function agentId(): string {
  return AGENT_PORTAL_ENGINE_AGENT_ID;
}

function wholeToMinor(amount: number): number {
  return Math.round(amount * 100);
}

// ---------------------------------------------------------------------------
// Float & ledger posture
// ---------------------------------------------------------------------------

/** Ensure the agent float subledger exists (seeded to the registry float). */
export function ensureAgentFloatSubledger(): void {
  const subledgerEngine = SubledgerEngine.getInstance();
  const existing = subledgerEngine.getSubledger("AGENT_FLOAT", agentId(), AGENT_PORTAL_CURRENCY);
  if (!existing) {
    subledgerEngine.mutateBalance({
      subledgerType: "AGENT_FLOAT",
      entityId: agentId(),
      accountCode: "2110",
      currency: AGENT_PORTAL_CURRENCY,
      country: "NG",
      deltaAmount: 1_850_000,
    });
  }
}

function walletFloat(): number {
  ensureAgentFloatSubledger();
  const sub = SubledgerEngine.getInstance().getSubledger(
    "AGENT_FLOAT",
    agentId(),
    AGENT_PORTAL_CURRENCY,
  );
  return sub ? sub.availableBalance : 0;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Portal summary (engine truth + kiosk runtime)
// ---------------------------------------------------------------------------

export class AgentPortalEngine {
  private static instance: AgentPortalEngine;

  private constructor() {}

  public static getInstance(): AgentPortalEngine {
    if (!AgentPortalEngine.instance) {
      AgentPortalEngine.instance = new AgentPortalEngine();
    }
    return AgentPortalEngine.instance;
  }

  public getPortalSummary(): AgentPortalSummary {
    const registryAgent = AgentManagementEngine.getInstance().getAgent(agentId());
    const terminalRec = TerminalManagementEngine.getInstance().getTerminal(AGENT_PORTAL_TERMINAL_ID);
    const deviceRec = DeviceManagementEngine.getInstance().getDevice(AGENT_PORTAL_DEVICE_ID);
    const till = CashPositionEngine.getInstance().getPosition(AGENT_PORTAL_TILL_LOCATION_ID);
    const ops = AgentKioskStore.getOperations(agentId(), 200);
    const cashCounts = CashReconciliationEngine.getInstance().getCashCounts(agentId());
    const complaints = ComplaintDisputeEngine.getInstance()
      .getComplaints()
      .filter((c) => c.agentId === agentId() || c.terminalId === AGENT_PORTAL_TERMINAL_ID);
    const today = todayKey();

    const todayOps = ops.filter((o) => (o.createdAt || "").slice(0, 10) === today);
    const todayVolume = todayOps.reduce((s, o) => s + o.amount, 0);
    const todayCommission = todayOps.reduce((s, o) => s + (o.agentCommission || 0), 0);
    const todayFees = todayOps.reduce((s, o) => s + (o.customerFee || 0), 0);
    const failedToday = todayOps.filter((o) => o.status === "FAILED").length;
    const successRate =
      todayOps.length > 0
        ? Math.round(((todayOps.length - failedToday) / todayOps.length) * 1000) / 10
        : registryAgent?.successRate24h ?? 99.2;

    const float = walletFloat();
    const runningTill = AgentKioskStore.getRunningTill();

    const lastRecon = cashCounts[0];
    const terminalActive =
      terminalRec?.status === "ACTIVE" &&
      (Date.now() - new Date(terminalRec.lastHeartbeatAt).getTime()) < 10 * 60 * 1000;

    // Derived alerts (honest sources; no invented risk feeds)
    const alerts: AgentPortalAlert[] = [];
    if (till) {
      if (till.liquidityStatus !== "HEALTHY") {
        alerts.push({
          id: "alt-till-01",
          severity: till.liquidityStatus === "CRITICAL" ? "HIGH" : "MEDIUM",
          title: "Till liquidity watch",
          description: `Physical till is ${till.liquidityStatus.toLowerCase()} (₦${runningTill.toLocaleString()}). Target safety buffer ₦${till.targetSafetyBuffer.toLocaleString()}.`,
          createdAt: new Date().toISOString(),
          source: "ENGINE",
        });
      }
      if (runningTill < till.targetSafetyBuffer) {
        alerts.push({
          id: "alt-till-02",
          severity: "MEDIUM",
          title: "Low physical cash",
          description: `Running till cash ₦${runningTill.toLocaleString()} is below the ₦${till.targetSafetyBuffer.toLocaleString()} safety buffer. Rebalance with a cash-in or CIT.`,
          createdAt: new Date().toISOString(),
          source: "DERIVED",
        });
      }
    }
    if (float < 500_000) {
      alerts.push({
        id: "alt-float-01",
        severity: float < 250_000 ? "HIGH" : "MEDIUM",
        title: "Wallet float running low",
        description: `Digital float ₦${float.toLocaleString()}. Top up via the dedicated float account to keep serving cash-in and transfers.`,
        createdAt: new Date().toISOString(),
        source: "DERIVED",
      });
    }
    if (!terminalActive) {
      alerts.push({
        id: "alt-term-01",
        severity: "HIGH",
        title: "Terminal heartbeat stale",
        description: `Terminal ${AGENT_PORTAL_TERMINAL_ID} has not reported in over 10 minutes.`,
        createdAt: new Date().toISOString(),
        source: "ENGINE",
      });
    }
    if (!lastRecon) {
      alerts.push({
        id: "alt-recon-01",
        severity: "LOW",
        title: "No cash count yet today",
        description: "Complete a daily cash reconciliation to keep your till variance tracked.",
        createdAt: new Date().toISOString(),
        source: "DERIVED",
      });
    }

    return {
      agent: {
        id: registryAgent?.id || agentId(),
        agentCode: registryAgent?.agentCode || "AGT-NG-0092",
        tradingName: registryAgent?.tradingName || "Garba Express Services & POS",
        legalName: registryAgent?.legalName || "Musa Garba Enterprise",
        phone: registryAgent?.phone || "+2348031122334",
        email: registryAgent?.email || AGENT_PORTAL_AGENT_EMAIL,
        country: registryAgent?.country || "NG",
        stateOrProvince: registryAgent?.stateOrProvince || "FCT Abuja",
        lgaOrDistrict: registryAgent?.lgaOrDistrict || "Abuja Municipal (AMAC)",
        tier: registryAgent?.tier || "TIER_2",
        status: registryAgent?.status || "ACTIVE",
        kycStatus: "VERIFIED",
        qualityScore: registryAgent?.qualityScore ?? 98.4,
        riskTier: registryAgent?.riskTier || "LOW",
        floatBalance: registryAgent?.floatBalance ?? 1_850_000,
        commissionEarned24h: registryAgent?.commissionEarned24h ?? 34_500,
        successRate24h: registryAgent?.successRate24h ?? 99.2,
        dailyTransactionLimit: registryAgent?.dailyTransactionLimit ?? 2_500_000,
        singleTransactionLimit: registryAgent?.singleTransactionLimit ?? 200_000,
        maxCashHolding: registryAgent?.maxCashHolding ?? 5_000_000,
        preferredLanguage: "en",
        activeTerminalId: AGENT_PORTAL_TERMINAL_ID,
      },
      terminal: {
        terminalId: terminalRec?.terminalId || AGENT_PORTAL_TERMINAL_ID,
        serialNumber: terminalRec?.terminalSerial || "",
        terminalType: terminalRec?.terminalType || "ANDROID_POS",
        deviceId: terminalRec?.deviceId,
        status: terminalRec?.status || "ACTIVE",
        capabilities: terminalRec?.capabilities || [],
        lastHeartbeatAt: terminalRec?.lastHeartbeatAt || new Date().toISOString(),
        modelLabel: deviceRec?.modelName || "KoriePay Smart Android POS",
      },
      float: {
        walletFloat: float,
        reservedFloat: 0,
        availableFloat: float,
        currency: AGENT_PORTAL_CURRENCY,
      },
      till: {
        locationId: till?.locationId || AGENT_PORTAL_TILL_LOCATION_ID,
        locationName: till?.locationName || "Garba Express POS Cash Till",
        expectedPhysicalCash: till?.expectedPhysicalCash ?? runningTill,
        availablePhysicalCash: runningTill,
        reservedCash: till?.reservedCash ?? 0,
        targetSafetyBuffer: till?.targetSafetyBuffer ?? 500_000,
        liquidityStatus: till?.liquidityStatus || "HEALTHY",
        lastCountedAt: till?.lastCountedAt || new Date().toISOString(),
      },
      kpis: {
        todayTransactionCount: todayOps.length,
        todayVolume,
        todayFeeRevenue: todayFees,
        todayCommissionEarned: todayCommission,
        successRatePercent: successRate,
        openCountToday: 0,
        avgResponseSeconds: 0,
      },
      recentOperations: ops.slice(0, 25),
      reconciliations: cashCounts.map<AgentPortalReconciliation>((c) => ({
        id: c.id,
        reconciliationDate: c.createdAt.slice(0, 10),
        expectedCash: c.expectedCash,
        totalCounted: c.totalPhysicalCash,
        varianceAmount: c.varianceAmount,
        status: c.status,
        denominationBreakdown: c.denominationBreakdown,
        submittedAt: c.createdAt,
      })),
      settlements: AgentKioskStore.getSettlements().map<AgentPortalSettlement>((s) => ({
        id: s.id,
        reference: s.reference,
        ledgerJournalId: s.ledgerJournalId,
        amount: s.amount,
        kind: s.kind,
        status: s.status,
        destinationAccountMasked: s.destinationAccountMasked,
        destinationBank: s.destinationBank,
        requestedAt: s.requestedAt,
        errorMessage: s.errorMessage,
      })),
      complaints: complaints.map<AgentPortalComplaint>((c) => ({
        id: c.id,
        complaintReference: c.complaintReference,
        category: c.category,
        priority: c.priority || "P3",
        status: c.status,
        transactionReference: c.transactionReference,
        description: c.description,
        disputedAmount: c.disputedAmount,
        currency: c.currency,
        slaDueAt: c.slaDueAt,
        isSlaBreached: c.isSlaBreached,
        createdAt: c.createdAt,
      })),
      alerts,
      customers: this.buildCustomerSummaries(),
      availableCommission: ops.reduce((s, o) => s + (o.agentCommission || 0), 0),
      currency: AGENT_PORTAL_CURRENCY,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildCustomerSummaries(): AgentPortalCustomerSummary[] {
    const served = AgentKioskStore.getServedCustomers();
    const bookmarks = new Set(AgentKioskStore.getBookmarkedCustomerIds());
    const onboarded = AgentKioskStore.getOnboardedCustomers();
    const master = CustomerLifecycleEngine.getInstance();

    const servedRows: AgentPortalCustomerSummary[] = served
      .map((c) => ({
        id: c.key,
        fullName: c.fullName,
        phone: c.phone,
        maskedAccount: c.maskedAccount,
        bankName: c.bankName,
        source: (bookmarks.has(c.key) ? "BOOKMARKED" : "SERVED") as "SERVED" | "BOOKMARKED",
        lastServedAt: c.lastServedAt,
        transactionCount: c.count,
        totalVolume: c.volume,
      }))
      .sort((a, b) => (b.lastServedAt || "").localeCompare(a.lastServedAt || ""));

    const onboardedRows: AgentPortalCustomerSummary[] = onboarded.map((o) => {
      const rec = master.getCustomer(o.customerId);
      return {
        id: o.customerId,
        fullName: o.fullName,
        phone: o.phone,
        source: "ONBOARDED" as const,
        transactionCount: 0,
        totalVolume: 0,
        onboardedCustomerId: o.customerId,
        onboardedCustomerCode: rec?.customerCode || o.customerCode,
        kycTier: rec?.kycTier || o.kycTier,
      };
    });

    return [...onboardedRows, ...servedRows].slice(0, 100);
  }

  // -------------------------------------------------------------------------
  // Operations — REAL double-entry + float subledger + till tracking
  // -------------------------------------------------------------------------

  public async executeOperation(req: AgentOperationRequest): Promise<AgentOperationResult> {
    const { kind, amount, idempotencyKey } = req;

    if (!idempotencyKey || idempotencyKey.length < 8) {
      return { success: false, code: "IDEMPOTENCY_REQUIRED", message: "An idempotency key is required." };
    }
    const existing = AgentKioskStore.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { success: true, operation: existing, code: "IDEMPOTENT_REPLAY" };
    }
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      return { success: false, code: "INVALID_AMOUNT", message: "Amount must be a positive whole-₦ figure." };
    }
    if (amount > 200_000) {
      return {
        success: false,
        code: "ABOVE_SINGLE_LIMIT",
        message: "Amount exceeds the single-transaction limit of ₦200,000 (engine limit).",
      };
    }

    ensureAgentFloatSubledger();
    const float = walletFloat();
    const tillCash = AgentKioskStore.getRunningTill();

    if (kind === "CASH_IN" || kind === "TRANSFER_NIP") {
      if (float < amount) {
        return {
          success: false,
          code: "INSUFFICIENT_FLOAT",
          message: `Wallet float ₦${float.toLocaleString()} cannot cover ₦${amount.toLocaleString()}. Top up the float first.`,
        };
      }
    }
    if (kind === "CASH_OUT") {
      if (tillCash < amount) {
        return {
          success: false,
          code: "INSUFFICIENT_TILL_CASH",
          message: `Physical till ₦${tillCash.toLocaleString()} cannot cover ₦${amount.toLocaleString()}.`,
        };
      }
    }

    const minor = wholeToMinor(amount);
    const feeCalc = FeeAndCommissionEngine.calculateAgencySplit(minor);
    const customerFee = Math.round(feeCalc.totalCustomerCost / 100) - amount; // whole ₦
    const agentCommission = Math.round(feeCalc.agentCommission / 100);

    const isDebitFloat = kind === "CASH_IN" || kind === "TRANSFER_NIP";
    const entries = isDebitFloat
      ? [
          { accountId: FLOAT_ACCOUNT_ID, entryType: "DEBIT" as const, amount: minor, narration: `${kind} — e-float delivered to clearing` },
          { accountId: CLEARING_POOL_ACCOUNT_ID, entryType: "CREDIT" as const, amount: minor, narration: `${kind} — settlement pool credit` },
        ]
      : [
          { accountId: CLEARING_POOL_ACCOUNT_ID, entryType: "DEBIT" as const, amount: minor, narration: `${kind} — settlement pool debit` },
          { accountId: FLOAT_ACCOUNT_ID, entryType: "CREDIT" as const, amount: minor, narration: `${kind} — e-float replenished to agent` },
        ];

    let ledgerTx;
    try {
      ledgerTx = await LedgerService.postTransaction({
        orgId: "org_kor_99182",
        transactionReference: `KP-AGT-${kind}-${idempotencyKey.slice(0, 20)}`,
        description: `${kind} agency banking operation`,
        currency: AGENT_PORTAL_CURRENCY,
        entries,
      });
    } catch (error: any) {
      return {
        success: false,
        code: "LEDGER_UNAVAILABLE",
        message: error?.message || "Ledger refused the transaction.",
      };
    }

    // Move the float subledger (whole units, display truth)
    SubledgerEngine.getInstance().mutateBalance({
      subledgerType: "AGENT_FLOAT",
      entityId: agentId(),
      accountCode: "2110",
      currency: AGENT_PORTAL_CURRENCY,
      country: "NG",
      deltaAmount: isDebitFloat ? -amount : amount,
    });

    // Track the physical till (anchored to the engine till seed)
    AgentKioskStore.setRunningTill(isDebitFloat ? tillCash + amount : tillCash - amount);

    const now = new Date().toISOString();
    const titleByKind: Record<string, string> = {
      CASH_IN: "Customer cash-in deposit",
      CASH_OUT: "Customer cash-out withdrawal",
      TRANSFER_NIP: "Bank transfer (NIP)",
    };
    const operation: AgentPortalOperationType = {
      id: `ag-op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference: ledgerTx.transaction.transactionReference,
      ledgerJournalId: ledgerTx.transaction.id,
      type: kind,
      title: titleByKind[kind],
      amount,
      customerFee,
      agentCommission,
      totalAmount: amount + customerFee,
      currency: AGENT_PORTAL_CURRENCY,
      status: "SUCCESSFUL",
      customerName: req.customerName || undefined,
      customerPhone: req.customerPhone,
      customerAccount: req.customerAccount,
      customerBank: req.customerBank,
      terminalId: AGENT_PORTAL_TERMINAL_ID,
      agentId: agentId(),
      feeRuleApplied: feeCalc.feeRuleApplied,
      createdAt: now,
      completedAt: now,
    };
    AgentKioskStore.addOperation(agentId(), operation);
    AgentKioskStore.recordIdempotencyKey(idempotencyKey, operation.id);
    return { success: true, operation };
  }

  // -------------------------------------------------------------------------
  // Reconciliation (engine cash counts)
  // -------------------------------------------------------------------------

  public submitDailyCashCount(denominations: Record<string, number>): AgentPortalReconciliation {
    const total = Object.entries(denominations).reduce(
      (s, [denom, count]) => s + Number(denom) * count,
      0,
    );
    const expected = AgentKioskStore.getRunningTill();
    const record = CashReconciliationEngine.getInstance().submitCashCount({
      agentId: agentId(),
      currency: "NGN",
      denominationBreakdown: denominations,
      expectedCash: expected,
      submittedBy: AGENT_PORTAL_AGENT_EMAIL,
    });
    return {
      id: record.id,
      reconciliationDate: record.createdAt.slice(0, 10),
      expectedCash: record.expectedCash,
      totalCounted: record.totalPhysicalCash,
      varianceAmount: record.varianceAmount,
      status: record.status,
      denominationBreakdown: record.denominationBreakdown,
      submittedAt: record.createdAt,
    };
  }

  // -------------------------------------------------------------------------
  // Settlements (real float sweep journal)
  // -------------------------------------------------------------------------

  public async requestFloatSweep(): Promise<AgentPortalSettlement | { code: string; message: string }> {
    const float = walletFloat();
    if (float <= 0) {
      return { code: "NOTHING_TO_SWEEP", message: "There is no float balance to sweep." };
    }
    const minor = wholeToMinor(float);
    let ledgerTx;
    try {
      ledgerTx = await LedgerService.postTransaction({
        orgId: "org_kor_99182",
        transactionReference: `KP-AGT-SWEEP-${Date.now().toString(36).toUpperCase()}`,
        description: "Agent float sweep to settlement bank",
        currency: AGENT_PORTAL_CURRENCY,
        entries: [
          { accountId: FLOAT_ACCOUNT_ID, entryType: "DEBIT" as const, amount: minor, narration: "Float sweep — e-float to settlement bank" },
          { accountId: CLEARING_POOL_ACCOUNT_ID, entryType: "CREDIT" as const, amount: minor, narration: "Float sweep — clearing pool credit" },
        ],
      });
    } catch (error: any) {
      return { code: "LEDGER_UNAVAILABLE", message: error?.message || "Ledger refused the sweep." };
    }

    SubledgerEngine.getInstance().mutateBalance({
      subledgerType: "AGENT_FLOAT",
      entityId: agentId(),
      accountCode: "2110",
      currency: AGENT_PORTAL_CURRENCY,
      country: "NG",
      deltaAmount: -float,
    });

    const settlement: AgentPortalSettlement = {
      id: `ag-stl-${Date.now().toString(36).toUpperCase()}`,
      reference: ledgerTx.transaction.transactionReference,
      ledgerJournalId: ledgerTx.transaction.id,
      amount: float,
      kind: "FLOAT_SWEEP",
      status: "SETTLED",
      destinationAccountMasked: `${AGENT_PORTAL_SETTLEMENT_ACCOUNT.slice(0, 4)} •••• ${AGENT_PORTAL_SETTLEMENT_ACCOUNT.slice(-2)}`,
      destinationBank: "Providus Bank Nigeria",
      requestedAt: new Date().toISOString(),
    };
    AgentKioskStore.addSettlement({
      id: settlement.id,
      reference: settlement.reference,
      ledgerJournalId: settlement.ledgerJournalId,
      amount: settlement.amount,
      kind: settlement.kind,
      status: settlement.status,
      destinationAccountMasked: settlement.destinationAccountMasked,
      destinationBank: settlement.destinationBank,
      requestedAt: settlement.requestedAt,
    });
    return settlement;
  }

  // -------------------------------------------------------------------------
  // Support tickets (complaint engine)
  // -------------------------------------------------------------------------

  public submitTicket(params: {
    category: string;
    description: string;
    disputedAmount: number;
    transactionReference?: string;
    customerName?: string;
    customerPhone?: string;
  }): AgentPortalComplaint | { code: string; message: string } {
    const complaint = ComplaintDisputeEngine.getInstance().createComplaint({
      customerId: params.customerPhone
        ? `walkin-${params.customerPhone.replace(/\D/g, "").slice(-8)}`
        : `walkin-${agentId()}`,
      customerName: params.customerName || "Walk-in customer",
      customerPhone: params.customerPhone || "Unknown",
      country: "NG",
      category: params.category as never,
      transactionReference: params.transactionReference,
      agentId: agentId(),
      terminalId: AGENT_PORTAL_TERMINAL_ID,
      disputedAmount: params.disputedAmount,
      currency: "NGN",
      description: params.description,
    });
    return {
      id: complaint.id,
      complaintReference: complaint.complaintReference,
      category: complaint.category,
      priority: complaint.priority || "P3",
      status: complaint.status,
      transactionReference: complaint.transactionReference,
      description: complaint.description,
      disputedAmount: complaint.disputedAmount,
      currency: complaint.currency,
      slaDueAt: complaint.slaDueAt,
      isSlaBreached: complaint.isSlaBreached,
      createdAt: complaint.createdAt,
    };
  }

  // -------------------------------------------------------------------------
  // Customers (master onboarding + kiosk bookmarks)
  // -------------------------------------------------------------------------

  public onboardCustomer(params: {
    fullName: string;
    phone: string;
    email: string;
  }): AgentPortalCustomerSummary | { code: string; message: string } {
    if (!params.fullName || params.fullName.trim().length < 3) {
      return { code: "NAME_REQUIRED", message: "Enter the customer's full name." };
    }
    if (!/^\+?\d{10,15}$/.test(params.phone.replace(/\s/g, ""))) {
      return { code: "PHONE_REQUIRED", message: "Enter a valid phone number." };
    }
    const customer = CustomerLifecycleEngine.getInstance().registerCustomer({
      tenantId: "tenant-korie-core",
      fullName: params.fullName.trim(),
      email: params.email.trim() || `${params.phone.replace(/\D/g, "")}@walkin.koriepay.ng`,
      phone: params.phone.trim(),
      country: "NG",
      customerType: "PERSONAL",
      kycTier: "TIER_1",
      riskStatus: "LOW",
    });
    AgentKioskStore.addOnboardedCustomer({
      customerId: customer.id,
      customerCode: customer.customerCode,
      fullName: customer.fullName,
      phone: customer.phone,
      kycTier: customer.kycTier,
      registeredAt: new Date().toISOString(),
    });
    return {
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      source: "ONBOARDED",
      transactionCount: 0,
      totalVolume: 0,
      onboardedCustomerId: customer.id,
      onboardedCustomerCode: customer.customerCode,
      kycTier: customer.kycTier,
    };
  }

  public toggleCustomerBookmark(customerKey: string): { bookmarked: boolean } {
    return { bookmarked: AgentKioskStore.toggleBookmark(customerKey) };
  }
}

export const agentPortalEngine = AgentPortalEngine.getInstance();
