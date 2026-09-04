// Tier-1 Multi-Dimensional Versioned Limit Engine

import { BankingProductFactory } from '../products/BankingProductFactory';
import { CustomerRecord, CustomerAccountRecord } from '@/types/customerProductFactory';

export interface LimitEvaluationResult {
  allowed: boolean;
  singleLimit: number;
  dailyLimit: number;
  currentDailyConsumption: number;
  remainingDailyLimit: number;
  reasonCodes: string[];
}

export class AccountLimitEngine {
  private static instance: AccountLimitEngine;

  private dailyConsumptionStore: Map<string, number> = new Map(); // accountId:date -> amount

  private constructor() {}

  public static getInstance(): AccountLimitEngine {
    if (!AccountLimitEngine.instance) {
      AccountLimitEngine.instance = new AccountLimitEngine();
    }
    return AccountLimitEngine.instance;
  }

  public evaluateLimit(params: {
    customer: CustomerRecord;
    account: CustomerAccountRecord;
    transactionAmount: number;
  }): LimitEvaluationResult {
    const { customer, account, transactionAmount } = params;
    const productFactory = BankingProductFactory.getInstance();
    const product = productFactory.getProduct(account.productId || account.productCode || '');

    const singleLimit = product?.singleTransactionLimit || (customer.kycTier === 'TIER_1' ? 50000 : 200000);
    const dailyLimit = product?.dailyTransactionLimit || (customer.kycTier === 'TIER_1' ? 300000 : 1000000);

    const todayKey = `${account.id}:${new Date().toISOString().split('T')[0]}`;
    const currentDailyConsumption = this.dailyConsumptionStore.get(todayKey) || 0;
    const remainingDailyLimit = Math.max(0, dailyLimit - currentDailyConsumption);

    const reasonCodes: string[] = [];

    // Check Single Limit
    if (transactionAmount > singleLimit) {
      reasonCodes.push(`SINGLE_LIMIT_EXCEEDED: Requested ${account.currency} ${transactionAmount} exceeds cap ${singleLimit}`);
    }

    // Check Daily Cumulative Limit
    if (currentDailyConsumption + transactionAmount > dailyLimit) {
      reasonCodes.push(`DAILY_LIMIT_EXCEEDED: Daily total would reach ${currentDailyConsumption + transactionAmount}, exceeding daily cap ${dailyLimit}`);
    }

    const allowed = reasonCodes.length === 0;

    return {
      allowed,
      singleLimit,
      dailyLimit,
      currentDailyConsumption,
      remainingDailyLimit,
      reasonCodes,
    };
  }

  public recordTransactionConsumption(accountId: string, amount: number) {
    const todayKey = `${accountId}:${new Date().toISOString().split('T')[0]}`;
    const current = this.dailyConsumptionStore.get(todayKey) || 0;
    this.dailyConsumptionStore.set(todayKey, current + amount);
  }
}
