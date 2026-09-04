# KORIEPAY CUSTOMER BANKING PORTAL — SECURITY & MOBILE UX ARCHITECTURE

## 1. Zero-Trust Customer Security Model
- **Masked Data Protection**: BVN (`223****891`), NIN, and card PANs (`4111 •••• •••• 4281`) masked across all screens.
- **PIN & Biometric Governance**: Every transfer and bill payment requires explicit 4-digit PIN verification or FaceID biometric authorization.
- **Session Telemetry & Remote Revocation**: Customers can inspect active device signatures (IP geolocation, browser type) and terminate non-primary sessions with one click.
- **Double-Submission Protection**: Dynamic button locks, idempotency keys, and request state tracking prevent duplicate debits on mobile double-taps.

## 2. Mobile-First UX & Accessibility Standards
- **Viewport Support**: Flawless responsive layout across 320px, 375px, 390px, 414px, 768px, 1024px, 1440px, and 1920px.
- **Touch Target Minimums**: 48px+ for bottom navigation, keypad numbers, and primary call-to-action buttons.
- **One-Hand Usability**: Primary bottom navigation bar (`Home`, `Transfers`, `Bills`, `Activity`, `More`) with safe-area bottom inset padding.
- **Visual Reassurance**: State-driven status badges (`● SUCCESSFUL`, `● PENDING`, `● FAILED`), high-contrast glassmorphic surfaces, and contextual offline warnings.
