# KORIEPAY CUSTOMER BANKING PORTAL — INTERNATIONALIZATION (i18n)

## 1. Multi-Language System
KoriePay natively supports three sovereign languages across West Africa:
- 🇬🇧 **English (`en`)**: Clear Nigerian & International fintech terminology.
- 🇳🇬 **Hausa (`ha`)**: Natural, fluent northern Nigerian & Nigerien commercial vocabulary ("Kudinka, Hannunka", "Aika Kuɗi", "Karɓi Kuɗi", "Sanya Kuɗi", "Sauya Kuɗi").
- 🇳🇪 **Français (`fr`)**: Natural West African Francophone (UEMOA/Niger) financial terminology ("Votre argent. Votre langue. Votre contrôle.", "Envoyer", "Recevoir", "Payer des factures").

## 2. Dynamic Translation Architecture
- Zero hardcoded English strings in primary views.
- Fallback chain: `Selected Language` → `English` → `Key String`.
- Interpolation support for dynamic values (`{{amount}}`, `{{recipient}}`, `{{ticketNumber}}`).
- Persistent storage in `localStorage` (`koriepay_customer_lang`) with instant 1-tap header switching.
