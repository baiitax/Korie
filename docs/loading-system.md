# KoriePay Loading System

## 1. Principle

Loading feedback must appear **when the system is actually waiting** — it is not
a startup splash that blocks every navigation.

```
Application starts
   └─ Render shell immediately
        └─ Load actual content
             └─ Show contextual loading state
```

## 2. Categories & treatments

| Catastate                     | Treatment                                             |
| ----------------------------- | ----------------------------------------------------- |
| Route navigation              | `RouteProgress` (thin branded top bar)                |
| Page data loading             | `LoadingIndicator` / skeletons                        |
| Component / API loading       | `LoadingIndicator` (inline)                           |
| Form submission / buttons     | Button disabled + spinner + status text               |
| Search                        | inline spinner (no full-page reload)                  |
| Table / pagination            | skeleton rows                                         |
| Modal data loading            | immediate open + content skeleton                     |
| Authentication / permission   | minimal secure session indicator                      |
| Theme / language init         | non-blocking (pre-hydration script)                   |

## 3. Components

- `src/components/ui/RouteProgress.tsx` — top-of-viewport progress bar that
  starts on navigation, eases toward ~90%, then completes when the new route has
  rendered. Uses `usePathname` only (no `useSearchParams`) so it does **not**
  require a Suspense boundary during static prerendering.
- `src/components/ui/LoadingIndicator.tsx` — branded, size-varied radial spinner
  with an optional contextual message; exposes `role="status"` / `aria-live`.
- `src/components/brand/Preloader.tsx` — a **brief, non-blocking** brand reveal
  (sub-second, first visit per session) using an **indeterminate** spinner.

## 4. Rules

- **No fake progress.** Percentages are only shown when the backend supplies
  them; unknown-duration operations use an indeterminate indicator.
- **No infinite spinners.** Every loader has a success / error (with retry)
  transition.
- **No unnecessary startup blocking.** The old fake-percentage preloader was
  replaced by a fast, non-blocking, indeterminate reveal.
- **No false success.** Financial operations reflect backend state
  (Initiated → Processing → Successful / Failed / Pending) and never optimistically
  claim completion.
- **Financial retry rule.** Never blindly duplicate a money-movement request on
  timeout; check status / use idempotency + transaction references.
- **Reduced motion.** Prefers `prefers-reduced-motion`; keeps essential
  indicators functional while removing decorative animation.

## 5. Accessibility

- `role="status"`, `aria-live="polite"`, `aria-busy` on busy containers,
  `aria-label="Loading page"` on the progress bar.
- Skeletons are marked as non-content (not read as real content).
