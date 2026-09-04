# KYC / KYB Verification Lifecycle & Workflow

## 1. Multi-Stage Verification Pipeline

```
                              [START ONBOARDING]
                                      │
                                      ▼
                           [1] Personal/Business Data
                                      │
                                      ▼
                           [2] Document Upload & Hash
                               (MIME & SHA-256 Check)
                                      │
                                      ▼
                      [3] Direct Registry & Biometric Call
                         (NIMC / BVN / CAC / NINA / RCCM)
                                      │
                                      ▼
                         [4] AML & Sanctions Screening
                            (PEP / Watchlist Check)
                                      │
                                      ▼
                       [5] Risk Scoring & Classification
                                      │
                  ┌───────────────────┴───────────────────┐
                  ▼                                       ▼
          [Auto-Approved]                        [Maker-Checker Queue]
      (Confidence >= 90 & Clean)               (Low Match / High Value)
                  │                                       │
                  │                                       ▼
                  │                               [Checker Approval]
                  │                                       │
                  └───────────────────┬───────────────────┘
                                      │
                                      ▼
                          [6] Tier Assignment & Limits
                            (Tier 0, 1, 2, or 3 Limits)
                                      │
                                      ▼
                         [7] Continuous Re-KYC Watch
                           (Periodic / Expiry Trigger)
```

---

## 2. Onboarding Tier Matrix

| KYC Tier | Requirements | Nigeria Daily Limit | Niger Republic Daily Limit | Allowed Products |
|---|---|---|---|---|
| **Tier 0** | Phone & Email Verified | ₦50,000 | 50,000 XOF | Basic bill payments, intra-wallet transfers |
| **Tier 1** | Verified National Identity (NIN/NINA) + Selfie | ₦300,000 | 300,000 XOF | Outward bank transfers, virtual accounts |
| **Tier 2** | Verified BVN / Biometric Liveness + Proof of Address | ₦5,000,000 | 5,000,000 XOF | Agent cash-out, cross-border remittance |
| **Tier 3 / KYB**| Corporate CAC/RCCM Filing + Beneficial Owners (>25%) + Bank Reference | ₦50,000,000+ | 50,000,000+ XOF | Merchant acquiring, bulk disbursement, BDC operations |

---

## 3. Re-KYC Triggers & Expiry Management
Re-verification is automatically required upon:
1. **Document Expiration**: 30 days prior to passport or driver's license expiration.
2. **Major Profile Changes**: Modification of legal name, nationality, or primary identity number.
3. **High-Risk Threshold**: Entity risk score exceeding 75 in the Fraud/Risk engine.
4. **Corporate Restructuring**: Addition of new directors or change in beneficial ownership $> 25\%$.
5. **Periodic Review**: 12 months for high-risk entities; 24 months for standard entities.
