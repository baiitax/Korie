# Support Data Security & Privacy Architecture

## Data Minimization & Privacy Protection
Support staff interact with high volumes of sensitive financial information. The platform enforces strict data masking protocols across all user interfaces:
- **Phone Numbers**: Displayed with middle 3 digits masked (e.g., `+234 803 *** 4567`).
- **Email Addresses**: Displayed with character obfuscation (e.g., `i.d*****@kanotrades.com`).
- **NIN / BVN**: Only last 3 digits exposed (e.g., `2938******492`).
- **Zero-Credential Exposure**: Passwords, transaction PINs, OTP codes, card CVVs, and API private keys are **NEVER** displayed, logged, or queryable in the support console.

## Anti-IDOR & Server-Side Verification
Every ticket, customer context, and transaction investigation lookup validates that the authenticated support officer has active jurisdictional clearance and role entitlement before data payload dispatch.
