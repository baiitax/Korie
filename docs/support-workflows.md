# Support Workflows & Incident Resolution Lifecycle

## 1. Omnichannel Inbound Normalization
Inbound support tickets arrive via In-App Chat, Web Portal, WhatsApp, POS Agent Terminals, Merchant Dashboard, and automated system events. All requests are normalized into the unified `SupportTicket` contract.

## 2. Priority Classification Matrix
- **CRITICAL (SLA: 5m First Response / 30m Resolution)**: Core payment gateway outage, suspected security breach, or high-value merchant settlement stoppage.
- **URGENT (SLA: 15m First Response / 2h Resolution)**: Agent POS float depletion, ATM cash dispense failure with active cardholder on site.
- **HIGH (SLA: 30m First Response / 4h Resolution)**: Pending NIP transfers >₦100,000, uncredited virtual account top-ups.
- **NORMAL (SLA: 2h First Response / 24h Resolution)**: Tier-2 KYC upgrade inquiries, general balance questions.
- **LOW (SLA: 8h First Response / 72h Resolution)**: General feature inquiries and product feedback.

## 3. Incident Linking & Broadcast
When multiple tickets report the same underlying banking switch latency (e.g. Providus NIP or Coris Bank XOF), supervisors declare a Parent Incident. Frontline junior officers apply the approved incident notice with one click, eliminating duplicate investigation.
