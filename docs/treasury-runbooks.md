# Treasury Operational Runbooks & Emergency Liquidity Playbooks

## 1. Liquidity Buffer Breach Runbook
When Available Liquidity drops below the $150\%$ target safety buffer:
1. **Intraday Sweeps**: Trigger automated Nostro sweep from secondary collection accounts.
2. **Wholesale Credit Drawdown**: Submit funding deal ticket against Providus / Coris revolving credit facility.
3. **Payout Throttling**: Switch non-essential batch settlement windows from $T+0$ to $T+1$.

---

## 2. Settlement Rail Disruption Runbook
When a primary clearing rail (e.g. NIP / Providus API) experiences latency $> 30\text{ minutes}$:
1. **Quarantine Outbound Batches**: Flag affected settlements as `PENDING_SETTLEMENT` to prevent double-debiting.
2. **Activate Backup Rail**: Route critical customer disbursements through secondary commercial bank node.
3. **Notify Executive Committee**: Dispatch real-time treasury telemetry alert to CFO and CRO.
