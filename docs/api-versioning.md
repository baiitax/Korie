# KORIEPAY API VERSIONING & DEPRECATION POLICY

## 1. Versioning Scheme
KoriePay uses explicit path-based semantic versioning (e.g. `/v1/`, `/v2/`).

### Breaking vs Non-Breaking Changes
- **Non-Breaking** (Same Version): Adding new optional request fields, adding new response attributes, adding new webhook event types.
- **Breaking** (New Version Required): Removing fields, renaming fields, altering data types, changing HTTP status response codes.

---

## 2. Deprecation Lifecycle
1. **DRAFT / INTERNAL TESTING**: Private engineering builds.
2. **SANDBOX RELEASE**: Public testnet verification.
3. **PRODUCTION GA**: Active general availability.
4. **DEPRECATED**: Flagged with `Sunset` HTTP response headers and 180-day migration window.
5. **SUNSET**: Endpoint retired and returns HTTP 410 Gone.
