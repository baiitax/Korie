# Enterprise Liquidity Management, Buckets & Intraday Ladders

## 1. Multi-Tier Liquidity Classification (8 Buckets)
1. **Immediately Available**: Bank Nostro and Settlement clearing accounts usable on demand ($T+0$).
2. **Operationally Available**: Agent float and branch tills accessible with standard operational transfers.
3. **Restricted**: Regulatory statutory cash reserves and court/compliance lien holds.
4. **Reserved**: Funds pre-allocated for confirmed merchant settlements, payroll, and debt servicing.
5. **Pending Settlement**: Inbound NIP and card clearing receivables awaiting counterparty value date.
6. **In Transit**: Armored CIT shipments and cross-border SWIFT/WAEMU wire sweeps.
7. **Expected**: Heuristic forward forecasts based on historical transaction volumes.
8. **Contingent**: Undrawn credit lines and standby bank overdraft facilities.

$$\text{Available Liquidity} = \text{Gross Cash Assets} - \text{Restricted Funds} - \text{Reserved Obligations} - \text{Pending Float}$$

---

## 2. Intraday Liquidity Monitoring & Gap Ladders
Intraday cash flows are tracked across real-time intervals:
- `NOW` $\rightarrow$ `+30 MIN` $\rightarrow$ `+1 HOUR` $\rightarrow$ `+4 HOURS` $\rightarrow$ `+8 HOURS` $\rightarrow$ `+12 HOURS` $\rightarrow$ `+24 HOURS`.
- Automatically alerts treasury operators before intraday outflow spikes (such as evening merchant payouts) breach minimum operating buffers.
