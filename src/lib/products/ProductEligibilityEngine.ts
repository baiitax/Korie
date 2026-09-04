// Tier-1 Dynamic Product Eligibility & Evaluation Engine

import { BankingProductFactory } from './BankingProductFactory';
import { CustomerRecord } from '@/types/customerProductFactory';

export class ProductEligibilityEngine {
  private static instance: ProductEligibilityEngine;

  private constructor() {}

  public static getInstance(): ProductEligibilityEngine {
    if (!ProductEligibilityEngine.instance) {
      ProductEligibilityEngine.instance = new ProductEligibilityEngine();
    }
    return ProductEligibilityEngine.instance;
  }

  public evaluateEligibility(params: {
    customer: CustomerRecord;
    productCode: string;
  }): {
    eligible: boolean;
    decision: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_REQUIRED' | 'RESTRICTED';
    reasonCodes: string[];
  } {
    const { customer, productCode } = params;
    const productFactory = BankingProductFactory.getInstance();
    const product = productFactory.getProduct(productCode);

    const reasonCodes: string[] = [];

    if (!product) {
      return { eligible: false, decision: 'INELIGIBLE', reasonCodes: ['PRODUCT_NOT_FOUND'] };
    }

    if (product.status !== 'ACTIVE') {
      return { eligible: false, decision: 'INELIGIBLE', reasonCodes: ['PRODUCT_INACTIVE_OR_SUSPENDED'] };
    }

    // 1. Jurisdiction & Residency Check
    if (product.jurisdiction !== 'CROSS_BORDER' && product.jurisdiction !== customer.country) {
      reasonCodes.push(`JURISDICTION_MISMATCH: Customer is in ${customer.country}, product requires ${product.jurisdiction}`);
    }

    // 2. Customer Segment Check
    if (product.customerType !== customer.customerType && product.customerType !== 'PERSONAL') {
      reasonCodes.push(`SEGMENT_MISMATCH: Customer is ${customer.customerType}, product is ${product.customerType}`);
    }

    // 3. KYC Tier Requirement
    const tierRanks: Record<string, number> = { TIER_1: 1, TIER_2: 2, TIER_3: 3 };
    const requiredRank = tierRanks[product.minKycTier] || 1;
    const customerRank = tierRanks[customer.kycTier] || 1;

    if (customerRank < requiredRank) {
      reasonCodes.push(`KYC_TIER_INSUFFICIENT: Product requires ${product.minKycTier}, customer is ${customer.kycTier}`);
    }

    // 4. Risk Score Ceiling
    if (customer.riskScore > product.maxRiskScore) {
      reasonCodes.push(`RISK_SCORE_EXCEEDED: Customer risk score ${customer.riskScore} exceeds product ceiling ${product.maxRiskScore}`);
    }

    // 5. Customer Lifecycle Restrictions
    if (customer.status === 'FROZEN' || customer.status === 'SUSPENDED') {
      return {
        eligible: false,
        decision: 'RESTRICTED',
        reasonCodes: [`CUSTOMER_LIFECYCLE_LOCKED: Customer is currently ${customer.status}`],
      };
    }

    if (reasonCodes.length > 0) {
      const isReviewable = reasonCodes.some((r) => r.includes('KYC_TIER_INSUFFICIENT'));
      return {
        eligible: false,
        decision: isReviewable ? 'REVIEW_REQUIRED' : 'INELIGIBLE',
        reasonCodes,
      };
    }

    return {
      eligible: true,
      decision: 'ELIGIBLE',
      reasonCodes: ['ALL_CRITERIA_SATISFIED'],
    };
  }
}
