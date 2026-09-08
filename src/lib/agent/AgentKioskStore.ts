// =============================================================================
// File: src/lib/agent/AgentKioskStore.ts
// Description: File-backed runtime store for the agent kiosk (DEMO runtime).
// Holds executed kiosk operations (each carrying REAL ledger journal/payment
// references from LedgerService — nothing fabricated), idempotency-key guard
// history, running physical-till tracking anchored to the engine till seed,
// bookmarked/served customers, and settlement requests.
// Runtime file: /tmp/korie-agent-kiosk.json (env AGENT_KIOSK_STORE_PATH).
// NEVER committed.
// =============================================================================

import fs from "fs";
import path from "path";
import { AgentPortalOperationType } from "@/types/agentPortal";

const STORE_PATH = process.env.AGENT_KIOSK_STORE_PATH || "/tmp/korie-agent-kiosk.json";

interface KioskState {
  agentId: string;
  runningTillCash: number;
  tillAnchoredAt?: string;
  operations: AgentPortalOperationType[];
  idempotencyKeys: Record<string, string>; // key -> operation id
  bookmarkedCustomerIds: string[];
  onboardedCustomers: {
    customerId: string;
    customerCode: string;
    fullName: string;
    phone: string;
    kycTier: string;
    registeredAt: string;
  }[];
  servedCustomers: Record<
    string,
    { fullName: string; phone: string; maskedAccount?: string; bankName?: string; lastServedAt: string; count: number; volume: number }
  >;
  settlements: {
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
  }[];
}

class AgentKioskStoreSingleton {
  private state: KioskState = {
    agentId: "",
    runningTillCash: 0,
    operations: [],
    idempotencyKeys: {},
    bookmarkedCustomerIds: [],
    onboardedCustomers: [],
    servedCustomers: {},
    settlements: [],
  };

  constructor() {
    this.hydrate();
  }

  private hydrate() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
      if (data && typeof data === "object") {
        this.state = { ...this.state, ...data };
      }
    } catch {
      /* corrupt/missing store — start empty */
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

  /** Anchor the running till to the engine's seeded till position once. */
  public ensureTillAnchored(agentId: string, engineTillCash: number) {
    this.hydrate();
    if (this.state.agentId !== agentId) {
      this.state.agentId = agentId;
      this.state.runningTillCash = engineTillCash;
      this.state.tillAnchoredAt = new Date().toISOString();
      this.persist();
    }
  }

  public getRunningTill(): number {
    this.hydrate();
    return this.state.runningTillCash;
  }

  public setRunningTill(cash: number) {
    this.state.runningTillCash = Math.max(0, cash);
    this.persist();
  }

  public getOperations(agentId: string, limit = 100): AgentPortalOperationType[] {
    this.hydrate();
    return this.state.operations
      .filter((o) => o.agentId === agentId)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, limit);
  }

  public addOperation(agentId: string, op: AgentPortalOperationType) {
    this.state.operations.unshift(op);
    this.persist();

    // Update served-customer rollup
    if (op.customerName) {
      const key = `${op.customerName}|${op.customerPhone || ""}`;
      const existing = this.state.servedCustomers[key];
      this.state.servedCustomers[key] = {
        fullName: op.customerName,
        phone: op.customerPhone || "",
        maskedAccount: op.customerAccount ? `•••• •••• ${op.customerAccount.slice(-4)}` : undefined,
        bankName: op.customerBank,
        lastServedAt: op.createdAt,
        count: (existing?.count || 0) + 1,
        volume: (existing?.volume || 0) + op.amount,
      };
      this.persist();
    }
  }

  /** Idempotency guard: returns the previously created operation if the key was used. */
  public findByIdempotencyKey(key: string): AgentPortalOperationType | undefined {
    this.hydrate();
    const opId = this.state.idempotencyKeys[key];
    if (!opId) return undefined;
    return this.state.operations.find((o) => o.id === opId);
  }

  public recordIdempotencyKey(key: string, operationId: string) {
    this.state.idempotencyKeys[key] = operationId;
    this.persist();
  }

  public getServedCustomers(): Array<{
    key: string;
    fullName: string;
    phone: string;
    maskedAccount?: string;
    bankName?: string;
    lastServedAt: string;
    count: number;
    volume: number;
  }> {
    this.hydrate();
    return Object.entries(this.state.servedCustomers).map(([key, c]) => ({ key, ...c }));
  }

  public toggleBookmark(customerKey: string): boolean {
    this.hydrate();
    const idx = this.state.bookmarkedCustomerIds.indexOf(customerKey);
    if (idx >= 0) {
      this.state.bookmarkedCustomerIds.splice(idx, 1);
      this.persist();
      return false;
    }
    this.state.bookmarkedCustomerIds.push(customerKey);
    this.persist();
    return true;
  }

  public getBookmarkedCustomerIds(): string[] {
    this.hydrate();
    return [...this.state.bookmarkedCustomerIds];
  }

  public addOnboardedCustomer(rec: KioskState["onboardedCustomers"][number]) {
    this.state.onboardedCustomers.unshift(rec);
    this.persist();
  }

  public getOnboardedCustomers() {
    this.hydrate();
    return [...this.state.onboardedCustomers];
  }

  public addSettlement(rec: KioskState["settlements"][number]) {
    this.state.settlements.unshift(rec);
    this.persist();
  }

  public getSettlements() {
    this.hydrate();
    return [...this.state.settlements].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  public resetForAgent(agentId: string) {
    this.state.agentId = agentId;
    this.state.runningTillCash = 0;
    this.state.operations = [];
    this.state.settlements = [];
    this.state.idempotencyKeys = {};
    this.persist();
  }
}

export const AgentKioskStore = new AgentKioskStoreSingleton();
