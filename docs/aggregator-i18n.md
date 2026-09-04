# KORIEPAY AGGREGATOR INTERNATIONALIZATION (I18N)
## Trilingual Standardization: English (`en`), Hausa (`ha`), and French (`fr`)

---

## 1. Supported Locales & Currencies

| Code | Language | Primary Markets | Currency Format |
|---|---|---|---|
| `en` | English | Nigeria / International | `₦ 1,000.00` |
| `ha` | Hausa | Northern Nigeria & Niger Republic | `₦ 1,000.00` |
| `fr` | French | Niger Republic / BCEAO UEMOA | `1 000 CFA` |

---

## 2. Namespace Organization

Dictionaries are structured uniformly in `/src/locales/aggregator/`:
- `common`: Universal navigation, actions, status pills, and provider badges.
- `dashboard`: Command center metrics and summary headers.
- `agents`: Agent directory, float levels, and drawer cash fields.
- `merchants`: Merchant acquiring and category terms.
- `liquidity`: Float distribution and wallet management strings.
- `commissions`: Revenue sharing and yield descriptions.
