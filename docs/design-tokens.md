# KoriePay Design Tokens

A single source of truth for visual primitives, defined as CSS custom properties
in `src/app/globals.css` and surfaced to Tailwind in `tailwind.config.ts`.

## Semantic color tokens

| Token                    | Dark                    | Light                |
| ------------------------ | ----------------------- | -------------------- |
| `--background`           | `#070b17`               | `#070b17` (canvas)   |
| `--foreground`           | `#eef2f7`               | `#eef2f7`            |
| `--surface`              | `#0d1527`               | `#ffffff`            |
| `--surface-2`            | `#111c31`               | `#f1f5f9`            |
| `--surface-3`            | `#16223a`               | `#e8eef6`            |
| `--border`               | `rgba(255,255,255,.1)`  | `rgba(16,24,40,.1)`  |
| `--border-strong`        | `rgba(255,255,255,.18)` | `rgba(16,24,40,.18)` |
| `--muted`                | `#94a3b8`               | `#667085`            |
| `--nav-bg`               | `rgba(7,11,23,.82)`     | `rgba(255,255,255,.88)` |
| `--nav-fg`               | `#eef2f7`               | `#101828`            |
| `--nav-muted`            | `#9aa8bd`               | `#5b6b81`            |
| `--footer-bg`            | `#050914`               | `#eef2f8`            |
| `--footer-fg`            | `#cbd5e1`               | `#1f2937`            |
| `--footer-muted`         | `#94a3b8`               | `#5b6b81`            |

## Tailwind surface mapping

`bg-background`, `text-foreground`, `bg-surface`, `bg-surface-2`, `bg-border`,
`text-muted`, `border-border`, etc. are exposed via `tailwind.config.ts` so
components reference semantic surfaces instead of raw hex values.

## Brand palette (unchanged)

The brand green/teal/gold/orange/navy ramp in `tailwind.config.ts` is preserved
and remains the single source of truth for KoriePay's identity.

## Typography

- **Sans (body / UI):** Public Sans with Arial fallback (`--font-sans`).
- **Serif (display / headings):** Source Serif 4 with Times fallback
  (`--font-display`), applied to `h1/h2/h3` in `globals.css`.
- **Mono:** system monospace for references, codes, statuses.

## Effects / motion

Glassmorphism is used strategically (nav, floating panels, modals, selected
widgets) and avoided where it harms contrast or data clarity. Shadows and
`brand-mesh`/`brand-glow` gradients are defined once in Tailwind.

## Accessibility contrast

Text/border tokens are tuned for AA in both themes; status is never conveyed by
color alone (icons + labels accompany success/failed/pending states).
