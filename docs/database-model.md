# Database Architecture & Entity Relationships

## 1. Schema Relationships
```
[customers] ──< [customer_accounts] ──< [banking_products]
    │                   │                        │
    ├──< [devices]      ├──< [account_restrictions]├──< [product_versions]
    ├──< [beneficiaries]└──< [gl_subledgers]     ├──< [product_fee_rules]
    └──< [complaints]                            └──< [product_ledger_mappings]
```

## 2. Invariants Enforced
- **Currency Homogeneity**: Account currency strictly matches product currency.
- **Ledger Linkage**: Accounts link to `gl_subledgers` for balance truth.
- **Immutable Product Versions**: Active product versions cannot be overwritten.
- **Audit Logging**: Every state transition produces an immutable log.
