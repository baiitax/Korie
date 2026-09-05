# KORIEPAY BANKING PROVIDER ADAPTER & INTEGRATION ARCHITECTURE

## 1. Provider Adapter Topology
Business logic is decoupled from external bank APIs through dedicated adapter interfaces:

```
                            TransactionService
                                     │
                     +───────────────┴───────────────+
                     ▼                               ▼
          Providus Bank Adapter            Coris Bank Adapter
               (Nigeria)                    (Niger Republic)
                     │                               │
                     ▼                               ▼
            Providus NIP Switch             WAEMU RTGS Clearing
```

---

## 2. Integrated Banking Nodes

### 2.1 Providus Bank Nigeria Node (`PROVIDUS_NG`)
- **Capabilities**: Instant Outward NIP transfers to all 90+ Nigerian banks, Dynamic Virtual NUBAN generation, Inward credit webhooks.
- **Circuit Breaker Threshold**: 5 consecutive failures trips circuit to `OPEN`, routing requests to fallback reconciliation queues.

### 2.2 Coris Bank Niger Republic Node (`KORIS_NE`)
- **Capabilities**: WAEMU GIM-UEMOA RTGS settlement across Niger, Senegal, Côte d'Ivoire, Burkina Faso, Mali, Benin, Togo, and Guinea-Bissau.
- **Settlement SLA**: Sub-second bilateral liquidity confirmation.
