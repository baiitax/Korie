# KoriePay UX Remediation Matrix

Audit → remediation for the Global Experience Shell Architecture. Each row maps
a problem to its affected routes, the component involved, the correct shell and
the change applied.

| #  | Problem                                                             | Affected route(s)                              | Current component                        | Correct shell         | Change                                                                                     | Risk |
| -- | ------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------ | ---- |
| 1  | Public marketing Navbar/Footer mixed into authenticated portals     | `/admin`, `/agent`, `/aggregator`, `/customer`, `/merchant`, `/developer`, `/support`, `/compliance` | Root `layout.tsx` always rendered `Navbar`+`Footer` | Portal-specific shell | Added `PublicChrome`; portalled routes no longer render public chrome                        | Low  |
| 2  | `/developers` (public) falsely matched the `/developer` portal      | `/developers`                                  | `Config` prefix `startsWith`              | Public                | Exact-segment route matching in `PublicChrome`                                              | Low  |
| 3  | No day/night theme across the platform                              | Everywhere                                    | —                                        | Global                | `ThemeProvider` + `ThemeToggle` + light/dark tokens used by chrome & portal headers          | Low  |
| 4  | No logout available on public navbar / many portal headers          | `/`, portals                                  | —                                        | Per-shell             | `UserMenu` (public), `ShellAccount` (portal headers), `AdminTopBar` logout                   | Low  |
| 5  | Fake-percentage, session-blocking startup preloader                 | `/` (first load)                              | `Preloader`                              | Loading system       | Replaced with a brief, non-blocking, indeterminate brand reveal                              | Low  |
| 6  | No route-level loading feedback                                     | All routes                                    | —                                        | Loading system       | `RouteProgress` global top bar (no Suspense requirement)                                    | Low  |
| 7  | No reusable branded loading indicator for data/API operations       | Portals                                      | —                                        | Loading system       | `LoadingIndicator` (size/message variants, accessible)                                     | Low  |
| 8  | Dashboards had no footer at all                                     | `/customer`, `/agent`, `/merchant`, `/aggregator`, `/compliance`, `/support`, `/developer` | —                    | Per-specific         | `PortalFooter` (compact, portal-aware) added to each shell                                | Low  |
| 9  | Public navbar language toggle only EN/FR                           | `/`                                          | `Navbar` EN/FR button                      | Public/global        | Unified `LanguageSwitcher` (EN/HA/FR) replacing hardcoded toggle                             | Low  |
| 10 | Auth shell lacked a theme control                                  | `/login`, `/register`, `/mfa`, ...            | `AuthShell`                                | Auth                 | Added `ThemeToggle` and theme-aware logo                                                      | Low  |
| 11 | No centralized language engine for chrome                         | `/`, auth                                    | scattered toggles                          | Global              | `LanguageProvider` + `t()` + shared `public` translation namespace (en/ha/fr parity)         | Low  |
| 12 | Hardcoded public strings (nav/footer) not localised               | `/`, `/about`, `/solutions/*`                 | `Navbar`/`Footer`                          | Global              | Added `public.*` keys to en/ha/fr, wiring `useLanguage().t`                                  | Low  |
| 13 | Fonts not professional (pre-Inter/Plus Jakarta)                    | Everywhere                                   | `layout.tsx`                               | Design system       | Public Sans (Arial fallback) + Source Serif 4 (Times fallback) headings                     | Low  |
| 14 | `useSearchParams` in a shared component broke static prerendering | All static pages                              | (new) `RouteProgress`                      | Loading system      | Rewrote to use `usePathname` only, removing the missing-Suspense error                       | Low  |

## Applied (this pass)

1. **Public/private separation** — `PublicChrome` + exact route matching.
2. **Theme engine** — `ThemeProvider`, `ThemeToggle`, light/dark tokens.
3. **Logout everywhere** — `UserMenu`, `ShellAccount`, `AdminTopBar`.
4. **Loading architecture** — non-blocking `Preloader`, `RouteProgress`,
   `LoadingIndicator`.
5. **Portal footers** — compact `PortalFooter` on every authenticated portal.
6. **Language engine** — `LanguageProvider`, unified `LanguageSwitcher`,
   localised public chrome (en/ha/fr).
7. **Design tokens + typography** — semantic tokens, professional fonts.

## Deferred / recommended next

- Light re-theme of the dense portal content canvas (currently intentionally dark
  for financial clarity) — larger, separate effort.
- Portal-aware 404 / 403 / 500 / offline / offline-recovery screens.
- Skeleton components per dashboard page and table.
- Contextual toast provider and shared error/empty/retry components.
- Permission-aware nav generation from backend claims (frontend currently
  configures per-portal items; backend remains authoritative).
- Automatic test suite for nav/theme/language/loading persistence.
