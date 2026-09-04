# KoriePay Footer Architecture

## 1. Principle

**Do not use one universal footer component.**

Each surface owns its footer content while reusing shared primitives.

## 2. Footers by surface

| Surface       | Footer                        | Purpose                                          |
| ------------- | ----------------------------- | ------------------------------------------------ |
| Public        | `PublicFooter`                | Marketing + trust + legal (multi-column)        |
| Auth          | `AuthShell` footer            | Security + support + legal (trust strip)        |
| Customer      | `PortalFooter` (compact)      | Legal / support only                             |
| Agency        | `PortalFooter` (compact)      | Operational support + legal                      |
| Merchant      | `PortalFooter` (compact)      | Business support + legal                         |
| Aggregator    | `PortalFooter` (compact)      | Operational support + reporting/legal            |
| Compliance    | `PortalFooter` (compact)      | Internal policy + system info                    |
| Support       | `PortalFooter` (compact)      | Internal operational references                  |
| Developer     | `PortalFooter` (compact)      | Technical resources + API status                 |
| Super Admin   | Admin top-bar context         | System / version / audit info                    |

## 3. Shared primitives

- `src/components/ui/PortalFooter.tsx` — a compact `KORIEPAY · <portal>` bar with
  configurable links, used by all authenticated portals. It renders a slim
  support/security/privacy/terms row and the copyright footer line, so dashboard
  real estate is not wasted on a marketing footer.
- `src/components/navigation/Footer.tsx` — the full public marketing footer for
  the website only.

## 4. Public footer content

Products, Solutions, Markets, Infrastructure, Company + Legal, a regulatory
notice and the bottom bar (`© KoriePay Technologies Limited` + Privacy / Terms /
Security / Cookies). Links point only to real, existing routes — no dead links.
