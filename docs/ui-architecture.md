# KoriePay UI / UX Architecture

> This document describes the platform-wide **Global Experience Shell Architecture**:
> a single brand, multiple purpose-built portal shells, one design system, one theme
> engine, one language engine and one loading architecture.

## 1. Guiding principle

**Never use one global navbar or footer for the entire platform.**

KoriePay is a suite of distinct products served to distinct audiences. The public
website and every authenticated portal must carry their own shell (navbar,
navigation, footer strategy, mobile navigation, user menu, theme + language
controls and loading behaviour). They share brand primitives — not chrome.

## 2. Shell map (adapted to the real repository)

| Portal      | Shell (component)                        | Navbar            | Sidebar | Mobile nav          | Footer                       |
| ----------- | ---------------------------------------- | ----------------- | ------- | ------------------- | ---------------------------- |
| Public      | `PublicChrome` + `Navbar` + `Footer`     | PublicNavbar      | No      | `Navbar` drawer     | `PublicFooter`               |
| Auth        | `AuthShell`                              | AuthHeader        | No      | Minimal             | Trust/legal footer           |
| Customer    | `CustomerShell`                          | CustomerHeader    | Yes     | Bottom + Drawer     | `PortalFooter` (compact)     |
| Agency      | `AgencyShell`                            | AgencyHeader      | Yes     | Bottom + Drawer     | `PortalFooter` (compact)     |
| Merchant    | `MerchantShell`                          | MerchantHeader    | Yes     | Bottom + Drawer     | `PortalFooter` (compact)     |
| Aggregator  | `AggregatorShell`                        | AggregatorHeader  | Yes     | Bottom + Drawer     | `PortalFooter` (compact)     |
| Compliance  | `ComplianceShell`                        | ComplianceHeader  | Yes     | Drawer              | `PortalFooter` (compact)     |
| Support     | `SupportShell`                           | SupportHeader     | Yes     | Drawer              | `PortalFooter` (compact)     |
| Developer   | `DeveloperShell`                         | DeveloperHeader   | Yes     | Drawer              | `PortalFooter` (compact)     |
| Super Admin | `AdminLayout` (+`AdminSidebar`+`AdminTopBar`) | AdminHeader  | Yes     | Drawer              | `AdminTopBar` context        |

## 3. Public / private boundary

The root layout composes the platform in `src/app/layout.tsx`:

```
ThemeProvider
  └─ LanguageProvider
       └─ AuthProvider
            └─ CountryProvider
                 ├─ RouteProgress   (global route loading)
                 ├─ Preloader       (brief brand reveal, first visit only)
                 ├─ PublicChrome    <── decides shell per route
                 ├─ QuickSearch
                 └─ Modal
```

`PublicChrome` (in `src/components/navigation/PublicChrome.tsx`) is the boundary:

- **Public routes** (`/`, `/solutions/*`, `/about`, `/developers`, `/nigeria`, …)
  render the marketing `Navbar` + `Footer`.
- **Portal routes** (`/admin`, `/agent`, `/aggregator`, `/customer`, `/merchant`,
  `/developer`, `/support`, `/compliance`) and **auth routes** (`/login`,
  `/register`, `/mfa`, `/verify`, `/otp`, …) render **only** their own chrome.

Route membership uses exact-segment matching so a public `/developers` is never
mistaken for the portal `/developer`.

## 4. Ownership

- **`PublicChrome`** owns the public/private split.
- **Each portal shell** owns its own sidebar, header, mobile nav and footer.
- **Shared primitives** (`ThemeToggle`, `LanguageSwitcher`, `ShellAccount`,
  `UserMenu`, `PortalFooter`, `LoadingIndicator`, `RouteProgress`) are reused,
  never duplicated per portal where behaviour is identical.

## 5. Portal identity

Every portal communicates which KoriePay product is active through the portal
name in the header and the compact footer (`KORIEPAY · <portal>`), so users
always know which workspace they are in.
