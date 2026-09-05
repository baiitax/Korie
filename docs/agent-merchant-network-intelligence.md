# Agent, Merchant & Ecosystem Network Graph Intelligence

## 1. Agent & Merchant 360 Analytics

### Agent 360 Performance Dimensions:
- **Productivity**: Daily transaction volume, unique customer count, cash-in vs cash-out ratio.
- **Liquidity & Float Reliability**: Till balance variance, replenishment frequency, hours with zero cash buffer.
- **Compliance & Operational Risk**: Reversal frequency, customer complaints, suspicious structuring velocity.

### Merchant 360 Economics:
- **Commercial Gross Margins**: Gross merchant volume (GMV), net processing margins, settlement lag, dispute/chargeback ratio.

---

## 2. Network Graph Modeling

The KoriePay ecosystem is modeled as an analytical Directed Graph $G = (V, E)$:

```
           [Merchant / Corporate]
                     │
                     ▼ (Settles With)
[Customer] ────▶ [Agent Outlet] ────▶ [Providus / Coris Bank Node]
    │                 │
    ▼ (Shares Device) ▼ (Transfers Float)
[Customer B]     [Regional Vault]
```

### Graph Nodes ($V$):
`Customer`, `Account`, `Agent`, `Aggregator`, `Merchant`, `Terminal/POS`, `ProviderNode`, `BankBranch`, `Vault`.

### Graph Edges ($E$):
`transacts_with`, `owns`, `uses_device`, `belongs_to_aggregator`, `settles_with`, `shares_phone_or_ip`, `replenishes_cash`.

### Graph Analytical Capabilities:
1. **Collusive Agent Rings**: Detects clusters of agents repeatedly kiting float or sharing suspicious terminal hardware.
2. **Liquidity Chokepoints**: Maps regional cash dependencies across Nigeria and Niger Republic corridors.
3. **Provider Concentration**: Quantifies institutional exposure to single commercial bank clearing rails.
