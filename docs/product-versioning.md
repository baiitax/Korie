# Product Versioning & Emergency Control Architecture

## 1. Immutable Versioning Policy
Active products cannot be modified destructively. When fees, limits, or regulatory mappings change:
1. A new version is created (e.g. `KORIE_WALLET_NGN_V2`).
2. The new version undergoes maker-checker validation and simulation.
3. Upon activation, new accounts enroll in `V2`, while existing accounts migrate seamlessly or continue under grandfathered terms.

---

## 2. Emergency Product Kill Switch
In the event of an upstream provider breach or systemic exploit, authorized operators can trigger:
- `SUSPEND_PRODUCT`: Halts all new enrollments and transactions.
- `DISABLE_TRANSFERS`: Blocks outward fund movements while keeping balances safe.
- `DISABLE_NEW_ENROLLMENTS`: Prevents new account creations while existing users transact normally.
