# Physical Cash Truth Layer & Operational Cash Architecture

## 1. Five Distinct Financial and Operational Truths
KoriePay establishes a strict non-collapsing separation across five independent truth planes:

```
+---------------------------------------------------------------------------------------------------+
|                                 KORIEPAY PHYSICAL CASH ARCHITECTURE                               |
+---------------------------------------------------------------------------------------------------+
|  [1. PHYSICAL CASH TRUTH]      Actual physical banknotes held in Agent Till, Branch Vault,        |
|                                Cash Safe, CIT Bag, or Bank Cash Room.                             |
|                                                                                                   |
|  [2. OPERATIONAL CASH TRUTH]   Expected physical cash based on authorized cash movements,         |
|                                reservations, dispatches, and replenishment orders.                |
|                                                                                                   |
|  [3. FINANCIAL LEDGER TRUTH]   Authoritative double-entry general ledger journal lines in         |
|                                balanced debit/credit assets and liabilities.                      |
|                                                                                                   |
|  [4. SETTLEMENT TRUTH]         External confirmations from Providus Bank, Coris Bank, NIP,        |
|                                BCEAO SIP, or CIT couriers.                                        |
|                                                                                                   |
|  [5. TREASURY LIQUIDITY TRUTH] Available, restricted, reserved, committed, and forecast funds      |
|                                for enterprise solvency and capital buffers.                       |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Inviolable Architectural Principles
1. **Never Treat Digital Balance as Proof of Physical Cash**: A ledger account balance or wallet float is an economic liability/asset; it is never proof that banknotes are physically present in an agent's drawer or branch vault.
2. **Physical Counts Never Mutate Ledger Balances Directly**: Submitting a physical cash count or till tally records operational evidence; any financial adjustment must pass through the double-entry `DoubleEntryLedgerEngine` via approved compensating journals.
3. **Physical Cash Position Formula**:
   $$\text{Expected Physical Cash} = \text{Opening Cash} + \text{Cash Received} + \text{Transfers In} + \text{Deposits Received} - \text{Cash Paid Out} - \text{Transfers Out} - \text{Bank Deposits} - \text{CIT Collections} \pm \text{Approved Adjustments}$$
   $$\text{Cash Variance} = \text{Actual Counted Cash} - \text{Expected Physical Cash}$$
   - If $\text{Variance} < 0 \implies \text{SHORTAGE}$
   - If $\text{Variance} > 0 \implies \text{OVERAGE}$
   - If $\text{Variance} = 0 \implies \text{NO\_VARIANCE / MATCHED}$

---

## 3. Ownership vs. Custody
- **Economic Ownership**: The legal entity (e.g., KoriePay Nigeria Ltd or KoriePay Niger SA) that owns the asset.
- **Physical Custody**: The person, carrier, or device currently in physical possession of the banknotes (e.g., CIT Armed Courier, Vault Custodian, Agent Cashier).
- Custody handovers create immutable audit events without changing economic ownership.
