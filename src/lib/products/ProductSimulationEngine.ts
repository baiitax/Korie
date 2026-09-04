// Banking Product Simulation Engine (Pre-Flight Sandbox Testing)

import { BankingProductFactory } from './BankingProductFactory';
import { ProductSimulationResult } from '@/types/customerProductFactory';

export class ProductSimulationEngine {
  private static instance: ProductSimulationEngine;

  private constructor() {}

  public static getInstance(): ProductSimulationEngine {
    if (!ProductSimulationEngine.instance) {
      ProductSimulationEngine.instance = new ProductSimulationEngine();
    }
    return ProductSimulationEngine.instance;
  }

  public simulateProductTransaction(params: {
    productCode: string;
    amount: number;
    channel: string;
  }): ProductSimulationResult {
    const { productCode, amount, channel } = params;
    const productFactory = BankingProductFactory.getInstance();
    const product = productFactory.getProduct(productCode);

    const reasonCodes: string[] = [];

    if (!product) {
      return {
        productId: 'unknown',
        productCode,
        simulatedAmount: amount,
        currency: 'NGN',
        calculatedFee: 0,
        vatAmount: 0,
        netDebitAmount: amount,
        ledgerJournalPreview: { debitAccount: '', creditAccount: '', feeAccount: '', isBalanced: false },
        eligibilityPassed: false,
        decision: 'DECLINE',
        reasonCodes: ['PRODUCT_NOT_FOUND'],
      };
    }

    // Calculate fee
    const fee = amount >= 50000 ? 50 : amount >= 5000 ? 25 : 10;
    const vat = Number((fee * 0.075).toFixed(2));
    const netDebit = amount + fee;

    // Check Single Limit
    if (amount > product.singleTransactionLimit) {
      reasonCodes.push(`AMOUNT_EXCEEDS_SINGLE_LIMIT (${amount} > ${product.singleTransactionLimit})`);
    }

    // Check Channel
    if (!product.allowedChannels.includes(channel)) {
      reasonCodes.push(`CHANNEL_NOT_ALLOWED (${channel})`);
    }

    const decision = reasonCodes.length === 0 ? 'ALLOW' : 'DECLINE';

    return {
      productId: product.id,
      productCode: product.productCode,
      simulatedAmount: amount,
      currency: product.currency,
      calculatedFee: fee,
      vatAmount: vat,
      netDebitAmount: netDebit,
      ledgerJournalPreview: {
        debitAccount: product.glLiabilityWalletCode, // Dr Customer Wallet
        creditAccount: product.glAssetPoolCode, // Cr Bank Pool
        feeAccount: product.glFeeRevenueCode, // Cr Fee Revenue
        isBalanced: true,
      },
      eligibilityPassed: reasonCodes.length === 0,
      decision,
      reasonCodes: reasonCodes.length === 0 ? ['SIMULATION_PASSED_CLEANLY'] : reasonCodes,
    };
  }
}
