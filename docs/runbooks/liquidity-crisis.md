# Operational Runbook: Cash & Float Liquidity Crisis Response

## 1. Liquidity Crisis Triggers
- Agent physical cash or electronic float drops below $30\%$ of statutory buffer.
- Regional branch vault faces depletion due to unexpected cash-out surge.
- Settlement bank rail timeout prevents digital float replenishment.

---

## 2. Emergency Remediation Protocols
1. **Dynamic Channel Throttling**: The Channel Authorization Engine temporarily reduces single-transaction cash-out limits to preserve liquidity.
2. **Emergency Vault Rebalancing**: Treasury initiates an expedited Vault-to-Branch CIT transfer from the nearest regional hub.
3. **Emergency Bank Vault Withdrawal**: Dual-authorized cash withdrawal instruction dispatched to Providus Bank (Nigeria) or Coris Bank (Niger).
4. **Peer Agent Liquidity Sharing**: Nearby Super-Agents with excess cash are allocated float incentives to support cash-out demand.
