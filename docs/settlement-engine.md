# Settlement Engine Architecture

## 1. Settlement Formula Invariant
Merchant and agent payouts strictly follow the immutable settlement formula:
$$\text{Net Payable} = \text{Gross Collections} - \text{MDR / Platform Fees} - \text{Statutory VAT} - \text{Rolling Risk Reserves}$$

## 2. Settlement Windows & Batch Schedules
- **T+0 (Instant / Same Day)**: Available for high-tier merchants with pre-funded liquidity collateral.
- **T+1 (Next Business Day 06:00 UTC)**: Standard settlement cycle for e-commerce and retail POS merchants.
- **T+2 (International / High Risk)**: Applies to foreign currency collections and cross-border remittance aggregators.

## 3. Payout Dispatch & Double-Entry Clearing
When a settlement batch is executed:
1. Double-entry journal entry is posted:
   - **Debit**: `2050` Merchant Payables NGN (Reduces platform liability)
   - **Credit**: `1010` Providus Settlement Pool NGN (Reduces bank cash asset)
2. Outbox settlement instruction is generated with Providus NIP payout payload.
3. Upon confirmation from the NIP switch, the batch status is updated to `SETTLED`.
