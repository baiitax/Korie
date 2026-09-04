// Tier-1 Banking Product Factory & Configurable Financial Product Catalog

import { BankingProductRecord, ProductStatus, ProductType, CustomerSegment } from '@/types/customerProductFactory';

export class BankingProductFactory {
  private static instance: BankingProductFactory;

  private products: Map<string, BankingProductRecord> = new Map();

  private constructor() {
    this.seedProducts();
  }

  public static getInstance(): BankingProductFactory {
    if (!BankingProductFactory.instance) {
      BankingProductFactory.instance = new BankingProductFactory();
    }
    return BankingProductFactory.instance;
  }

  private seedProducts() {
    const defaultProducts: BankingProductRecord[] = [
      {
        id: 'prod-ng-basic-01',
        productCode: 'KORIE_WALLET_NGN_BASIC',
        name: 'KoriePay Personal Digital Wallet (NGN)',
        description: 'Standard consumer digital stored-value wallet with Providus NIP interbank connectivity.',
        productType: 'CONSUMER_WALLET',
        customerType: 'PERSONAL',
        jurisdiction: 'NG',
        currency: 'NGN',
        status: 'ACTIVE',
        version: 1,
        effectiveFrom: '2026-01-01T00:00:00Z',
        minKycTier: 'TIER_1',
        maxRiskScore: 75.0,
        allowedChannels: ['NIP', 'VIRTUAL_ACCOUNT', 'CARD', 'USSD'],
        glAssetPoolCode: '1010', // Providus Settlement Pool
        glLiabilityWalletCode: '2010', // Customer Stored-Value Wallets NGN
        glFeeRevenueCode: '4010', // Fee Revenue
        singleTransactionLimit: 50000,
        dailyTransactionLimit: 300000,
        maxBalanceCap: 300000,
        createdBy: 'product.lead@koriepay.ng',
        approvedBy: 'chief.commercial.officer@koriepay.com',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'prod-ng-premium-01',
        productCode: 'KORIE_WALLET_NGN_TIER2',
        name: 'KoriePay Verified Premium Account (NGN)',
        description: 'Tier-2 BVN/NIN verified account supporting high velocity NIP outward & card checkouts.',
        productType: 'CONSUMER_WALLET',
        customerType: 'PREMIUM',
        jurisdiction: 'NG',
        currency: 'NGN',
        status: 'ACTIVE',
        version: 1,
        effectiveFrom: '2026-01-01T00:00:00Z',
        minKycTier: 'TIER_2',
        maxRiskScore: 60.0,
        allowedChannels: ['NIP', 'VIRTUAL_ACCOUNT', 'CARD', 'USSD'],
        glAssetPoolCode: '1010',
        glLiabilityWalletCode: '2010',
        glFeeRevenueCode: '4010',
        singleTransactionLimit: 200000,
        dailyTransactionLimit: 1000000,
        maxBalanceCap: 1500000,
        createdBy: 'product.lead@koriepay.ng',
        approvedBy: 'chief.commercial.officer@koriepay.com',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'prod-ne-sahel-01',
        productCode: 'KORIE_WALLET_XOF_STANDARD',
        name: 'KoriePay Sahel Digital Account (XOF)',
        description: 'BCEAO compliant CFA Franc stored-value account with Koris Bank Niger SA settlement pool.',
        productType: 'CONSUMER_WALLET',
        customerType: 'PERSONAL',
        jurisdiction: 'NE',
        currency: 'XOF',
        status: 'ACTIVE',
        version: 1,
        effectiveFrom: '2026-02-01T00:00:00Z',
        minKycTier: 'TIER_1',
        maxRiskScore: 70.0,
        allowedChannels: ['SAHEL_SWITCH', 'VIRTUAL_ACCOUNT'],
        glAssetPoolCode: '1020', // Koris Bank Operational Reserve XOF
        glLiabilityWalletCode: '2020', // Customer Stored-Value Wallets XOF
        glFeeRevenueCode: '4010',
        singleTransactionLimit: 100000,
        dailyTransactionLimit: 600000,
        maxBalanceCap: 600000,
        createdBy: 'product.lead@koriepay.ne',
        approvedBy: 'chief.commercial.officer@koriepay.com',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'prod-ng-agent-01',
        productCode: 'KORIE_AGENCY_FLOAT_NGN',
        name: 'KoriePay Agency Float Vault (NGN)',
        description: 'High-volume dedicated agency banking cash-in/cash-out operating pool with POS hardware binding.',
        productType: 'AGENCY_FLOAT',
        customerType: 'AGENT',
        jurisdiction: 'NG',
        currency: 'NGN',
        status: 'ACTIVE',
        version: 1,
        effectiveFrom: '2026-03-01T00:00:00Z',
        minKycTier: 'TIER_2',
        maxRiskScore: 50.0,
        allowedChannels: ['NIP', 'CARD', 'VIRTUAL_ACCOUNT'],
        glAssetPoolCode: '1010',
        glLiabilityWalletCode: '2010',
        glFeeRevenueCode: '4010',
        singleTransactionLimit: 500000,
        dailyTransactionLimit: 5000000,
        maxBalanceCap: 10000000,
        createdBy: 'agency.director@koriepay.ng',
        approvedBy: 'chief.commercial.officer@koriepay.com',
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'prod-ng-merch-01',
        productCode: 'KORIE_MERCHANT_SETTLEMENT_NGN',
        name: 'KoriePay Merchant Checkout & Settlement (NGN)',
        description: 'Corporate gateway settlement account with automated T+1 disbursement and rolling risk reserves.',
        productType: 'MERCHANT_SETTLEMENT',
        customerType: 'MERCHANT',
        jurisdiction: 'NG',
        currency: 'NGN',
        status: 'ACTIVE',
        version: 1,
        effectiveFrom: '2026-03-15T00:00:00Z',
        minKycTier: 'TIER_3',
        maxRiskScore: 45.0,
        allowedChannels: ['CARD', 'VIRTUAL_ACCOUNT', 'NIP'],
        glAssetPoolCode: '1010',
        glLiabilityWalletCode: '2100', // Merchant Undisbursed Settlements NGN
        glFeeRevenueCode: '4020', // Merchant MDR Revenue
        singleTransactionLimit: 2000000,
        dailyTransactionLimit: 25000000,
        maxBalanceCap: 50000000,
        createdBy: 'merchant.lead@koriepay.ng',
        approvedBy: 'chief.commercial.officer@koriepay.com',
        createdAt: '2026-03-15T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    defaultProducts.forEach((p) => this.products.set(p.productCode, p));
  }

  public getProducts(filters?: { jurisdiction?: string; status?: string; type?: string }): BankingProductRecord[] {
    let list = Array.from(this.products.values());
    if (filters?.jurisdiction && filters.jurisdiction !== 'GLOBAL') {
      list = list.filter((p) => p.jurisdiction === filters.jurisdiction || p.jurisdiction === 'CROSS_BORDER');
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((p) => p.status === filters.status);
    }
    if (filters?.type && filters.type !== 'ALL') {
      list = list.filter((p) => p.productType === filters.type);
    }
    return list;
  }

  public getProduct(productCodeOrId: string): BankingProductRecord | undefined {
    return (
      this.products.get(productCodeOrId) ||
      Array.from(this.products.values()).find((p) => p.id === productCodeOrId)
    );
  }

  public createProduct(data: Omit<BankingProductRecord, 'id' | 'version' | 'status' | 'createdAt' | 'updatedAt'>): BankingProductRecord {
    const id = `prod-${data.jurisdiction.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const product: BankingProductRecord = {
      ...data,
      id,
      version: 1,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.products.set(product.productCode, product);
    return product;
  }

  public updateProductStatus(productCode: string, status: ProductStatus, actorEmail: string): { success: boolean; product?: BankingProductRecord; error?: string } {
    const product = this.products.get(productCode);
    if (!product) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }

    product.status = status;
    if (status === 'APPROVED' || status === 'ACTIVE') {
      product.approvedBy = actorEmail;
    }
    product.updatedAt = new Date().toISOString();
    this.products.set(productCode, product);

    return { success: true, product };
  }

  public triggerEmergencyKillSwitch(productCode: string, action: 'SUSPEND' | 'DISABLE_TRANSFERS', reason: string): { success: boolean; product?: BankingProductRecord; error?: string } {
    const product = this.products.get(productCode);
    if (!product) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }

    if (action === 'SUSPEND') {
      product.status = 'SUSPENDED';
    } else if (action === 'DISABLE_TRANSFERS') {
      product.allowedChannels = product.allowedChannels.filter((c) => c !== 'NIP' && c !== 'SAHEL_SWITCH');
    }
    product.updatedAt = new Date().toISOString();
    this.products.set(productCode, product);

    return { success: true, product };
  }
}
