# 10 — UX reconstruction: the customer portal experience

Follows [`01`](01-root-cause.md)–[`09`](09-remaining-limitations.md). That pass made the portal
**true** — every surface reads and writes engine state. This pass makes it **feel** like a
financial product a customer can trust at a glance, and then *proves the result in a browser*
rather than asserting it in prose.

Baseline for everything below is `65db3cc` (the repair commit). The reference material supplied
with the brief was a set of **interaction principles** — clean mobile composition, large
financial figures, compact action modules, clear transaction hierarchy, rounded surfaces, subtle
depth, persistent floating navigation, strong active states, financial information before
metadata. No layout, colour, typography, illustration, icon set, component shape or asset was
copied from it; there was no image attached to the brief at all. The visual system below is
derived from the repo's own brand asset.

---

## 1 · Method

Two rules governed every decision:

* **Derive, don't copy.** Exact colour values come from measuring
  `public/brand/koriepay-logo-full.png`, not from the hex codes used as *examples* in the brief.
* **Nothing ships that the audit cannot check.** Every claim in §6 is a number produced by
  [`scripts/ux-sweep.mjs`](../../scripts/ux-sweep.mjs) against a production build. Where a claim
  could not be measured here, it is listed in §9 instead of being written as done.

## 2 · Brand, measured then corrected for legibility

Perceptual-quantised pixel areas of the logo asset:

| Colour | Share | Role |
|---|---|---|
| navy `#20273a` | 48.3% | ink / dark surfaces |
| emerald `#29b475` | — | brand fill only |
| teal `#158987` | — | secondary fill, gradient far stop |
| gold `#ebc844` | — | accent (primary chip, alert pip) |
| orange `#f88d25` | — | sparingly; attention only |

The emerald **cannot be text**. Measured against the light page (`#f7f9fb`) it is **2.67:1**; the
portal's previous `#0d9488` was **3.74:1** — also an AA defect that shipped. So the palette
splits by role:

| Token | Light | Dark | Measured |
|---|---|---|---|
| `--brand-primary` (fill) | `#29b475`-family geometry | mint `#35c9a8` | text/interactive emerald is `#0b7a63` = **5.28:1** |
| `--brand-on-primary` (ink on brand fill) | `#ffffff` → 5.28:1 | `#04231c` → **7.98:1** on the mint (white was **2.09:1**) |
| `--kp-on-gold` | `#3c2f02` → 4.91:1 on `#ebc844` | dimmed `#d9bd57` |
| orange | `#a3490a` ink on `#f88d25` → 5.97:1 | `#fba94f` |

Dark mode is *designed*, not inverted: page `#0b1220`, surfaces `#111c2f / #16233a / #1c2c46`,
emerald controlled to `#35c9a8`, gold and orange pulled back, elevation carried by surface step
rather than glow.

## 3 · The token layer (§71)

One place defines the experience, appended as a **`.kp-portal` brand layer** in
`src/app/globals.css` so that admin/agent/merchant/compliance — which share `:root` — are
untouched. Customer code references tokens; it does not carry literals.

* **Depth ladder** — `--z-page 40 / --z-nav 50 / --z-scrim 45 / --z-sheet 50 / --z-modal 60 /
  --z-toast 70 / --z-loader 90`. Every portal overlay was converted from ad-hoc `z-[9999]`-style
  values to this ladder: the capsule can never sit above a sheet, and a sheet can never sit above
  a modal. Measured: `nav 40 < scrim 45 < sheet 50`, loader `90`.
* **Navigation geometry** — `--kp-nav-height 62px`, `--kp-nav-inset 14px`,
  `--kp-nav-radius 26px`, `--kp-nav-max-width 430px`, `--kp-nav-width 92%`, and
  `--kp-content-clearance` = height + inset + safe-area + 24px, which is what keeps the last
  action off the capsule.
* **Surfaces** — `.kp-balance-surface` (XOF emerald→teal 150°, NGN `#1d2a3f→#2c4763`, each with a
  hairline brand wash at 62–75% along the logo's chevron angle — one diagonal, not a watermark),
  `.kp-sheet` / `.kp-sheet-scrim` / `.kp-sheet--dialog` with a single rise curve
  (`kpSheetRise`), `.kp-skeleton-shimmer`, `.kp-spinner`.
* **Ink on brand fills** — `.kp-on-vault` / `.kp-on-vault-soft` (see §5.2).
* Blur is used on the capsule and the header only (`--nav-blur 16px saturate(1.5)`), with
  `contain: paint`, no blur on scroll-critical lists, and full `prefers-reduced-motion` opt-outs
  for the nav transition, sheet rise, skeleton shimmer and spinner.

## 4 · Composition, surface by surface

| Requirement | How it is built |
|---|---|
| XOF first, NGN second | `CUSTOMER_CURRENCY_ORDER` drives the hero, account rows, filter sheet, currency switcher and funding destination; nothing re-sorts by balance |
| Balance first, number second | Hero figure is `clamp(1.75rem, 9vw, 2.5rem)`/800/`tabular`; the masked account number is 15px mono. Measured 35.1px vs 15px |
| One privacy control | `BalanceVisibilityToggle` sits inside the balance card and is the only such control; it is honoured on home, accounts, transfer review, funding destination, currency switcher and the insufficient-funds line. Header carries none |
| Quick actions | Four real routes (`/customer/send-money`, `/customer/fund`, `/customer/wallets`, `/customer/transactions`) — measured 129×76…92px at 320px, `active:scale-[0.98]`, per-tile busy state while the destination route loads. The second, duplicate tile grid is gone, together with `ui/HubActions.tsx` |
| Transaction hierarchy | `TransactionRow` = counterparty (masked, name-level) → status chip → amount (signed, tabular, inflow/outweigh colour + glyph) → timestamp as the quietest line. Day groups get a sticky `<h2>` and `divide-y` separators. All seven states render from real data: skeleton, loaded, empty, error, pending, failed, reversed |
| Filters that don't overshadow history | A single "Filters" button in the header row; the bottom sheet carries currency / status / date (incl. **Custom** range) and applies server-side; applied filters show as dismissible chips plus a `Filters (N)` count. Verified: applying NGN puts `currency=NGN` on the request |
| Detail | Bottom sheet on mobile, centred dialog at `sm+` (`.kp-sheet--dialog`), with share, print, PDF/image receipt (the same `ReceiptDocument` that print CSS reflows) and a dispute entry that only appears for rows the engine allows to be disputed |
| Floating capsule | Fixed, centred, 92% width capped at 430px, 26px radius, translucent + blurred, 5 destinations **Home · Activity · Send · Your Accounts · More**; `Send` is raised and filled but on the same surface, not a separate FAB. RAF-throttled scroll quiets it to `opacity .9 / translateY 2px` (never hides it) with a ±6px hysteresis, and it never condenses on `CRITICAL_ROUTES` (send/fund) |
| Desktop | `hidden lg:flex` sidebar: brand, primary group, secondary group, profile + appearance; the capsule is **removed** at `lg+` rather than shown alongside it |
| Verification as a journey | `VerificationCard` + `/customer/kyc` read `kycStatus` / `kycTier` / vault documents via `CustomerVerification`; steps are typed, an absent signal renders `UNAVAILABLE` rather than "done", and no step count is invented. `DocumentUploader` has the capture guidance frame (corners / readable / no glare) and real `uploading → processing → done / error` states with XHR progress, abort, remove, retry and a 409 "already submitted, review is locked" path |
| Appearance | Light is canonical; the theme is applied by an inline pre-paint script (no flash) and persisted. Reachable from Profile **and** Settings→Appearance. Deliberately **not** a fourth header control (§8) |
| Preloader | Branded, state-aware: exits on `bootstrapReady` (first authoritative read, success *or* failure), floored at 700ms so it cannot strobe, capped at 9s so it cannot trap the screen, session-guarded, and it hands off to the page's own error state rather than lying |
| Send flow | Recipient → Amount → Review → Confirm → Processing → Result, one step per screen, review restating amount/fee/debit account, and the balance honoured in the insufficient-funds copy |
| Settings order | Security → Verification → Appearance → Language → Notifications → Support, each section pointing at the same screens the More sheet lists (no duplicate actions) |
| Languages | EN / FR / HA, **1350 keys each, parity-checked**. Language switcher is a globe, never country maps. French gets the extra pass: `CFA`, `pièce d'identité`, `Téléversez`, French number spacing, and no anglicism left in the vault copy. Hausa renders on every route |

## 5 · What the browser audit found, and what it forced open

The first sweep run produced **15 failures**. Each one below was reproduced in Chromium, fixed,
and re-measured. Three of them were not cosmetic — they were defects the static checks could not
see at all.

| # | Defect (found by the audit, not by reading code) | Fix | Evidence after fix |
|---|---|---|---|
| 1 | **`safeFetch` silently dropped the credential.** `src/lib/customer/customerApiError.ts` accepted `init.token` and never used it, so `/portal/transactions`, `/portal/notifications` and the dispute reads were **401 in the browser** while `curl` (with a bearer) returned 200. The history list was therefore error-only for a real session, and no amount of type-checking showed it. | Attach `Authorization` in one place — `init.token` else `getPortalBearer()` — and default JSON content-type (`customerApiError.ts:191-195`) | Server log: `GET /api/customer/portal/transactions 200`, no 401s; probe shows four authenticated fetches per cold load |
| 2 | **The balance card's gradient never painted, and its white ink was rewritten to navy.** Two separate causes stacked: (a) `.kp-balance-surface` declared `position: relative` while the component relied on a `absolute inset-0` **sibling layer** — same specificity as the Tailwind utility, later in the file, so the utility lost and the layer collapsed to 0px tall; (b) the legacy app-wide rule `globals.css:489` `.light .text-white { color: var(--foreground) !important }` turned the card's ink into page ink on a saturated fill. | Paint the surface on the card itself (`globals.css:1304`, `PrimaryBalanceCard.tsx:68`) and give brand fills their own ink classes `.kp-on-vault` / `.kp-on-vault-soft` with a 92% alpha floor, because white at 60–85% measures 2.9–4.3:1 on the light emerald | Light: figure **5.28:1**, account number **5.28:1**, caption **4.73:1**. Dark: 6.01 / 6.01 / 5.36 |
| 3 | **Hydration failure #418/#422 in production.** `KorieLogo` links by default (`linkHref="/"`), and every portal/agent/merchant header wrapped it in another `Link` → `<a>` inside `<a>`. React bailed out of hydration; the customer portal still painted (server HTML) but **the first interaction was a full client re-render**, and the same invalid nesting existed in 9 other shells. | `linkHref=""` where the wrapper owns navigation (2 sites in `CustomerShell`, 9 across `AuthShell`/admin/agent/merchant/aggregator/developer), plus the time-of-day greeting that read `new Date().getHours()` **at render** (`CustomerGreeting.tsx:36-40`) — server UTC vs the customer's clock made the text differ | Console-error capture across 17 routes: **0 errors**, and the privacy toggle now mutates state on the first click |
| 4 | **Raw i18n keys on the KYC screen** — `verification.action.identity_document`, `verification.reason.document`, `verification.reason.review`: `CustomerVerification.ts` constructed keys in a namespace whose meaning had already changed under it, so the strings resolved in no language. | Action hints now map through `ACTION_VERB_BY_STEP` to verbs the dictionaries own (`CustomerVerification.ts:111,228`); seven `verification.reason.*` sentences added × EN/FR/HA | Parity **1350 keys**; raw-key sweep across 6 routes × 2 themes clean |
| 5 | **`<html lang>` lied.** The portal kept its own `language` state (defaulting to French for the XOF market) while the platform provider drove `document.documentElement.lang` — so a French screen was announced with an English voice. | One source: `CustomerContext.tsx:237` now reads/writes `useLanguage()` and seeds the portal default once on mount, so the provider owns persistence and the `lang` attribute | `FR: <html lang>="fr"` with nav `Accueil / Activité / Envoyer / Vos Comptes`; `HA: <html lang>="ha"` |
| 6 | **Empty state impersonated loading** on History while `historyPhase === "idle"` — the first read had not answered, yet the screen said "No transactions yet". | `showHistorySkeleton` covers `idle` as well as `loading`, and the empty state is only reachable after `ready` (`transactions/page.tsx:160,310`) | Cold load with the first read held open: **30 skeleton blocks**, 1 `aria-busy` region, `empty state shown too = false` |
| 7 | **Two navigations on one screen at `lg+`** — the capsule had no `lg:hidden`, so a desktop customer got the sidebar *and* the floating bar. | `@media (min-width: 1024px) { .kp-nav { display: none } }` in the brand layer, next to the geometry it belongs to | Capsule hidden and sidebar 256px at 1024/1280/1440/1920/2560 |
| 8 | White labels on dark-mode mint buttons (`--brand-primary` `#35c9a8`) measured **2.09:1**. | `--brand-on-primary` token (white in light, `#04231c` in dark) applied to all 37 brand-fill sites in the portal | `main a[href]` 7.98:1 in dark, 5.28:1 in light; quick action 7.98:1 dark |
| 9 | Sub-24px tap targets — the dashboard's "Manage accounts" link was **16px tall**; several header controls sat at 26–36px. | Real target sizing (`min-h-[44px]` on the dashboard link, `min-h-[42px]` header logo link, `min-h-[36px]`+`min-w` on icon buttons) | Keyboard walk: 14 stops, **0 problems**; primary set measured 54×57…129×92 at 320px |
| 10 | Provider name truncated to `Cor…` on the dashboard rows — metadata crowding the money, and the rail was being advertised in a list whose job is balance legibility. | Row now reads `•••• •••• 4321` only (the bank stays where it is *useful*: receive-money, funding instructions, beneficiary address) | Dashboard row 144px clear of the capsule; no mid-word ellipses in the accounts list |
| 11 | Sheet layering read as `z 0 < 0` because the dialog's own node carried no index, and several overlays still hard-coded one. | `.kp-sheet--dialog` on the modal rung; `LanguageSelector`, `AccountCard` menu → `--z-sheet`; `PinModal`, `TransactionReceiptModal`, `ReportDisputeModal` → `--z-modal`; the full-screen loader → `--z-loader` | `nav 40 < scrim 45 < sheet 50`, loader `90`; More sheet `modal=true focus-in=true esc-close+restore=true`, 8 destinations, 0 dead links |
| 12 | The floating bar visually covered the money-flow CTAs at phone widths when measured by `scrollIntoView({block:"end"})`. | Not a product defect — the harness was pinning the CTA into the nav band on purpose. Re-measured the honest way: scroll the document to its end, then hit-test the CTA centre. `--kp-content-clearance` (page bottom padding = nav height + inset + safe-area + 24) is what the design relies on | `send-money` 1 action, `fund` 2 actions, `kyc` 0 (its CTA is inline in the card): **none covered** at 320/390/430 |

Also fixed as part of the experience pass, found while wiring the sheets and states: hard-coded
`CFA ••••••••` masking replaced by `maskedBalance(symbol)`; the detail sheet's meaningless
"Account: XOF • XOF" row replaced by the masked destination (`detail.toAccount`, omitted when the
payload has no account); `DocumentUploader` gained the error card, spinner, `Uploading… N%`,
remove-feedback and the §34 capture guidance that had no render at all; the four missing skeleton
shapes (`AccountCardSkeleton`, `VerificationCardSkeleton`, `BalanceCardSkeleton`,
`QuickActionsSkeleton`) were written; and 54 locale keys across EN/FR/HA back that copy.

## 6 · Measured matrix (production build, headless Chromium)

`node scripts/ux-sweep.mjs` — **0 failures across 10 widths × 6 routes**, then re-run after every
change. The gates, verbatim from the last run:

| Width | Capsule | Radius | Bottom gap | Destinations | Last action clearance |
|---|---|---|---|---|---|
| 320 | 293px (92%) | 26px | 12px | 5 | 144px |
| 375 | 343px (92%) | 26px | 12px | 5 | 143px |
| 390 | 357px (92%) | 26px | 12px | 5 | 144px |
| 430 | 394px (92%) | 26px | 12px | 5 | 143px |
| 768 | 428px (56%, capped) | 26px | 12px | 5 | 131px |
| 1024–2560 | hidden; sidebar 256px | — | — | — | — |

Horizontal overflow at every width, including 320px: **0px**. No nav covering `Continue`,
`Review Transfer`, `Confirm` or `Submit` at 320/390/430. Contrast on both themes: h1 14.08
(light) / 16.05 (dark); balance 5.28 / 6.01; masked account number 5.28 / 6.01; vault captions
4.73 / 5.36; nav labels 13.23 / 11.37; brand fills 5.28 / 7.98 — all at or above the AA threshold
for their size and weight. Keyboard: 14 stops, focus ring on 14/14, no target under 24px; More
sheet is `aria-modal`, labelled, moves focus in and returns it on Escape. Skeletons animate off
under `prefers-reduced-motion`. No route renders a raw key, a blank page, a dead nav link, a
nested interactive element, or an internal identifier (`ledger_entries`, UUIDs, stack fragments —
the leak regex returns nothing on all 17 routes).

## 7 · Reproducing it

```bash
npm run build && npx next start -p 3000 &
BASE=http://127.0.0.1:3000 node scripts/ux-sweep.mjs   # exit 0 = clean, else it lists failures
SHOTS=/tmp/contact-sheet node scripts/ux-shots.mjs      # 30 PNGs: 7 routes × mobile+desktop × light+dark
node scripts/i18n-parity.mjs                            # 1350 keys × EN/FR/HA
```

The audit needs no login: `AuthContext` starts authenticated and `customerPortalClient` attaches
the documented sandbox bearer, so pages render with real engine data. On this sandbox Chromium
also needs `LD_LIBRARY_PATH=<extracted nspr/nss/atk/…>`; the script itself is portable.
`scripts/ux-sweep.mjs` is measurement, not taste: it reports computed styles, geometry, ratio
math, focus behaviour and rendered text — the things a reviewer can argue with.

## 8 · Deliberate non-changes

* **No `CustomerHeader` extraction.** The header is 4 controls inside `CustomerShell`; a separate
  component would be a third place to keep the nav, the freshness bar and the shell in sync.
* **No `/customer/notifications` page and no "mark all read".** The notifications route is
  GET-only; a bell that opened a page of invented actions would be the "unavailable functionality
  appearing active" defect. The bell opens `NotificationCenter` over real data.
* **No theme toggle in the mobile header.** A fourth control at 320px breaks the capsule-nav
  layout the brief asks to protect; appearance lives in Settings **and** Profile, both verified.
* **No `ComingSoon` route in the primary action row** and no fake route-loading spinner:
  Coming Soon means unavailable, and unavailable features never open a transaction detail.
* **No mock data, no simulated writes.** Where the engine has no signal (`phone`/`email`
  verification steps, no realtime channel), the UI says so instead of animating confidence.
* The dashboard marketing footer (`Support · Security · Privacy · Terms`) stays: its four links
  are live routes, and removing them from the portal would strand them.

## 9 · Not verified here

* **Real-device safe areas.** `env(safe-area-inset-bottom)` is wired into the clearance token and
  the capsule's bottom offset, but headless Chromium cannot report a notch or a home indicator;
  no iPhone/Android capture was possible in this environment.
* **Hausa copy quality.** Parity and rendering are proven; idiom is not — a native reviewer should
  read `src/locales/ha.ts` before this faces customers, the same caveat already recorded for
  French in `09-remaining-limitations.md`.
* **Motion is checked as opt-out, not as feel** (skeleton shimmer, sheet rise and nav transition
  are verified to *stop* under reduced motion; nobody has judged whether 180ms is right on a
  60Hz phone).
* **No visual regression baseline.** Screenshots are produced for a human to read; there is no
  committed golden set, so a future change can still shift a pixel without failing the sweep.
* **The sweep asserts on 6 routes deeply and 17 routes broadly** (render, controls, raw keys,
  leaks, nesting). Bills, FX, adashi and cards therefore have less geometry coverage than Home and
  History, and the transfer *success* path still depends on a live provider stub (§09 L1).
