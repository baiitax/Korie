// Subledger Engine for Granular Wallets, Merchant Payables, Agent Floats & Clearing

import fs from 'fs';
import path from 'path';
import {
  SubledgerAccount,
  SubledgerType,
} from '@/types/financeGlEngine';

const SUBLEDGER_STORE_PATH = process.env.SUBLEDGER_STORE_PATH || '/tmp/korie-subledger-store.json';

export class SubledgerEngine {
  private static instance: SubledgerEngine;

  private subledgers: Map<string, SubledgerAccount> = new Map();

  private constructor() {
    this.seedSubledgers();
    this.hydrate();
  }

  private hydrate() {
    try {
      if (!fs.existsSync(SUBLEDGER_STORE_PATH)) return;
      const data = JSON.parse(fs.readFileSync(SUBLEDGER_STORE_PATH, 'utf8'));
      if (Array.isArray(data.subledgers)) {
        this.subledgers.clear();
        for (const sub of data.subledgers) {
          this.subledgers.set(`${sub.subledgerType}:${sub.entityId}:${sub.currency}`, sub);
        }
      }
    } catch {
      /* corrupt/missing store — keep seeds */
    }
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(SUBLEDGER_STORE_PATH), { recursive: true });
      fs.writeFileSync(
        SUBLEDGER_STORE_PATH,
        JSON.stringify({ subledgers: Array.from(this.subledgers.values()) }),
      );
    } catch {
      /* non-fatal */
    }
  }

  public static getInstance(): SubledgerEngine {
    if (!SubledgerEngine.instance) {
      SubledgerEngine.instance = new SubledgerEngine();
    }
    return SubledgerEngine.instance;
  }

  private seedSubledgers() {
    const defaultSubledgers: SubledgerAccount[] = [
      {
        id: 'sub-cust-01',
        subledgerType: 'CUSTOMER_WALLET',
        entityId: 'cust-ng-001-ibrahim',
        accountCode: '2010',
        currency: 'NGN',
        country: 'NG',
        currentBalance: 1250000.0,
        heldBalance: 0.0,
        availableBalance: 1250000.0,
        isActive: true,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-09-03T12:00:00Z',
      },
      {
        id: 'sub-cust-02',
        subledgerType: 'CUSTOMER_WALLET',
        entityId: 'cust-ne-001-amara',
        accountCode: '2020',
        currency: 'XOF',
        country: 'NE',
        currentBalance: 450000.0,
        heldBalance: 0.0,
        availableBalance: 450000.0,
        isActive: true,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-09-03T12:00:00Z',
      },
      {
        // Cross-border XOF wallet for the premium Nigerian customer (mirrors
        // the account seed acc-ng-02). Authoritative balance for the XOF vault.
        id: 'sub-cust-03',
        subledgerType: 'CUSTOMER_WALLET',
        entityId: 'cust-ng-001-ibrahim',
        accountCode: '2020',
        currency: 'XOF',
        country: 'NE',
        currentBalance: 1850000.0,
        heldBalance: 0.0,
        availableBalance: 1850000.0,
        isActive: true,
        createdAt: '2026-08-05T00:00:00Z',
        updatedAt: '2026-09-03T12:00:00Z',
      },
      {
        id: 'sub-merch-01',
        subledgerType: 'MERCHANT_PAYABLE',
        entityId: 'merch-ng-001-jumia-hub',
        accountCode: '2100',
        currency: 'NGN',
        country: 'NG',
        currentBalance: 8400000.0,
        heldBalance: 400000.0, // 5% rolling reserve
        availableBalance: 8000000.0,
        isActive: true,
        createdAt: '2026-08-10T00:00:00Z',
        updatedAt: '2026-09-03T12:00:00Z',
      },
      {
        id: 'sub-prov-01',
        subledgerType: 'PROVIDER_CLEARING',
        entityId: 'prov-node-providus-ng',
        accountCode: '1010',
        currency: 'NGN',
        country: 'NG',
        currentBalance: 145000000.0,
        heldBalance: 0.0,
        availableBalance: 145000000.0,
        isActive: true,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-09-03T12:00:00Z',
      },
    ];

    defaultSubledgers.forEach((s) => this.subledgers.set(`${s.subledgerType}:${s.entityId}:${s.currency}`, s));
  }

  public getSubledger(type: SubledgerType, entityId: string, currency: string): SubledgerAccount | undefined {
    this.hydrate();
    return this.subledgers.get(`${type}:${entityId}:${currency}`);
  }

  public getAllSubledgers(): SubledgerAccount[] {
    this.hydrate();
    return Array.from(this.subledgers.values());
  }

  public placeHold(type: SubledgerType, entityId: string, currency: string, amount: number): { success: boolean; error?: string } {
    const key = `${type}:${entityId}:${currency}`;
    const account = this.subledgers.get(key);
    if (!account) {
      return { success: false, error: 'SUBLEDGER_NOT_FOUND' };
    }
    if (account.availableBalance < amount) {
      return {
        success: false,
        error: `INSUFFICIENT_AVAILABLE_BALANCE: Account has ${account.availableBalance} ${currency}, required hold: ${amount}`,
      };
    }

    account.heldBalance += amount;
    account.availableBalance = account.currentBalance - account.heldBalance;
    account.updatedAt = new Date().toISOString();
    this.subledgers.set(key, account);
    this.persist();

    return { success: true };
  }

  public releaseHold(type: SubledgerType, entityId: string, currency: string, amount: number): { success: boolean; error?: string } {
    const key = `${type}:${entityId}:${currency}`;
    const account = this.subledgers.get(key);
    if (!account) {
      return { success: false, error: 'SUBLEDGER_NOT_FOUND' };
    }

    account.heldBalance = Math.max(0, account.heldBalance - amount);
    account.availableBalance = account.currentBalance - account.heldBalance;
    account.updatedAt = new Date().toISOString();
    this.subledgers.set(key, account);
    this.persist();

    return { success: true };
  }

  public mutateBalance(params: {
    subledgerType: SubledgerType;
    entityId: string;
    accountCode: string;
    currency: string;
    country: string;
    deltaAmount: number; // Positive = credit/increase, Negative = debit/decrease
    releaseHeldAmount?: number;
  }): { success: boolean; account?: SubledgerAccount; error?: string } {
    const { subledgerType, entityId, accountCode, currency, country, deltaAmount, releaseHeldAmount = 0 } = params;
    const key = `${subledgerType}:${entityId}:${currency}`;

    let account = this.subledgers.get(key);
    if (!account) {
      // Auto-provision subledger if active
      account = {
        id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        subledgerType,
        entityId,
        accountCode,
        currency,
        country,
        currentBalance: 0,
        heldBalance: 0,
        availableBalance: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    account.currentBalance += deltaAmount;
    if (releaseHeldAmount > 0) {
      account.heldBalance = Math.max(0, account.heldBalance - releaseHeldAmount);
    }
    account.availableBalance = account.currentBalance - account.heldBalance;
    account.updatedAt = new Date().toISOString();

    this.subledgers.set(key, account);
    this.persist();
    return { success: true, account };
  }
}
