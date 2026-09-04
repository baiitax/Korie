# Provider Adapter Architecture & Banking Interfaces

## 1. Unified Provider Adapter Interface
All external financial integrations implement the strict TypeScript interface:

```typescript
export interface PaymentProviderAdapter {
  providerCode: string;
  providerName: string;
  countryCode: 'NG' | 'NE' | 'CROSS_BORDER';
  supportedCurrencies: ('NGN' | 'XOF' | 'USD')[];
  getCapabilities(): ProviderCapabilities;
  healthCheck(): Promise<ProviderHealthMetrics>;
  executeTransfer(request: OutwardTransferRequest): Promise<ProviderExecutionResult>;
  queryTransactionStatus(providerReference: string): Promise<ProviderExecutionResult>;
  verifyWebhookSignature(payloadRaw: string, signature: string): boolean;
  parseWebhookEvent(payloadRaw: string): NormalizedWebhookEvent;
}
```

---

## 2. Integrated Banking Nodes
1. **`ProvidusBankNgAdapter`**:
   - Implements REST/JSON protocol with mutual TLS (mTLS) and dynamic HMAC request signing.
   - Handles NIP outward single credit transfers, dynamic virtual account allocations, and statement fetching.
2. **`KorisBankNeAdapter`**:
   - Implements UEMOA regional interbank protocol for BCEAO clearing rails in Niger Republic.
   - Handles West African CFA franc (XOF) direct credits and agent cash-in floats.
3. **`InterswitchCardAdapter`**:
   - Handles 3D-Secure 2.2 card tokenization, WebPAY redirects, and real-time webhook callbacks.
