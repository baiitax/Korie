/**
 * src/lib/customer/identifierVerification.ts
 *
 * BVN/NIN (Nigeria) and NIF/NNI (Niger) capture, derived from and written to
 * public.customer_verification_status — see migration
 * 20260908000043_customer_identifier_verification.sql.
 *
 * KoriePay has no live integration with NIBSS (BVN) or NIMC (NIN) — there is
 * no real-time verification API to call. Matching the customer-transfers
 * "honest pending provider" pattern used elsewhere in this codebase, a
 * captured identifier is stored as PENDING and surfaced to compliance/admin
 * for manual confirmation; it is never auto-marked VERIFIED. This is the
 * honest state given the actual backend: KoriePay can confirm the customer
 * *submitted* a well-formed identifier, not that NIBSS/NIMC confirmed it
 * belongs to them.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { encryptIdentifier, maskIdentifier, isValidElevenDigitId } from "@/lib/security/identifierCrypto";
import { CustomerRow } from "@/lib/customer/customerData";

export type IdentifierType = "BVN" | "NIN" | "NIF" | "NNI";
export type IdentifierVerificationStatus = "PENDING" | "VERIFIED" | "FAILED" | "MANUAL_REVIEW";

export interface IdentifierRecord {
  id: string;
  id_type: IdentifierType;
  id_number_masked: string;
  verification_source: string;
  verification_status: IdentifierVerificationStatus;
  verification_reference: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Which identifier types apply for a customer's country, per CBN / BCEAO. */
export function identifierTypesForCountry(country: CustomerRow["country"]): IdentifierType[] {
  return country === "NG" ? ["BVN", "NIN"] : ["NIF", "NNI"];
}

/**
 * CBN's December 2023 directive: Tier 1 needs BVN *or* NIN; Tier 2 and Tier 3
 * both require both identifiers linked. BCEAO Art. 27 requires identification
 * against an official document before any e-money account opens, which
 * KoriePay treats as requiring at least one Niger identifier (NIF or NNI) at
 * every tier above TIER_0.
 */
export function identifierRequirementForTier(
  country: CustomerRow["country"],
  tier: CustomerRow["kyc_tier"],
): { required: IdentifierType[]; requireAll: boolean } {
  if (country === "NG") {
    if (tier === "TIER_0") return { required: [], requireAll: false };
    if (tier === "TIER_1") return { required: ["BVN", "NIN"], requireAll: false }; // either one
    return { required: ["BVN", "NIN"], requireAll: true }; // TIER_2 / TIER_3: both
  }
  if (tier === "TIER_0") return { required: [], requireAll: false };
  return { required: ["NIF", "NNI"], requireAll: false }; // either one, all tiers above 0
}

export async function getIdentifiersForCustomer(customerId: string): Promise<IdentifierRecord[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_verification_status")
    .select("id, id_type, id_number_masked, verification_source, verification_status, verification_reference, rejection_reason, verified_at, created_at, updated_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as IdentifierRecord[];
}

/** True once the tier's identifier requirement is satisfied by live rows (PENDING counts as "submitted", not "verified"). */
export function identifierRequirementSatisfied(
  requirement: { required: IdentifierType[]; requireAll: boolean },
  records: IdentifierRecord[],
  statuses: IdentifierVerificationStatus[] = ["PENDING", "VERIFIED", "MANUAL_REVIEW"],
): boolean {
  if (requirement.required.length === 0) return true;
  const submitted = new Set(records.filter((r) => statuses.includes(r.verification_status)).map((r) => r.id_type));
  return requirement.requireAll
    ? requirement.required.every((t) => submitted.has(t))
    : requirement.required.some((t) => submitted.has(t));
}

export interface CaptureResult {
  ok: true;
  record: IdentifierRecord;
}
export interface CaptureError {
  ok: false;
  code: string;
  message: string;
}

/**
 * Captures a new identifier for a customer. Rejects malformed numbers before
 * ever touching the database or the encryption key, so a typo never gets
 * encrypted and stored. A customer with an existing PENDING/VERIFIED/
 * MANUAL_REVIEW row of the same type must wait for that decision — the
 * database enforces this with a partial unique index, but this checks first
 * so the error message can be specific instead of a generic constraint
 * violation.
 */
export async function captureIdentifier(
  customerId: string,
  idType: IdentifierType,
  rawValue: string,
): Promise<CaptureResult | CaptureError> {
  const trimmed = rawValue.trim();
  if (!isValidElevenDigitId(trimmed)) {
    return { ok: false, code: "INVALID_IDENTIFIER_FORMAT", message: `${idType} must be exactly 11 digits.` };
  }

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from("customer_verification_status")
    .select("id, verification_status")
    .eq("customer_id", customerId)
    .eq("id_type", idType)
    .in("verification_status", ["PENDING", "VERIFIED", "MANUAL_REVIEW"])
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      code: "IDENTIFIER_ALREADY_SUBMITTED",
      message:
        existing.verification_status === "VERIFIED"
          ? `Your ${idType} is already verified.`
          : `Your ${idType} is already under review. You'll be notified when a decision is made.`,
    };
  }

  const source = idType === "BVN" ? "NIBSS_MANUAL_INTAKE" : idType === "NIN" ? "NIMC_MANUAL_INTAKE" : "CENTIF_NE_MANUAL_INTAKE";
  const { data: inserted, error } = await admin
    .from("customer_verification_status")
    .insert({
      customer_id: customerId,
      id_type: idType,
      id_number_encrypted: encryptIdentifier(trimmed),
      id_number_masked: maskIdentifier(trimmed),
      verification_source: source,
      verification_status: "PENDING",
    })
    .select("id, id_type, id_number_masked, verification_source, verification_status, verification_reference, rejection_reason, verified_at, created_at, updated_at")
    .single();

  if (error || !inserted) {
    return { ok: false, code: "IDENTIFIER_CAPTURE_FAILED", message: "We couldn't record that identifier. Please try again." };
  }
  return { ok: true, record: inserted as IdentifierRecord };
}
