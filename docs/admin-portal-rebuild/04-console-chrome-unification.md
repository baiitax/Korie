# 04 — One console chrome: Admin ↔ Compliance ↔ Support ↔ Merchant

Status: **SHIPPED + LIVE** (prod build on :3000) · Date: 2026-09-09 · Branch: `feature/compliance-portal-demo-rebuild`

## What was asked

> “Update the compliance, support and merchant sidebar to be exact like Admin collapse sidebar. Adapt the admin UX design on all the mentioned portal.”

## Approach: extract the admin chrome, don't copy it

Instead of writing three look-alike sidebars (which drift), the Super Admin chrome was **extracted into
shared components**, then Admin itself was migrated onto them — so all four consoles literally render the
same code:

| New shared component | Responsibility |
|---|---|
| `src/components/console/ConsoleShell.tsx` | Console layout: floating collapsible rail in the page gutter + workspace column + mobile nav slot + overlay slot (admin skeleton) |
| `src/components/console/ConsoleTopBar.tsx` | 64px glass top bar: search trigger w/ ⌘K, market switcher, status chip, realtime toggle, portal extras, notification tray, day/night toggle, operator identity + logout |
| `src/components/console/ConsoleMobileNav.tsx` | Floating dock + “More” bottom sheet (same sheet pattern as admin) |
| `src/components/console/ConsoleCommandPalette.tsx` | ⌘K palette: searches the portal's destinations plus whatever live records the portal supplies |

The rail itself was already the shared master-spec component (`KorieFloatingRail`): 76px icon-first collapsed →
258px labelled expanded, `ChevronsRight/Left` affordances, hover tooltips, per-portal persistence key.
Compliance was the only portal **not** using it (it had a bespoke `kpc-rail`); that bespoke rail is now removed.

## Per-portal outcome

**Admin (reference, unchanged design)** — `AdminConsoleFrame` now delegates to `ConsoleShell`;
`AdminTopBar` is a thin wrapper over `ConsoleTopBar` (same DOM/classes as before). Bonus fix: the ⌘K trigger
was wired to a state value nothing rendered — it now opens a real admin destination palette.

**Compliance** — bespoke sidebar, bespoke mobile drawer, breadcrumb header, dock and profile dropdown removed.
Uses the shared rail (emerald tone) with all 10 groups / 30 destinations, live badge counts (KYC, alerts,
cases, tasks, approvals, matches), jurisdiction & rails context card, officer footer. Top bar keeps every
compliance capability: localized search placeholder driving a ⌘K palette over live portal data (customers,
alerts, cases, KYC), jurisdiction market switcher, officer role chip, EN/FR/HA language switcher,
notification tray built from live alert/approval data, day/night toggle, officer identity + logout.
Toasts unchanged. `korie_compliance_rail` persists its own collapse state.

**Support** — bespoke slate header, bespoke full-screen mobile menu and the `inset` rail variant removed.
Now: shared rail (sky tone, 12 primary destinations), Banking & Clearing Rails context card, officer footer;
admin top bar with Support-specific controls (regions market switcher, open-ticket status chip, EN/HA/FR
switcher, simulated RBAC officer dropdown), honest notification tray (SLA breaches / active incidents from
`SupportContext.stats`), ⌘K palette over destinations **and the live ticket queue**.

**Merchant** — bespoke header replaced by the shared top bar (tier chip, balance show/hide, EN/HA/FR);
branch switcher moved into the standard rail context card; business + settlement account in the rail footer;
notification tray now derived from real context data (open disputes, unpaid invoices, pending settlements);
⌘K palette over destinations and live invoices; mobile “More” upgraded from a settings link to the full
section sheet.

## Live verification (prod :3000)

```
/admin        HTTP 200 | rail:kr-rail kr-tone-emerald | dock:1 | glass-nav:1
/compliance   HTTP 200 | rail:kr-rail kr-tone-emerald | dock:1 | glass-nav:1
/support      HTTP 200 | rail:kr-rail kr-tone-sky     | dock:1 | glass-nav:1
/merchant     HTTP 200 | rail:kr-rail kr-tone-teal    | dock:1 | glass-nav:1

Structural proof (rail markup diff, icon glyphs + accent tone normalised):
  /compliance chrome skeleton identical to /admin: True
  /support    chrome skeleton identical to /admin: True
  /merchant   chrome skeleton identical to /admin: True

Removed from DOM: compliance bespoke rail (kpc-rail → 0 matches), support “Support Operations Menu” (0),
compliance bespoke dock (kpc-dock → 0). Shared dock present on all four pages.
Sub-page smoke: /admin/bank, /admin/settings, /compliance/{alerts,cases,customers},
/support/{inbox,tickets}, /merchant/{payments,invoices} → all 200.
Regression: Bank Core API /api/bank/v1/liquidity → 200. Server log clean (no errors/hydration warnings).
Gates: tsc clean · next lint clean (only pre-existing warnings elsewhere) · next build compiled.
```

## Deliberate/known consequences

- Accent tone stays per-portal by design (emerald admin/compliance, sky support, teal merchant); structure,
  sizing, collapse behaviour, tooltips, top bar and mobile nav are byte-identical. Tell me if you want one
  accent everywhere.
- Portal footers (`PortalFooter`) were dropped from Support and Merchant because the admin console has none —
  say the word and I'll reinstate them inside the workspace column.
- Expand/collapse is per-portal (localStorage keys `korie_admin_rail` / `korie_compliance_rail` /
  `korie_support_rail` / `korie_merchant_rail`), matching how admin already behaved.
