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
   * Tiered NIP pricing model per CBN's 2026 Guide to Charges (exposure draft,
   * circular dated 21 Apr 2026, effective 1 May 2026, superseding the 2020 Guide),
   * plus 7.5% statutory VAT on the fee only, plus the Nigeria Tax Act 2025
   * "Stamp Duty" (formerly Electronic Money Transfer Levy) of a flat NGN 50 on
   * transfers of NGN 10,000 and above, borne by the sender from 1 Jan 2026.
   */
  public static calculateNgnTransferFee(amount: number): FeeCalculationResult {
    let baseFee = 0;
    if (amount <= 5000_00) {
      baseFee = 0; // FREE under 2026 Guide (was ₦10 under the 2020 Guide)
    } else if (amount <= 50000_00) {
      baseFee = 10_00; // ₦10.00 (was ₦25 under the 2020 Guide)
    } else {
      baseFee = 50_00; // ₦50.00 (unchanged)
    }

    const vat = Math.round(baseFee * 0.075); // VAT applies to the fee only, never the principal
    const stampDuty = amount >= 10000_00 ? 50_00 : 0; // Nigeria Tax Act 2025 Stamp Duty (ex-EMTL), sender-borne from 2026
    const totalFee = baseFee + vat + stampDuty;

    return {
      principalAmount: amount,
      platformFee: baseFee,
      vatAmount: vat,
      totalCustomerCost: amount + totalFee,
      agentCommission: 0,
      netPayableToRecipient: amount,
      currency: 'NGN',
      feeRuleApplied: 'RULE_NGN_NIP_TIERED_FEE_v2_2026',
    };
  }

  /**
   * Calculate merchant checkout processing fees (Merchant Service Charge / MDR)
   * Per CBN's 2026 Guide to Charges: MSC capped at 0.5%, maximum NGN 10,000,
   * borne solely by the merchant (cardholders/payers are not charged extra at
   * the point of sale regardless of payment method).
   */
  public static calculateMerchantMdr(amount: number, customRateBps: number = 50): FeeCalculationResult {
    const rawFee = Math.round((amount * customRateBps) / 10000);
    const maxCap = 10000_00; // ₦10,000 CBN MSC cap
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
      feeRuleApplied: 'RULE_MERCHANT_MSC_50BPS_CAPPED_v2_2026',
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
