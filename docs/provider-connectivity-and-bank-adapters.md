# Provider Connectivity Fabric & Bank Adapter Contracts

## 1. Standardized Provider Adapter Contract

All external banking rails, payment switches, and communication providers implement a uniform TypeScript/Go adapter contract:

```typescript
export interface IProviderAdapter {
  providerCode: string;
  country: 'NG' | 'NE' | 'GLOBAL';
  authenticate(): Promise<{ token: string; expiresAt: Date }>;
  createTransaction(payload: TransactionInstruction): Promise<ProviderExecutionResult>;
  queryTransaction(providerReference: string): Promise<ProviderStatusResult>;
  cancelTransaction(providerReference: string): Promise<boolean>;
  refundTransaction(providerReference: string, amount: number): Promise<ProviderRefundResult>;
  getBalance(): Promise<NostroBalanceSnapshot>;
  healthCheck(): Promise<{ isHealthy: boolean; latencyMs: number }>;
}
```

---

## 2. Bank Node Integration Boundaries

### A. Providus Bank Nigeria Adapter (`PROV-NG-01`)
- **Protocols**: RESTful HTTPS + mTLS, Webhook signature verification, ISO 8583 bridge.
- **Capabilities**: NIP (NIBSS Instant Payments) Outward/Inward, Dedicated Virtual Accounts, Nostro Pool Balance Query.
- **Failover Target**: Interswitch / Flutterwave secondary rail.

### B. Coris Bank Niger Republic Adapter (`KORIS-NE-01`)
- **Protocols**: ISO 20022 XML / JSON REST Gateway, BCEAO RTGS connectivity.
- **Capabilities**: XOF Electronic Money Float Management, WAEMU Cross-Border Clearing, Regional Cash Vault Balancing.
- **Failover Target**: Bilateral Clearing Node.
