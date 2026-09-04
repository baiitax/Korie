import { HoldReasonCode } from '@/types/financialEngine';

export interface AccountHoldRecord {
  id: string;
  accountCode: string;
  customerId?: string;
  merchantId?: string;
  amount: number; // minor units
  currency: 'NGN' | 'XOF' | 'USD';
  reason: HoldReasonCode;
  referenceId: string;
  status: 'ACTIVE' | 'RELEASED' | 'CAPTURED';
  expiresAt?: string;
  createdAt: string;
  releasedAt?: string;
}

export class HoldsAndReservesEngine {
  private static holds: Map<string, AccountHoldRecord> = new Map();

  /**
   * Places a temporary hold or risk reserve against an account.
   */
  public static placeHold(params: {
    accountCode: string;
    customerId?: string;
    merchantId?: string;
    amount: number;
    currency: 'NGN' | 'XOF' | 'USD';
    reason: HoldReasonCode;
    referenceId: string;
    expiresAt?: string;
  }): AccountHoldRecord {
    if (params.amount <= 0 || !Number.isInteger(params.amount)) {
      throw new Error(`Hold amount must be a positive integer in minor units.`);
    }

    const holdId = `hld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: AccountHoldRecord = {
      id: holdId,
      accountCode: params.accountCode,
      customerId: params.customerId,
      merchantId: params.merchantId,
      amount: params.amount,
      currency: params.currency,
      reason: params.reason,
      referenceId: params.referenceId,
      status: 'ACTIVE',
      expiresAt: params.expiresAt,
      createdAt: new Date().toISOString(),
    };

    this.holds.set(holdId, record);
    return record;
  }

  /**
   * Release an active hold back to available balance.
   */
  public static releaseHold(holdId: string, reason?: string): AccountHoldRecord {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Hold record ${holdId} not found.`);
    }
    if (hold.status !== 'ACTIVE') {
      throw new Error(`Hold ${holdId} is already ${hold.status}.`);
    }

    hold.status = 'RELEASED';
    hold.releasedAt = new Date().toISOString();
    this.holds.set(holdId, hold);
    return hold;
  }

  /**
   * Capture a hold to execute definitive debit.
   */
  public static captureHold(holdId: string): AccountHoldRecord {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Hold record ${holdId} not found.`);
    }
    if (hold.status !== 'ACTIVE') {
      throw new Error(`Hold ${holdId} is already ${hold.status}.`);
    }

    hold.status = 'CAPTURED';
    hold.releasedAt = new Date().toISOString();
    this.holds.set(holdId, hold);
    return hold;
  }

  public static getActiveHolds(accountCode?: string): AccountHoldRecord[] {
    const all = Array.from(this.holds.values()).filter(h => h.status === 'ACTIVE');
    return accountCode ? all.filter(h => h.accountCode === accountCode) : all;
  }

  public static getTotalLockedHolds(accountCode: string): number {
    return this.getActiveHolds(accountCode).reduce((sum, h) => sum + h.amount, 0);
  }
}
