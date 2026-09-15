# FX Treasury, Cross-Border Exposure & Corridor Hedging

## 1. Multi-Currency Net Open Position (NOP)
Treasury monitors real-time foreign exchange exposures across the primary regional corridors:
- **Corridors**: `NGN/XOF` (Nigeria - Niger bilateral trade), `USD/NGN`, `EUR/XOF`.
- **Metrics**: Net Open Position, Average Acquisition Rate, Real-Time Reference Rate, Unrealized Marked-to-Market P&L, Realized Month-to-Date FX Earnings.

---

## 2. FX Shock Sensitivity Testing
Simulates foreign exchange currency shocks ($\pm 1\%$, $\pm 5\%$, $\pm 10\%$, $\pm 15\%$) and assesses the direct impact on:
1. P&L Translation Gains/Losses.
2. Cross-Border Settlement Clearing Liquidity.
3. Sovereign Regulatory Capital Ratios.

---

## 9. Reference-Rate Administration (implemented)

Implemented in migration `20260914000053_fx_rate_admin.sql` (see also
`docs/reconciliation-and-suspense-policy.md` for the control pattern):

- **Sanctioned path:** `update_fx_rate_pair(source, destination, rate, actor, rate_source, notes)` — the only supported way to re-rate. It sets the forward rate and **auto-derives the reverse as 1/rate**, so pairs are reciprocal by construction and no unbooked spread can be introduced through the rate table (assessment F18).
- **Provenance:** every change requires a `rate_source` (e.g. `CBN-DAILY-2026-09-14`, `BCCEAU-DAILY`, `DESK-MANUAL-YYYY-MM-DD`) — "no rate source" was an explicit finding.
- **Attribution & history:** the `fx_rates` governance trigger refuses unattributed changes and snapshots every rate change into `fx_rate_history` (old → new, actor, timestamp); the RPC additionally writes a central `audit_events` row (`FX_RATE_UPDATE`).
- **Reciprocity constraint:** a DEFERRABLE constraint trigger validates the pair's final state at commit (product within 1% of parity) — the same deferred-integrity pattern the ledger uses, which is what makes a two-row pair re-rate atomic.
- **Console surface:** Finance → Foreign Exchange Desk (`/admin/fx`) — governed rate editor with reverse-rate preview, rate-source requirement, and the full rate-change history table.

A deliberate spread between the administered forward and reverse rates is **not** supported: an intentional spread is FX revenue and must only be introduced together with FX-REV/FX-P&L accounting (B7 part 2 — revaluation and FX P&L accounts, still open).
