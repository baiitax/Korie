export interface FeeCalculationResult {
  principalAmount: number; // minor units
  platformFee: number;     // minor units
  vatAmount: number;       // minor units (7.5% in NG)
  totalCustomerCost: number;
  agentCommission: number;
  netPayableToRecipient: number;
  currency: 'NGN' | 'XOF' | 'USD';
  feeRuleApplied: string;
}

export class FeeAndCommissionEngine {
  /**
   * Calculate fees for Nigeria transfers (NGN)
   * Tiered NIP pricing model + 7.5% statutory VAT
   */
  public static calculateNgnTransferFee(amount: number): FeeCalculationResult {
    let baseFee = 0;
    if (amount <= 5000_00) {
      baseFee = 10_00; // ₦10.00
    } else if (amount <= 50000_00) {
      baseFee = 25_00; // ₦25.00
    } else {
      baseFee = 50_00; // ₦50.00
    }

    const vat = Math.round(baseFee * 0.075);
    const totalFee = baseFee + vat;

    return {
      principalAmount: amount,
      platformFee: baseFee,
      vatAmount: vat,
      totalCustomerCost: amount + totalFee,
      agentCommission: 0,
      netPayableToRecipient: amount,
      currency: 'NGN',
      feeRuleApplied: 'RULE_NGN_NIP_TIERED_FEE_v1',
    };
  }

  /**
   * Calculate merchant checkout processing fees (MDR)
   * Standard 1.5% capped at ₦2,000
   */
  public static calculateMerchantMdr(amount: number, customRateBps: number = 150): FeeCalculationResult {
    const rawFee = Math.round((amount * customRateBps) / 10000);
    const maxCap = 2000_00; // ₦2,000 cap
    const mdrFee = Math.min(rawFee, maxCap);
    const vat = Math.round(mdrFee * 0.075);
    const totalFee = mdrFee + vat;

    return {
      principalAmount: amount,
      platformFee: mdrFee,
      vatAmount: vat,
      totalCustomerCost: amount,
      agentCommission: 0,
      netPayableToRecipient: amount - totalFee,
      currency: 'NGN',
      feeRuleApplied: 'RULE_MERCHANT_MDR_150BPS_CAPPED',
    };
  }

  /**
   * Calculate agency cash-in / cash-out commission split
   * 60% to agent float, 40% retained platform fee
   */
  public static calculateAgencySplit(amount: number): FeeCalculationResult {
    let customerFee = 100_00; // ₦100 flat fee for agency transaction
    if (amount > 10000_00) {
      customerFee = Math.round(amount * 0.01); // 1% for larger amounts
    }

    const agentCommission = Math.round(customerFee * 0.60);
    const platformFee = customerFee - agentCommission;

    return {
      principalAmount: amount,
      platformFee,
      vatAmount: 0,
      totalCustomerCost: amount + customerFee,
      agentCommission,
      netPayableToRecipient: amount,
      currency: 'NGN',
      feeRuleApplied: 'RULE_AGENCY_COMMISSION_60_40_SPLIT',
    };
  }
}
