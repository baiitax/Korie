# Security, Fraud Prevention & Abuse Controls in Financial Recovery

## 1. Refund Fraud Vectors & Safeguards
- **Double-Refund Attacks**: Blocked via strict transactional database locking and atomic calculation of remaining refundable allowance.
- **Unauthorized Destination Fraud**: Refunds are strictly locked to the original funding instrument/wallet. Directing refunds to third-party accounts is disallowed unless elevated compliance override is signed.
- **Collusive Dispute Claims**: Cross-correlated with the AML Network Graph engine to detect circular merchant-customer fraud rings.
