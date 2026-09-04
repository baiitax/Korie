// =============================================================================
// File: src/lib/adashi/AdashiProductFactoryEngine.ts
// Description: Product Template Factory Engine for Adashi / ROSCA Products
// =============================================================================

import { AdashiStore } from './AdashiStore';
import { AdashiProduct, AdashiCurrency, AdashiCountry, AdashiCadence } from '@/types/adashiEngine';

export interface CreateProductInput {
  productCode: string;
  productName: string;
  description?: string;
  currency: AdashiCurrency;
  countryCode: AdashiCountry;
  cadence: AdashiCadence;
  minMembers: number;
  maxMembers: number;
  contributionAmount: number;
  platformFeePercent: number;
  agentCommissionPercent: number;
  gracePeriodHours: number;
  maxOverdueDays: number;
  allowPartialPayouts: boolean;
  requiresMakerCheckerPayout: boolean;
  payoutMakerCheckerThreshold: number;
}

export class AdashiProductFactoryEngine {
  /**
   * Validate and create a new Adashi Product template
   */
  static createProduct(input: CreateProductInput, actorId: string): AdashiProduct {
    // Validate Currency / Country alignment
    if (input.countryCode === 'NG' && input.currency !== 'NGN') {
      throw new Error(`Jurisdiction mismatch: Country 'NG' requires currency 'NGN'.`);
    }
    if (input.countryCode === 'NE' && input.currency !== 'XOF') {
      throw new Error(`Jurisdiction mismatch: Country 'NE' requires currency 'XOF'.`);
    }

    // Validate Fee Caps
    if (input.platformFeePercent < 0 || input.platformFeePercent > 5.0) {
      throw new Error(`Platform fee percentage must be between 0.0% and 5.0% (regulatory cap).`);
    }
    if (input.agentCommissionPercent < 0 || input.agentCommissionPercent > 3.0) {
      throw new Error(`Agent commission percentage must be between 0.0% and 3.0%.`);
    }

    // Validate Member constraints
    if (input.minMembers < 2) {
      throw new Error(`Minimum members must be at least 2.`);
    }
    if (input.maxMembers > 100) {
      throw new Error(`Maximum members cannot exceed 100.`);
    }
    if (input.contributionAmount <= 0) {
      throw new Error(`Contribution amount must be strictly positive.`);
    }

    const product: AdashiProduct = {
      id: `prod-${Date.now()}`,
      productCode: input.productCode.toUpperCase(),
      productName: input.productName,
      description: input.description || '',
      currency: input.currency,
      countryCode: input.countryCode,
      cadence: input.cadence,
      minMembers: input.minMembers,
      maxMembers: input.maxMembers,
      contributionAmount: input.contributionAmount,
      platformFeePercent: input.platformFeePercent,
      agentCommissionPercent: input.agentCommissionPercent,
      gracePeriodHours: input.gracePeriodHours,
      maxOverdueDays: input.maxOverdueDays,
      allowPartialPayouts: input.allowPartialPayouts,
      requiresMakerCheckerPayout: input.requiresMakerCheckerPayout,
      payoutMakerCheckerThreshold: input.payoutMakerCheckerThreshold,
      version: 1,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    AdashiStore.addProduct(product);

    AdashiStore.logAuditEvent({
      eventType: 'PRODUCT_TEMPLATE_CREATED',
      actorId,
      actorRole: 'ADMIN',
      details: { productCode: product.productCode, currency: product.currency },
      correlationId: `prod-create-${Date.now()}`,
    });

    return product;
  }

  /**
   * Deprecate an existing Product template
   */
  static deprecateProduct(productId: string, actorId: string): AdashiProduct {
    const product = AdashiStore.getProductById(productId);
    if (!product) throw new Error(`Product '${productId}' not found.`);

    const updated = AdashiStore.updateProduct(product.id, {
      status: 'DEPRECATED',
    });

    AdashiStore.logAuditEvent({
      eventType: 'PRODUCT_TEMPLATE_DEPRECATED',
      actorId,
      actorRole: 'ADMIN',
      details: { productCode: product.productCode },
      correlationId: `prod-deprecate-${Date.now()}`,
    });

    return updated!;
  }
}
