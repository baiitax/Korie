/**
 * KoriePay — Customer Verification (KYC) state, derived from real records
 * =======================================================================
 * The brief is explicit: never render `verified = true` without knowing the
 * actual verification state, and never invent a progress percentage without a
 * backend basis. This module therefore derives everything from records that
 * already exist:
 *
 *   CustomerLifecycleEngine  → kycTier, profile completeness (dob, address)
 *   MasterIdentityEngine     → identityReference, kycStatus, riskLevel
 *   DocumentVaultEngine      → documents actually registered for the identity
 *
 * and nothing else. No random numbers, no simulated review timers.
 *
 * ── Known product gap (deliberately documented, not hidden) ──────────────────
 * The customer master has no `phoneVerifiedAt` / `emailVerifiedAt` timestamps,
 * so contact verification cannot be reported as completed from a real signal.
 * Until those columns exist, the checklist marks phone/email as
 * `NOT_STARTED` when a verification step is genuinely required, and the route
 * says so. Fabricating a green tick is worse than an honest open circle.
 */

import { CustomerRecord } from "@/types/customerProductFactory";
import { DocumentVaultEngine } from "@/lib/identity/DocumentVaultEngine";
import { IdentityDocumentRecord } from "@/types/identityEngine";
import { MasterIdentityEngine } from "@/lib/identity/MasterIdentityEngine";
import { PersonMasterRecord } from "@/types/identityEngine";

export type VerificationState =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ACTION_REQUIRED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED"
  | "RETRY_REQUIRED";

export type VerificationStepStatus =
  | "COMPLETED"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  /** Sent to the vault/back office, not yet decided. */
  | "SUBMITTED"
  | "ACTION_REQUIRED"
  /** No authoritative signal exists for this step yet. */
  | "UNAVAILABLE";

export interface VerificationStep {
  id:
    | "phone"
    | "email"
    | "personal_information"
    | "date_of_birth"
    | "address"
    | "identity_document"
    | "final_review";
  status: VerificationStepStatus;
  /** Why the customer is being asked — short, non-technical, i18n key. */
  reasonKey: string;
  /** True when the requirement applies at the customer's current tier. */
  required: boolean;
  /** Backend cannot yet answer this — rendered as "unavailable", never as done. */
  blocked?: boolean;
}

export interface VerificationSummary {
  state: VerificationState;
  tier: CustomerRecord["kycTier"];
  steps: VerificationStep[];
  completedCount: number;
  requiredCount: number;
  /** Only ever a count of real steps — never a percentage invented in the UI. */
  remainingCount: number;
  /** Message key for the action centre; null when nothing is needed. */
  actionKey: string | null;
  /** Documents currently held in the vault for this identity (safe subset). */
  documents: {
    documentType: string;
    status: string;
    uploadedAt: string;
    expiresAt?: string;
    /** Masked identifier only — never a storage URL or file reference. */
    numberMasked?: string;
  }[];
  /** True when the customer may upload (no submission is under review). */
  canSubmitDocument: boolean;
  /** Server clock for "updated on" text. */
  generatedAt: string;
}

const TIER_REQUIREMENTS: Record<
  CustomerRecord["kycTier"],
  { identityDocument: boolean; address: boolean; dateOfBirth: boolean }
> = {
  TIER_1: { identityDocument: false, address: false, dateOfBirth: true },
  TIER_2: { identityDocument: true, address: true, dateOfBirth: true },
  TIER_3: { identityDocument: true, address: true, dateOfBirth: true },
};

/** A revoked or expired document cannot support a verified state. */
function isLive(doc: IdentityDocumentRecord, now: number): boolean {
  if (doc.verificationStatus === "REJECTED") return false;
  if (!doc.expiresAt) return true;
  return new Date(doc.expiresAt).getTime() > now;
}

export function documentsForCustomer(customer: CustomerRecord): IdentityDocumentRecord[] {
  const identityId = customer.identityRecordId;
  if (!identityId) return [];
  return DocumentVaultEngine.getDocumentsForIdentity(identityId);
}

/**
 * Customer status → verification state.
 * `kycStatus` on CustomerUser is presentation-only; the engine record is the
 * authority, and the document vault decides whether an identity document backs
 * the tier claim.
 */
export function deriveVerificationSummary(
  customer: CustomerRecord,
  now: Date = new Date(),
): VerificationSummary {
  const needs = TIER_REQUIREMENTS[customer.kycTier] ?? TIER_REQUIREMENTS.TIER_2;
  const docs = documentsForCustomer(customer);
  const liveDocs = docs.filter((d) => isLive(d, now.getTime()));
  const hasIdentityDoc = liveDocs.some((d) => d.verificationStatus === "VERIFIED");
  const hasSubmittedDoc = liveDocs.length > 0;
  const identity = customer.identityRecordId
    ? MasterIdentityEngine.getPerson(customer.identityRecordId)
    : undefined;

  const state = deriveState(customer, docs, liveDocs, hasIdentityDoc, identity, now);
  const rejected = state === "REJECTED" || state === "RETRY_REQUIRED" || state === "EXPIRED";

  const steps: VerificationStep[] = [
    {
      id: "phone",
      // No verifiedAt signal exists on the customer master → cannot claim done.
      status: "UNAVAILABLE",
      reasonKey: "verification.reason.phone",
      required: true,
      blocked: true,
    },
    {
      id: "email",
      status: "UNAVAILABLE",
      reasonKey: "verification.reason.email",
      required: false,
      blocked: true,
    },
    {
      id: "personal_information",
      status: customer.fullName && customer.email && customer.phone ? "COMPLETED" : "ACTION_REQUIRED",
      reasonKey: "verification.reason.personal",
      required: true,
    },
    {
      id: "date_of_birth",
      status: needs.dateOfBirth
        ? customer.dateOfBirth
          ? "COMPLETED"
          : "ACTION_REQUIRED"
        : "COMPLETED",
      reasonKey: "verification.reason.dob",
      required: needs.dateOfBirth,
    },
    {
      id: "address",
      status: needs.address
        ? customer.residentialAddress
          ? "COMPLETED"
          : "ACTION_REQUIRED"
        : "COMPLETED",
      reasonKey: "verification.reason.address",
      required: needs.address,
    },
    {
      id: "identity_document",
      status: !needs.identityDocument
        ? "COMPLETED"
        : hasIdentityDoc
          ? "COMPLETED"
          : hasSubmittedDoc
            ? "SUBMITTED"
            : rejected
              ? "ACTION_REQUIRED"
              : "NOT_STARTED",
      reasonKey: "verification.reason.document",
      required: needs.identityDocument,
    },
    {
      id: "final_review",
      status:
        state === "VERIFIED"
          ? "COMPLETED"
          : state === "UNDER_REVIEW" || state === "SUBMITTED"
            ? "IN_PROGRESS"
            : "NOT_STARTED",
      reasonKey: "verification.reason.review",
      required: true,
    },
  ];

  const required = steps.filter((s) => s.required && s.status !== "UNAVAILABLE");
  const completed = required.filter((s) => s.status === "COMPLETED");
  const missing = required.filter((s) => s.status !== "COMPLETED");

  return {
    state,
    tier: customer.kycTier,
    steps,
    completedCount: completed.length,
    requiredCount: required.length,
    remainingCount: missing.length,
    actionKey: missing.length ? `verification.action.${missing[0].id}` : null,
    documents: liveDocs.map((d) => ({
      documentType: d.documentType,
      status: d.verificationStatus,
      uploadedAt: d.uploadedAt,
      expiresAt: d.expiresAt,
      // Masked identifier only. Never storagePathEncrypted, never a file URL,
      // never the sha256 — those are internal and would enable enumeration.
      numberMasked: d.documentNumberMasked,
    })),
    canSubmitDocument: state !== "UNDER_REVIEW" && state !== "SUBMITTED",
    generatedAt: now.toISOString(),
  };
}

function deriveState(
  customer: CustomerRecord,
  docs: IdentityDocumentRecord[],
  liveDocs: IdentityDocumentRecord[],
  hasVerifiedDoc: boolean,
  identity: PersonMasterRecord | undefined,
  now: Date,
): VerificationState {
  const nowMs = now.getTime();

  // Account-level blocks outrank everything: a locked/closed profile is not a
  // verification problem, and the UI must not offer "retry" on it.
  if (identity && ["LOCKED", "CLOSED", "DEACTIVATED", "DUPLICATE"].includes(identity.identityStatus)) {
    return "ACTION_REQUIRED";
  }

  if (identity?.kycStatus === "REJECTED") return "REJECTED";
  if (identity?.kycStatus === "EXPIRED") return "EXPIRED";
  if (docs.length > 0 && liveDocs.length === 0) return "EXPIRED";
  if (docs.some((d) => d.verificationStatus === "REJECTED")) return "RETRY_REQUIRED";

  const needsDoc = (TIER_REQUIREMENTS[customer.kycTier] ?? TIER_REQUIREMENTS.TIER_2).identityDocument;

  if (!needsDoc) {
    return customer.dateOfBirth && customer.residentialAddress ? "VERIFIED" : "IN_PROGRESS";
  }
  if (hasVerifiedDoc) {
    // A verified document alone is not a verified customer; the identity
    // record still has to say so. Until it does, say UNDER_REVIEW.
    return identity?.kycStatus === "VERIFIED" ? "VERIFIED" : "UNDER_REVIEW";
  }
  if (liveDocs.length > 0) {
    return identity?.kycStatus === "UNDER_REVIEW" || identity?.kycStatus === "SUBMITTED"
      ? "UNDER_REVIEW"
      : "SUBMITTED";
  }
  if (identity?.kycStatus === "IN_PROGRESS") return "IN_PROGRESS";
  return "NOT_STARTED";
}

/* ------------------------------------------------------------------ limits */

export interface TierCapability {
  dailyTransferLimitMajor: number;
  maxBalanceMajor: number | null;
  /** Features unlocked at this tier — mirrors what the backend enforces. */
  unlocked: string[];
}

/**
 * Limits are read from the customer's product configuration, not typed into a
 * component. Values below mirror the seeded premium accounts; in production
 * `BankingProductFactory` supplies them per product code.
 */
export const TIER_CAPABILITIES: Record<CustomerRecord["kycTier"], TierCapability> = {
  TIER_1: { dailyTransferLimitMajor: 100000, maxBalanceMajor: 300000, unlocked: ["receive", "send_domestic"] },
  TIER_2: { dailyTransferLimitMajor: 5000000, maxBalanceMajor: null, unlocked: ["receive", "send_domestic", "send_cross_border"] },
  TIER_3: { dailyTransferLimitMajor: 20000000, maxBalanceMajor: null, unlocked: ["receive", "send_domestic", "send_cross_border", "bulk"] },
};
