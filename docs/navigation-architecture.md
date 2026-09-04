# KoriePay Navigation Architecture

## 1. Principle

**Public and authenticated navigation are separate.** Portals never inherit the
public marketing navbar/footer, and public pages never expose internal
operations, compliance cases, admin functions or agent-only tools.

## 2. Boundary

`src/components/navigation/PublicChrome.tsx` is the single decision point.

```
currentPath
   ├─ matches portal segment  → render portal's own shell (no public nav/footer)
   ├─ matches auth segment    → render auth shell (no public nav/footer)
   └─ otherwise               → render PublicNavbar + PublicFooter
```

## 3. Navigation model

Each portal defines its own items inside its `Shell`. Navigation is
permission-aware by construction: items reflect the features that exist for that
role, and backend authorization remains authoritative (frontend hiding is never
the sole security control).

Conceptual model (adapt to existing authorization):

```
navigationConfig ─► currentUserPermissions ─► allowedNavigationItems ─► portalShell
```

## 4. Active state

- Active route: accent background + icon treatment + font weight.
- Nested routes activate their parent (e.g. `/transactions/123` → Transactions).
- Active state uses more than color (background + weight + icon tint).

## 5. Mobile navigation

- Desktop sidebars are not squeezed into mobile.
- Bottom navigation (icon + label, ≥48px targets) for dense banking workflows.
- Slide-out drawer for comprehensive menus.
- Fixed-safe-area aware, no horizontal overflow.

## 6. Theme & language in navigation

- Theme toggle and language switcher live in each shell's header/action area,
  placed where useful for that portal — not duplicated everywhere.

## 7. Dead links

Every navbar/footer link targets a real, existing route. No placeholder links.
