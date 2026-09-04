# KoriePay Language System

## 1. Supported languages

- **English** (`en`)
- **Hausa** (`ha`)
- **Français** (`fr`)

## 2. Architecture

A single global language engine drives all user-facing chrome:

```
LanguageProvider
   └─ Language Context (language, setLanguage, t)
        └─ translate(lang, key, params)   ← from src/locales
             ├─ en.ts
             ├─ ha.ts
             └─ fr.ts
```

- **Provider:** `src/components/ui/LanguageContext.tsx`
- **Switcher:** `src/components/ui/LanguageSwitcher.tsx`
- **Dictionaries:** `src/locales/{en,ha,fr}.ts` (+ portal namespaces under
  `src/locales/{agency,aggregator,compliance,developer,merchant,support}/`)

The switcher is a single reusable component placed by each shell where it
matters — never duplicated per portal with divergent behaviour.

## 3. Placement

- **Public navbar:** desktop + mobile (top-right action area).
- **Auth shell:** header control group.
- **Portals:** each header already provides EN/HA/FR controls wired to the
  portal's own locale namespace (kept intact to avoid regressions).

## 4. Persistence

Priority order:

1. Authenticated user preference (where a profile system exists)
2. Existing session preference
3. `localStorage` (`koriepay_lang`)
4. Browser language (en/ha/fr detection)
5. English default

`<html lang>` is kept in sync so screen readers announce the correct language.

## 5. String hygiene

User-facing strings must go through `t("namespace.key")` and never be hardcoded.
New chrome labels live in a `public` namespace (added to `en`, `ha`, `fr` with
parity). `translate()` falls back to English when a key is missing, so a newly
added key never renders an empty string.

## 6. Quality control

- Validate key parity across `en/ha/fr` in CI/lint.
- `translate()` handles `{{param}}` interpolation and English fallback.
- Existing portal dictionaries already maintain EN/HA/FR parity.
