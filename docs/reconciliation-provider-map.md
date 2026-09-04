# KoriePay Reconciliation & Settlement Engine — Banking Provider Map

## 1. Primary Banking & Provider Nodes

### Node 1: Providus Bank Nigeria (`PROVIDUS_NG`)
- **Jurisdiction**: Nigeria 🇳🇬 (NGN)
- **Settlement Account Node**: Chart of Accounts `1010` (Providus Settlement Pool NGN)
- **Primary Rails**:
  - Inbound: Dynamic NUBAN Virtual Account Collections
  - Outbound: NIP Direct Funds Transfer Switch
- **Statement Protocol**: Daily MT940 statement via SFTP and real-time transaction query API.
- **Settlement Windows**: Intra-day T+0 and Batch T+1 at 06:00 UTC.

### Node 2: Koris Bank Niger Republic (`KORIS_NE`)
- **Jurisdiction**: Niger Republic 🇳🇪 (XOF)
- **Settlement Account Node**: Chart of Accounts `1020` (Koris Settlement Pool XOF)
- **Primary Rails**:
  - Inbound: WAEMU Regional Interbank Direct Inflows
  - Outbound: WAEMU Interbank Settlement Protocol
- **Statement Protocol**: Daily EOD CSV statement import and manual BDC clearance feed.
- **Settlement Windows**: Daily T+1 at 14:00 West Africa Time.

### Node 3: Aggregator Cards & Digital Gateways (`AGGREGATOR_GATEWAY`)
- **Jurisdiction**: Multi-region (NGN, USD, XOF)
- **Clearing Account Node**: Chart of Accounts `1210` (Provider Receivables)
- **Primary Rails**: Local/International Cards (Mastercard, Visa, Verve), QR Checkout.
- **Settlement Frequency**: T+1 rolling net settlement with 5% risk reserve withholding.

## 2. Real Integration Boundary Rules
- If provider API credentials or SFTP connections are unverified, the engine returns `NOT_CONFIGURED` or `PENDING_PROVIDER_SETUP`.
- The system never simulates or fabricates successful external settlements without cryptographic proof or validated statement lines.
