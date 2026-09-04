# KoriePay Theme System

## 1. Architecture

A single centralized theme engine drives day/night across the whole ecosystem.

```
ThemeProvider
   └─ Theme Context
        └─ Design Tokens (CSS custom properties)
             └─ Portal Shell
                  └─ Components
                       └─ Pages
```

- **Provider:** `src/components/ui/ThemeContext.tsx`
- **Toggle:** `src/components/ui/ThemeToggle.tsx`
- **Tokens:** `src/app/globals.css`

## 2. Modes

Two visible choices are exposed, matching professional terminology:

- ☀ **Day** (light chrome)
- 🌙 **Night** (dark chrome)

Internally the preference also respects the OS when unset.

## 3. Persistence (no flash)

The theme is written to `localStorage` (`koriepay_theme`) and a tiny inline
script in `<head>` applies the stored class **before hydration**, so there is no
flash of the wrong theme, no white flash before dark, and no hydration mismatch:

```html
d.documentElement.classList.remove("light","dark"); d.documentElement.classList.add(t);
```

The `<html>` node starts with `class="dark"` as a safe server default and uses
`suppressHydrationWarning` for the class swap.

## 4. Where day/night is applied

The **chrome** (public navbar, public footer, auth header, each portal header,
dropdowns, menus and the compact portal footers) is theme-aware via semantic
tokens. The dense financial content canvas (tables, cards) is intentionally kept
on the deep brand dark surface in both themes to preserve **clarity, contrast,
data density and trust** — a common, deliberate choice for Tier-1 fintech.

## 5. Tokens

Semantic tokens in `globals.css` (see `/docs/design-tokens.md`):

| Token                    | Purpose                       |
| ------------------------ | ----------------------------- |
| `--background`           | Page canvas                   |
| `--foreground`           | Default text                  |
| `--surface` / `-2`/`-3`  | Card / panel surface          |
| `--border` / `--border-strong` | Borders                |
| `--muted`                | Secondary text                |
| `--nav-bg` / `--nav-fg` / `--nav-muted` | Navbar chrome     |
| `--footer-bg` / `--footer-fg` / `--footer-muted` | Footer chrome |

## 6. Accessibility

- Toggle exposes `aria-label` ("Switch to Day/…") and `aria-pressed`-style state.
- Focus rings use brand accent; text/border contrast meets AA in both modes.
- Theme transition respects `prefers-reduced-motion` via short CSS fades.
