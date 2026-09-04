# Treasury Remediation Backlog

## Remediation Roadmap

- **TRY-01 (P0 - Implemented)**: Build Core `TreasuryEngine.ts` strictly calculating Available Liquidity ($Gross - Restricted - Committed - Reserves$).
- **TRY-02 (P0 - Implemented)**: Implement `TreasuryFundingEngine.ts` with Maker-Checker dual authorization and idempotency.
- **TRY-03 (P1 - Implemented)**: Build `LiquidityForecastingEngine.ts` supporting NOW, Intraday, TODAY, 7D, 30D, and 90D buckets.
- **TRY-04 (P1 - Implemented)**: Implement `LiquidityStressTestEngine.ts` with interactive scenario simulations (volume surge, provider delay, FX shock).
- **TRY-05 (P1 - Implemented)**: Build `FxPositionEngine.ts` with isolated NGN and XOF positions and real-time exposure analytics.
- **TRY-06 (P2 - Implemented)**: Create REST API endpoints under `/api/core/v1/treasury/` for positions, liquidity, forecasts, fundings, and stress tests.
- **TRY-07 (P2 - Implemented)**: Build high-density Admin Treasury & Liquidity Command Center at `/admin/treasury`.
