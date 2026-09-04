# KoriePay Portal Shells

Each portal shell owns its own navigation, header, mobile navigation, user menu
and footer. They share brand primitives and engines.

## Public

- **Shell:** `PublicChrome` + `Navbar`
- **Navbar:** logo, Products / Solutions / Markets / Technology / Company /
  Contact, then language, theme, sign-in, get-started.
- **Footer:** `PublicFooter`.
- **Theme / language:** yes.

## Auth

- **Shell:** `AuthShell`
- **Header:** logo, theme toggle, jurisdiction, EN/HA/FR, support link.
- **Footer:** trust + legal strip (Security · Privacy · Terms).
- Focused, no marketing chrome.

## Customer Banking

- **Shell:** `CustomerShell`
- **Sidebar:** Home, Transfers, Payments, Bills, Cards, FX, Activity,
  Beneficiaries, Wallets, Security, Support, Settings.
- **Mobile:** fixed bottom nav + drawer.
- **Footer:** `PortalFooter` (compact).

## Agency Banking

- **Shell:** `AgencyShell`
- **Sidebar:** Dashboard, Transactions, Customers, Cash & Liquidity, Services,
  Commissions, Settlement, Reconciliation, Reports, Disputes, Support, Security.
- **Mobile:** bottom nav.
- **Footer:** `PortalFooter` (compact).

## Merchant

- **Shell:** `MerchantShell`
- **Sidebar:** Overview, Sales, Payment Links, Invoices, Payments, Customers,
  Products, Team, Wallet, Settlements, Reports, Developers, Support, Settings.
- **Footer:** `PortalFooter` (compact).

## Aggregator

- **Shell:** `AggregatorShell`
- **Sidebar:** Overview, Agents, Transactions, Liquidity, Settlements,
  Commissions, Performance, Reports, Alerts, Support, Settings.
- **Footer:** `PortalFooter` (compact).

## Compliance

- **Shell:** `ComplianceShell`
- **Sidebar:** Command Center, Cases, Alerts, KYC/KYB, AML, Sanctions, Risk,
  Investigations, Reports, Audit, Policies, Support.
- **Footer:** `PortalFooter` (compact).

## Support

- **Shell:** `SupportShell`
- **Sidebar:** Command Center, My Queue, Tickets, Customers, Agents, Merchants,
  Developer, Knowledge Base, SLA, Escalations, Analytics, Settings.
- **Footer:** `PortalFooter` (compact).

## Developer / API

- **Shell:** `DeveloperShell`
- **Sidebar:** Overview, APIs, Documentation, Explorer, Applications, Credentials,
  Webhooks, Sandbox, Logs, Usage, Status, Changelog, SDKs, Support, Settings.
- **Footer:** `PortalFooter` (compact).

## Super Admin

- **Shell:** `AdminLayout` (`AdminSidebar` + `AdminTopBar`).
- **Sidebar:** Command Center, Users, Customers, Agents, Merchants, Aggregators,
  Transactions, Financial Ops, Compliance, Risk, Settlements, Reconciliation,
  Providers, API Platform, Support, System Health, Audit, Reports, Config.
- **Header:** global search, country filter, environment, realtime, notifications,
  **theme toggle**, operator identity + **logout**.

## Shared controls across portals

- **Theme:** `ThemeToggle` / `ShellAccount`
- **Language:** portal-native toggles (kept) + global `LanguageSwitcher` for
  public/auth chrome.
- **Logout:** `ShellAccount` (portal headers), `UserMenu` (public navbar),
  `AdminTopBar` (super admin).
- **Footer:** `PortalFooter` (compact) across all authenticated portals.
