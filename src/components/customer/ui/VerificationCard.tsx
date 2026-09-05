"use client";

import React from "react";
import Link from "next/link";
import { BadgeCheck, ChevronRight, Clock3, ShieldAlert } from "lucide-react";
import { useCustomer } from "../CustomerContext";
import { VerificationCardSkeleton } from "./KoriePaySkeletons";

/**
 * VerificationCard — the Home-screen verification prompt (directive §33).
 *
 * Behaviour the previous screen got wrong, in order of how much it cost:
 *
 *   1. **A verified customer must not be asked to verify.** The card returns
 *      `null` on `VERIFIED`. Not "greyed out" — absent. §33 says so explicitly,
 *      and a permanent yellow banner that no longer applies teaches customers to
 *      ignore the banners that do.
 *   2. **The tone follows the real state**, from `customer.kycStatus` (the
 *      portal's own engine value), not from a progress percentage invented from
 *      how many local `useState` flags happen to be true.
 *   3. **No step count.** The authoritative step list (`deriveVerificationSummary`)
 *      lives behind the KYC route, so "2 steps remaining" on Home would be a
 *      guess about a number the dashboard does not have. The card says what is
 *      true — attention needed, or in review — and the count appears once the
 *      customer opens the page that reads it.
 *
 * `PENDING` reads as "under review" (calm, brand tint) and `REJECTED` as
 * "needs attention" (danger tint, `role="status"` so a screen reader is told).
 * `UNVERIFIED` is the invitation. All three land on `/customer/kyc`.
 */
export const VerificationCard: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { customer, portalPhase, t } = useCustomer();

  if (!customer) return <VerificationCardSkeleton className={className} />;
  if (customer.kycStatus === "VERIFIED") return null;
  if (portalPhase === "loading") return <VerificationCardSkeleton className={className} />;

  const variant = VARIANTS[customer.kycStatus] ?? VARIANTS.UNVERIFIED;
  const Icon = variant.icon;

  return (
    <Link
      href="/customer/kyc"
      className={`group flex items-center gap-3 rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${variant.shell} ${className}`}
      role="status"
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${variant.badge}`} aria-hidden="true">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[var(--foreground)]">{t(variant.titleKey)}</span>
        <span className="mt-0.5 block text-xs text-[var(--foreground-muted)]">{t(variant.bodyKey)}</span>
      </span>
      <span className="shrink-0 rounded-lg bg-[var(--surface-3)] px-2 py-1 font-mono text-[10px] font-bold uppercase text-[var(--foreground-muted)]">
        {customer.kycTier.replace("_", " ")}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--foreground-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      <span className="sr-only">{t("customer.dashboard.verificationCta")}</span>
    </Link>
  );
};

const VARIANTS: Record<
  string,
  { titleKey: string; bodyKey: string; shell: string; badge: string; icon: typeof ShieldAlert }
> = {
  UNVERIFIED: {
    titleKey: "customer.dashboard.verificationUnverifiedTitle",
    bodyKey: "customer.dashboard.verificationUnverifiedBody",
    shell: "border-[var(--brand-border)] bg-[var(--brand-soft)]/70 hover:bg-[var(--brand-soft-strong)]",
    badge: "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]",
    icon: ShieldAlert,
  },
  PENDING: {
    titleKey: "customer.dashboard.verificationPendingTitle",
    bodyKey: "customer.dashboard.verificationPendingBody",
    shell: "border-[var(--border)] bg-[var(--surface)]",
    badge: "bg-[var(--surface-3)] text-[var(--foreground-muted)]",
    icon: Clock3,
  },
  REJECTED: {
    titleKey: "customer.dashboard.verificationRejectedTitle",
    bodyKey: "customer.dashboard.verificationRejectedBody",
    shell: "border-[var(--danger-soft)] bg-[var(--danger-soft)]/45",
    badge: "bg-[var(--danger-soft)] text-[var(--danger)]",
    icon: ShieldAlert,
  },
  VERIFIED: {
    titleKey: "customer.dashboard.verificationVerifiedTitle",
    bodyKey: "customer.dashboard.verificationVerifiedBody",
    shell: "border-[var(--brand-border)] bg-[var(--brand-soft)]",
    badge: "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]",
    icon: BadgeCheck,
  },
};

export default VerificationCard;
