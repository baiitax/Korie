# Banking Product Factory & Proposition Engine

## 1. Configurable Product Specification
The Banking Product Factory enables the creation and launch of new financial products without modifying core ledger or switch code:

```typescript
export interface BankingProduct {
  productId: string;
  productCode: string;
  name: string;
  description: string;
  productType: 'CONSUMER_WALLET' | 'SAVINGS' | 'CURRENT' | 'MERCHANT_SETTLEMENT' | 'AGENCY_FLOAT' | 'BDC_TREASURY';
  customerType: 'PERSONAL' | 'BUSINESS' | 'AGENT' | 'MERCHANT' | 'BDC' | 'AGGREGATOR';
  jurisdiction: 'NG' | 'NE' | 'CROSS_BORDER';
  currency: 'NGN' | 'XOF' | 'USD';
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'DEPRECATED' | 'RETIRED';
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  eligibilityRules: ProductEligibilityRule[];
  ledgerMapping: ProductLedgerMapping;
  feeSchedules: ProductFeeSchedule[];
  limits: ProductLimitProfile;
}
```

---

## 2. Product-to-Ledger Mapping
Every product defines deterministic double-entry accounting rules:
- **Consumer Wallet NGN**: Dr `Customer Wallet (2010)` / Cr `Operational Pool (1010)`
- **Agency Float NGN**: Dr `Agent Float (2010)` / Cr `Providus Settlement (1010)`
- **Sahel XOF Current Account**: Dr `Customer Wallet (2020)` / Cr `Koris Settlement (1020)`
- **Merchant Checkout MDR**: Dr `Merchant Undisbursed (2100)` / Cr `MDR Fee Revenue (4020)`
