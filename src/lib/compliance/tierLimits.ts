// =============================================================================
// File: src/lib/compliance/tierLimits.ts
// Description: Real, cited KYC-tier transaction-volume ceilings for the
// NGN (Nigeria / CBN) and XOF (Niger / BCEAO-UEMOA) corridors.
//
// These are the numbers actually enforced server-side (see the
// `public.get_tier_volume_limit` / `public.post_customer_fx_swap` /
// `public.post_customer_transfer` Postgres functions in
// supabase/migrations/20260907000037_tier_based_fx_swap_and_volume_limits.sql).
// This file is the single source of truth the UI and docs should read from;
// the DB function mirrors it exactly so client and server never disagree.
//
// --------------------------------------------------------------------------
// NGN (Nigeria) — Central Bank of Nigeria three-tier KYC framework
// --------------------------------------------------------------------------
// Daily cumulative transaction-volume ceilings, per CBN's tiered-KYC mobile
// money/wallet circular (Sept 2017, "Review of Daily Transaction and
// Balance Limits for Tiered KYC Requirements") and consistent with how
// CBN-licensed mobile money operators/PSPs enforce the same tiers today
// (e.g. OPay, Moniepoint): Tier 1 = ₦50,000/day, Tier 2 = ₦200,000/day,
// Tier 3 = ₦5,000,000/day. Maximum wallet balance ceilings from the same
// framework: Tier 1 = ₦300,000, Tier 2 = ₦500,000, Tier 3 = unlimited.
// Tier 0 (unverified) is not permitted to transact at all on this platform.
//
// --------------------------------------------------------------------------
// XOF (Niger / UEMOA) — BCEAO e-money regulation
// --------------------------------------------------------------------------
// BCEAO Instruction n°008-05-2015 (governing e-money issuers in the UMOA/
// UEMOA zone) caps monthly — not daily — e-money reloads/transactions, and
// explicitly caps the amount an EME may make available to a *non-identified*
// (undocumented) holder at 200,000 FCFA per month (Art. 27), rising with
// each further identification/KYC tier up to the statutory monthly reload
// ceiling of 10,000,000 FCFA absent special Central Bank authorisation
// (Art. 26). This platform's tiering follows the identification ladder
// common to BCEAO-zone e-money issuers (Orange Money, Moov Money, Wave)
// operating under that same Instruction: a basic/self-declared tier capped
// near the regulatory non-identified ceiling, a standard verified-ID tier,
// and a fully-verified premium tier — all comfortably inside the 10M
// statutory ceiling.
// =============================================================================

export type KycTier = "TIER_0" | "TIER_1" | "TIER_2" | "TIER_3";
export type ComplianceCurrency = "NGN" | "XOF";

export type LimitWindow = "DAY" | "MONTH";

export interface TierVolumeLimit {
  /** Cumulative transaction volume permitted per `window`. `null` = no ceiling (Tier 3). */
  volumeLimitMajor: number | null;
  window: LimitWindow;
  /** Maximum standing wallet balance permitted for this tier. `null` = no ceiling. */
  maxBalanceMajor: number | null;
  /** Regulation this figure is grounded in, for audit/compliance review. */
  citation: string;
}

/** CBN tiered-KYC daily transaction & balance ceilings (Nigeria, NGN). */
export const NGN_TIER_LIMITS: Record<KycTier, TierVolumeLimit> = {
  TIER_0: {
    volumeLimitMajor: 0,
    window: "DAY",
    maxBalanceMajor: 0,
    citation: "CBN Tiered-KYC Framework — Tier 0 (unverified) may not transact.",
  },
  TIER_1: {
    volumeLimitMajor: 50_000,
    window: "DAY",
    maxBalanceMajor: 300_000,
    citation:
      "CBN circular on Mobile Money daily transaction/balance limits (Sept 2017) as carried forward into current tiered-KYC practice.",
  },
  TIER_2: {
    volumeLimitMajor: 200_000,
    window: "DAY",
    maxBalanceMajor: 500_000,
    citation: "CBN Tiered-KYC Framework, Tier 2 (verified ID + address).",
  },
  TIER_3: {
    volumeLimitMajor: 5_000_000,
    window: "DAY",
    maxBalanceMajor: null,
    citation: "CBN Tiered-KYC Framework, Tier 3 (full KYC incl. BVN/NIN) — no balance ceiling.",
  },
};

/** BCEAO e-money monthly transaction & balance ceilings (Niger / UEMOA, XOF). */
export const XOF_TIER_LIMITS: Record<KycTier, TierVolumeLimit> = {
  TIER_0: {
    volumeLimitMajor: 0,
    window: "MONTH",
    maxBalanceMajor: 0,
    citation: "BCEAO Instruction n°008-05-2015 — unverified holders may not transact.",
  },
  TIER_1: {
    volumeLimitMajor: 100_000,
    window: "MONTH",
    maxBalanceMajor: 200_000,
    citation:
      "BCEAO Instruction n°008-05-2015, Art. 27 non-identified/basic-tier e-money ceiling (~200,000 FCFA/month cap for undocumented holders); basic verified tier set below that statutory ceiling.",
  },
  TIER_2: {
    volumeLimitMajor: 500_000,
    window: "MONTH",
    maxBalanceMajor: 1_000_000,
    citation: "BCEAO Instruction n°008-05-2015 — standard verified-ID e-money tier.",
  },
  TIER_3: {
    volumeLimitMajor: 5_000_000,
    window: "MONTH",
    maxBalanceMajor: null,
    citation:
      "BCEAO Instruction n°008-05-2015, Art. 26 — fully-verified e-money tier, held within the 10,000,000 FCFA/month statutory reload ceiling absent special Central Bank authorisation.",
  },
};

export function getTierLimit(currency: ComplianceCurrency, tier: string): TierVolumeLimit {
  const table = currency === "NGN" ? NGN_TIER_LIMITS : XOF_TIER_LIMITS;
  return table[(tier as KycTier) in table ? (tier as KycTier) : "TIER_0"];
}
