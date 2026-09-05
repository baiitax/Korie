// Tier-1 Multi-Currency Account Lifecycle & Core Ledger Subledger Linkage

import {
  CustomerAccountRecord,
  AccountLifecycleStatus,
  AccountRestrictionType,
} from '@/types/customerProductFactory';
import { SubledgerEngine } from '../financial/SubledgerEngine';
import { BankingProductFactory } from '../products/BankingProductFactory';

export class AccountLifecycleEngine {
  private static instance: AccountLifecycleEngine;

  private accounts: Map<string, CustomerAccountRecord> = new Map();

  private constructor() {
    this.seedAccounts();
  }

  public static getInstance(): AccountLifecycleEngine {
    if (!AccountLifecycleEngine.instance) {
      AccountLifecycleEngine.instance = new AccountLifecycleEngine();
    }
    return AccountLifecycleEngine.instance;
  }

  private seedAccounts() {
    const defaultAccounts: CustomerAccountRecord[] = [
      {
        id: 'acc-ng-01',
        accountNumber: '0123456789',
        accountName: 'Ibrahim Bello NGN',
        customerId: 'cust-ng-001-ibrahim',
        productId: 'prod-ng-premium-01',
        productCode: 'KORIE_WALLET_NGN_TIER2',
        currency: 'NGN',
        country: 'NG',
        status: 'OPEN',
        assignedBankName: 'Providus Bank Nigeria',
        assignedBankCode: '058',
        isPrimary: false,
        availableBalance: 1250000.0,
        ledgerBalance: 1250000.0,
        heldBalance: 0.0,
        openedAt: '2026-08-01T08:30:00Z',
        createdAt: '2026-08-01T08:30:00Z',
        updatedAt: '2026-09-03T12:00:00Z',
      },
      {
        // Same premium Nigerian customer holds a separate cross-border XOF
        // wallet (second currency, first-class) — the product supports
        // multi-currency portfolios per customer. Balance is the authoritative
        // subledger value (Synced in getAccounts).
        id: 'acc-ng-02',
        accountNumber: 'NE5400240100987654321',
        accountName: 'Ibrahim Bello XOF',
        customerId: 'cust-ng-001-ibrahim',
        productId: 'prod-ne-sahel-01',
        productCode: 'KORIE_WALLET_XOF_STANDARD',
        currency: 'XOF',
        country: 'NE',
        status: 'OPEN',
        assignedBankName: 'Coris Bank Niger SA',
        assignedBankCode: 'NE024',
        isPrimary: true,
        availableBalance: 1850000.0,
        ledgerBalance: 1850000.0,
        heldBalance: 0.0,
        openedAt: '2026-08-05T10:30:00Z',
        createdAt: '2026-08-05T10:30:00Z',
        updatedAt: '2026-09-03T11:30:00Z',
      },
      {
        id: 'acc-ne-01',
        accountNumber: 'NE5400240100123456789012',
        accountName: 'Amara Diallo Sahel XOF',
        customerId: 'cust-ne-001-amara',
        productId: 'prod-ne-sahel-01',
        productCode: 'KORIE_WALLET_XOF_STANDARD',
        currency: 'XOF',
        country: 'NE',
        status: 'OPEN',
        assignedBankName: 'Coris Bank Niger SA',
        assignedBankCode: 'NE024',
        isPrimary: true,
        availableBalance: 450000.0,
        ledgerBalance: 450000.0,
        heldBalance: 0.0,
        openedAt: '2026-08-05T10:30:00Z',
        createdAt: '2026-08-05T10:30:00Z',
        updatedAt: '2026-09-03T11:30:00Z',
      },
    ];

    defaultAccounts.forEach((a) => this.accounts.set(a.id, a));
  }

  public getAccounts(customerId?: string): CustomerAccountRecord[] {
    const subledgerEngine = SubledgerEngine.getInstance();
    let list = Array.from(this.accounts.values());
    if (customerId) {
      list = list.filter((a) => a.customerId === customerId);
    }

    // Synchronize balance truth from General Ledger Subledger
    return list.map((acc) => {
      const subledger = subledgerEngine.getSubledger('CUSTOMER_WALLET', acc.customerId, acc.currency);
      if (subledger) {
        acc.availableBalance = subledger.availableBalance;
        acc.ledgerBalance = subledger.currentBalance;
        acc.heldBalance = subledger.heldBalance;
      }
      return acc;
    });
  }

  public getAccount(idOrNumber: string): CustomerAccountRecord | undefined {
    const acc =
      this.accounts.get(idOrNumber) ||
      Array.from(this.accounts.values()).find((a) => a.accountNumber === idOrNumber);

    if (acc) {
      const subledger = SubledgerEngine.getInstance().getSubledger('CUSTOMER_WALLET', acc.customerId, acc.currency);
      if (subledger) {
        acc.availableBalance = subledger.availableBalance;
        acc.ledgerBalance = subledger.currentBalance;
        acc.heldBalance = subledger.heldBalance;
      }
    }
    return acc;
  }

  public openAccount(params: {
    customerId: string;
    productCode: string;
    accountName: string;
    country: 'NG' | 'NE';
    currency: 'NGN' | 'XOF' | 'USD';
  }): { success: boolean; account?: CustomerAccountRecord; error?: string } {
    const productFactory = BankingProductFactory.getInstance();
    const product = productFactory.getProduct(params.productCode);

    if (!product) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }
    if (product.status !== 'ACTIVE') {
      return { success: false, error: 'PRODUCT_INACTIVE' };
    }

    const id = `acc-${params.country.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const accountNumber =
      params.country === 'NG'
        ? `0${Math.floor(Math.random() * 900000000 + 100000000)}`
        : `NE5400240100${Math.floor(Math.random() * 900000000000 + 100000000000)}`;

    const newAcc: CustomerAccountRecord = {
      id,
      accountNumber,
      accountName: params.accountName,
      customerId: params.customerId,
      productId: product.id,
      productCode: product.productCode,
      currency: params.currency,
      country: params.country,
      status: 'OPEN',
      assignedBankName: params.country === 'NG' ? 'Providus Bank' : 'Coris Bank Niger SA',
      assignedBankCode: params.country === 'NG' ? '058' : 'NE024',
      isPrimary: false,
      availableBalance: 0,
      ledgerBalance: 0,
      heldBalance: 0,
      openedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Auto-provision Subledger in GL Engine
    SubledgerEngine.getInstance().mutateBalance({
      subledgerType: 'CUSTOMER_WALLET',
      entityId: params.customerId,
      accountCode: params.currency === 'NGN' ? '2010' : '2020',
      currency: params.currency,
      country: params.country,
      deltaAmount: 0,
    });

    this.accounts.set(id, newAcc);
    return { success: true, account: newAcc };
  }

  public applyRestriction(accountId: string, restriction: AccountRestrictionType, reason: string): { success: boolean; account?: CustomerAccountRecord; error?: string } {
    const account = this.accounts.get(accountId);
    if (!account) {
      return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    }

    account.restrictions = account.restrictions || [];
    if (!account.restrictions.includes(restriction)) {
      account.restrictions.push(restriction);
    }
    if (restriction === 'FULL_FREEZE') {
      account.status = 'FROZEN';
    } else {
      account.status = 'RESTRICTED';
    }
    account.updatedAt = new Date().toISOString();
    this.accounts.set(accountId, account);

    return { success: true, account };
  }

  public liftRestriction(accountId: string, restriction: AccountRestrictionType): { success: boolean; account?: CustomerAccountRecord; error?: string } {
    const account = this.accounts.get(accountId);
    if (!account) {
      return { success: false, error: 'ACCOUNT_NOT_FOUND' };
    }

    account.restrictions = (account.restrictions || []).filter((r) => r !== restriction);
    if (account.restrictions.length === 0) {
      account.status = 'OPEN';
    }
    account.updatedAt = new Date().toISOString();
    this.accounts.set(accountId, account);

    return { success: true, account };
  }
}
