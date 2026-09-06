/**
 * KoriePay — Customer Verification (KYC), derived from real DB rows
 * ===================================================================
 * Replaces the in-memory CustomerLifecycleEngine / MasterIdentityEngine /
 * DocumentVaultEngine chain with the genuine sources of truth:
 *
 *   public.customers               → kyc_tier, date_of_birth, residential_address, status
 *   public.customer_kyc_documents  → documents actually uploaded for this customer
 *
 * Nothing here invents a percentage or a status the backend cannot support.
 * The customer master still has no phone_verified_at / email_verified_at
 * column, so those two steps are honestly reported as UNAVAILABLE — this is
 * a documented, deliberate product gap, not an oversight.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { CustomerRow } from "@/lib/customer/customerData";

export type VerificationState =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ACTION_REQUIRED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "RETRY_REQUIRED";

export type VerificationStepStatus =
  | "COMPLETED"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "ACTION_REQUIRED"
  | "UNAVAILABLE";

export interface VerificationStep {
  id: "phone" | "email" | "personal_information" | "date_of_birth" | "address" | "identity_document" | "final_review";
  status: VerificationStepStatus;
  reasonKey: string;
  required: boolean;
  blocked?: boolean;
}

export interface KycDocumentRow {
  id: string;
  customer_id: string;
  document_type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  original_filename: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
}

export interface VerificationSummary {
  state: VerificationState;
  tier: CustomerRow["kyc_tier"];
  steps: VerificationStep[];
  completedCount: number;
  requiredCount: number;
  remainingCount: number;
  actionKey: string | null;
  documents: {
    id: string;
    documentType: string;
    status: string;
    uploadedAt: string;
    expiresAt?: string;
    rejectionReason?: string;
  }[];
  canSubmitDocument: boolean;
  generatedAt: string;
}

const TIER_REQUIREMENTS: Record<CustomerRow["kyc_tier"], { identityDocument: boolean; address: boolean; dateOfBirth: boolean }> = {
  TIER_0: { identityDocument: false, address: false, dateOfBirth: false },
  TIER_1: { identityDocument: false, address: false, dateOfBirth: true },
  TIER_2: { identityDocument: true, address: true, dateOfBirth: true },
  TIER_3: { identityDocument: true, address: true, dateOfBirth: true },
};

export interface TierCapability {
  dailyTransferLimitMajor: number;
  maxBalanceMajor: number | null;
  unlocked: string[];
}

/** Mirrors what post_customer_transfer / wallets.daily_limit actually enforce. */
export const TIER_CAPABILITIES: Record<CustomerRow["kyc_tier"], TierCapability> = {
  TIER_0: { dailyTransferLimitMajor: 0, maxBalanceMajor: 0, unlocked: [] },
  TIER_1: { dailyTransferLimitMajor: 100000, maxBalanceMajor: 300000, unlocked: ["receive", "send_domestic"] },
  TIER_2: { dailyTransferLimitMajor: 5000000, maxBalanceMajor: null, unlocked: ["receive", "send_domestic", "send_cross_border"] },
  TIER_3: { dailyTransferLimitMajor: 20000000, maxBalanceMajor: null, unlocked: ["receive", "send_domestic", "send_cross_border", "bulk"] },
};

export async function getKycDocumentsForCustomer(customerId: string): Promise<KycDocumentRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_kyc_documents")
    .select("id, customer_id, document_type, status, original_filename, uploaded_at, reviewed_at, rejection_reason, expires_at")
    .eq("customer_id", customerId)
    .order("uploaded_at", { ascending: false });
  if (error || !data) return [];
  return data as KycDocumentRow[];
}

function isLive(doc: KycDocumentRow, now: number): boolean {
  if (doc.status === "REJECTED") return false;
  if (!doc.expires_at) return true;
  return new Date(doc.expires_at).getTime() > now;
}

export function deriveVerificationSummary(
  customer: CustomerRow,
  documents: KycDocumentRow[],
  now: Date = new Date(),
): VerificationSummary {
  const needs = TIER_REQUIREMENTS[customer.kyc_tier] ?? TIER_REQUIREMENTS.TIER_2;
  const liveDocs = documents.filter((d) => isLive(d, now.getTime()));
  const hasApprovedDoc = liveDocs.some((d) => d.status === "APPROVED");
  const hasSubmittedDoc = liveDocs.some((d) => d.status === "PENDING");
  const rejectedDoc = documents.some((d) => d.status === "REJECTED");

  let state: VerificationState;
  if (customer.status !== "ACTIVE") {
    state = "ACTION_REQUIRED";
  } else if (needs.identityDocument) {
    if (hasApprovedDoc) state = "VERIFIED";
    else if (hasSubmittedDoc) state = "SUBMITTED";
    else if (rejectedDoc) state = "RETRY_REQUIRED";
    else state = "NOT_STARTED";
  } else {
    state = customer.date_of_birth ? "VERIFIED" : "IN_PROGRESS";
  }

  const steps: VerificationStep[] = [
    { id: "phone", status: "UNAVAILABLE", reasonKey: "verification.reason.phone", required: true, blocked: true },
    { id: "email", status: "UNAVAILABLE", reasonKey: "verification.reason.email", required: false, blocked: true },
    {
      id: "personal_information",
      status: customer.first_name && customer.last_name && customer.email && customer.phone ? "COMPLETED" : "ACTION_REQUIRED",
      reasonKey: "verification.reason.personal",
      required: true,
    },
    {
      id: "date_of_birth",
      status: needs.dateOfBirth ? (customer.date_of_birth ? "COMPLETED" : "ACTION_REQUIRED") : "COMPLETED",
      reasonKey: "verification.reason.dob",
      required: needs.dateOfBirth,
    },
    {
      id: "address",
      status: needs.address ? (customer.residential_address ? "COMPLETED" : "ACTION_REQUIRED") : "COMPLETED",
      reasonKey: "verification.reason.address",
      required: needs.address,
    },
    {
      id: "identity_document",
      status: !needs.identityDocument
        ? "COMPLETED"
        : hasApprovedDoc
          ? "COMPLETED"
          : hasSubmittedDoc
            ? "SUBMITTED"
            : rejectedDoc
              ? "ACTION_REQUIRED"
              : "NOT_STARTED",
      reasonKey: "verification.reason.document",
      required: needs.identityDocument,
    },
    {
      id: "final_review",
      status: state === "VERIFIED" ? "COMPLETED" : state === "SUBMITTED" ? "IN_PROGRESS" : "NOT_STARTED",
      reasonKey: "verification.reason.review",
      required: true,
    },
  ];

  const required = steps.filter((s) => s.required && s.status !== "UNAVAILABLE");
  const completed = required.filter((s) => s.status === "COMPLETED");
  const missing = required.filter((s) => s.status !== "COMPLETED");
  const ACTION_VERB: Partial<Record<VerificationStep["id"], "upload" | "continue">> = {
    identity_document: "upload",
    address: "upload",
  };

  return {
    state,
    tier: customer.kyc_tier,
    steps,
    completedCount: completed.length,
    requiredCount: required.length,
    remainingCount: missing.length,
    actionKey: missing.length ? `verification.action.${ACTION_VERB[missing[0].id] ?? "continue"}` : null,
    documents: liveDocs.map((d) => ({
      id: d.id,
      documentType: d.document_type,
      status: d.status,
      uploadedAt: d.uploaded_at,
      expiresAt: d.expires_at || undefined,
      rejectionReason: d.status === "REJECTED" ? d.rejection_reason || undefined : undefined,
    })),
    canSubmitDocument: state !== "SUBMITTED",
    generatedAt: now.toISOString(),
  };
}
