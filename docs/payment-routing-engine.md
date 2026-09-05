# Payment Routing Engine & Provider Selection

## 1. Dynamic Routing Policy Matrix
The Routing Engine evaluates multi-dimensional attributes to select the optimal provider:
1. **Jurisdiction & Country**: `NG` (Nigeria) vs. `NE` (Niger Republic) vs. `CROSS_BORDER`.
2. **Currency**: `NGN`, `XOF`, `USD`.
3. **Channel / Transaction Type**: `NIP_OUTWARD`, `VIRTUAL_ACCOUNT_INWARD`, `CARD_CHECKOUT`, `AGENCY_CASH_OUT`, `FX_SWAP`.
4. **Provider Health & Circuit Breaker**: Only nodes in `CLOSED` state with latency $< 2000\text{ms}$.
5. **Cost / MDR Efficiency**: Weighted fee optimization without compromising operational SLAs.
6. **Provider Limits & Float Availability**: Asserts that target provider has sufficient working float in the Treasury Engine.

---

## 2. Production Routing Catalog

| Country | Transaction Type | Primary Provider Node | Secondary Fallback Node | Weighting Strategy |
|---|---|---|---|---|
| **Nigeria 🇳🇬** | Instant Bank Transfer (NIP) | Providus Bank Nigeria (`058`) | NIBSS Direct NIP Switch | 80% Primary / 20% Health Probe |
| **Nigeria 🇳🇬** | Virtual Account Collections | Providus Virtual Accounts | Interswitch Collections | 90% Primary / 10% Failover |
| **Nigeria 🇳🇬** | Card Processing (MDR) | Interswitch Payment Gateway | Paystack Direct | Least-Cost + Success Rate |
| **Niger Republic 🇳🇪** | Interbank Transfer (Sahel) | Coris Bank Niger SA | GIM-UEMOA Direct Switch | Active-Passive Failover |
| **Cross-Border** | NGN ➔ XOF Corridor | KoriePay Bilateral FX Bridge | Koris SA Treasury Desk | Guaranteed Quote Execution |

---

## 3. Fallover Safety & Re-Attempt Constraints
- **Unknown Timeout**: If Provider A times out, **failover is prohibited** until a status query or webhook proves that Provider A did not debit funds.
- **Definitive Failure**: Only when Provider A returns a terminal rejection (`INVALID_ACCOUNT`, `INSUFFICIENT_FUNDS_AT_SWITCH`) is automatic route failover permitted.
