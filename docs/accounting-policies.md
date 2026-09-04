# Accounting Policies & Revenue Recognition

## 1. Revenue Recognition Policy (IFRS 15 Compliant)
- **Transaction Processing Fees**: Recognized at the exact timestamp of successful payment execution.
- **FX Remittance Margin**: Recognized instantaneously upon completion of currency conversion between NGN and XOF books.
- **Monthly SaaS / API Platform Fees**: Recognized pro-rata on an accrual basis across the billing cycle.

---

## 2. Reversal & Refund Rules
- **Full Refunds**: Original fee revenue is debited, merchant payable is credited, and customer wallet is refunded.
- **Partial Refunds**: Only the proportional fraction of fee and transaction volume is reversed. Total cumulative refunds can never exceed the initial net settled principal.
- **Chargebacks & Disputes**: Disputed funds are locked in `7010 (Operational Suspense)` until arbitration concludes.
