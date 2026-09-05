import type { VerificationState, VerificationStepStatus } from "@/lib/customer/CustomerVerification";

/**
 * src/lib/customer/verificationLabels.ts
 *
 * Every label the KYC screen shows is chosen by looking a *value* up in a
 * dictionary, so the code has to translate engine enums into locale keys.
 * Doing that with a template string (`t(\`verification.state.${state}\`)`) was
 * how three separate raw-key leaks reached the screen at once: the engine's
 * values are `NOT_STARTED`/`COMPLETED`/`NATIONAL_ID`, the dictionary's keys are
 * `notStarted`/`complete`/`nationalId`, and a missing key in this app renders
 * the key itself, in front of the customer, in all three languages.
 *
 * These maps are the only allowed bridge:
 *
 *   • they are `Record<Union, string>`, so TypeScript errors when someone adds
 *     a state to `VerificationState` and forgets a label — the failure moves
 *     from "a customer sees `verification.state.RETRY_REQUIRED`" to "the build
 *     stops";
 *   • the `…For` helpers never return a missing key: an unrecognised value from
 *     a newer server falls back to the honest "not available" / "supporting
 *     document" / "in review" label instead of leaking internals. Falling back
 *     to `review` for an unknown document status is deliberate — an unknown
 *     state must never be rendered as "Verified".
 *
 * Key names are the dictionary's (camelCase), values are the engine's.
 */

const STATE_KEY: Record<VerificationState, string> = {
  NOT_STARTED: "verification.state.notStarted",
  IN_PROGRESS: "verification.state.inProgress",
  ACTION_REQUIRED: "verification.state.action",
  SUBMITTED: "verification.state.submitted",
  UNDER_REVIEW: "verification.state.review",
  VERIFIED: "verification.state.verified",
  REJECTED: "verification.state.rejected",
  EXPIRED: "verification.state.expired",
  RETRY_REQUIRED: "verification.state.retryRequired",
};

const STEP_STATUS_KEY: Record<VerificationStepStatus, string> = {
  COMPLETED: "verification.stepStatus.complete",
  NOT_STARTED: "verification.stepStatus.notStarted",
  IN_PROGRESS: "verification.stepStatus.inProgress",
  SUBMITTED: "verification.stepStatus.submitted",
  ACTION_REQUIRED: "verification.stepStatus.actionRequired",
  UNAVAILABLE: "verification.stepStatus.na",
};

/**
 * Document types accepted by the verification endpoint
 * (`ALLOWED_TYPES` in app/api/customer/portal/verification/route.ts). Typed as
 * a plain record: that list belongs to the upload route, and this module must
 * not import a route module into a client bundle.
 */
const DOCUMENT_TYPE_KEY: Record<string, string> = {
  PASSPORT: "verification.doc.passport",
  NATIONAL_ID: "verification.doc.nationalId",
  DRIVERS_LICENSE: "verification.doc.driversLicense",
  CAC_CERTIFICATE: "verification.doc.business",
  UTILITY_BILL: "verification.doc.utilityBill",
  TAX_CLEARANCE: "verification.doc.taxClearance",
};

/** `identityEngine` document status → label. */
const DOCUMENT_STATUS_KEY: Record<string, string> = {
  VERIFIED: "verification.docStatus.verified",
  PENDING: "verification.docStatus.review",
  REJECTED: "verification.docStatus.rejected",
  EXPIRED: "verification.docStatus.expired",
  STORED: "verification.docStatus.stored",
};

export function verificationStateKeyFor(state: string): string {
  return STATE_KEY[state as VerificationState] ?? "verification.state.na";
}

export function verificationStepStatusKeyFor(status: string): string {
  return STEP_STATUS_KEY[status as VerificationStepStatus] ?? "verification.stepStatus.na";
}

export function documentTypeKeyFor(documentType: string): string {
  return DOCUMENT_TYPE_KEY[documentType] ?? "verification.doc.other";
}

export function documentStatusKeyFor(status: string): string {
  return DOCUMENT_STATUS_KEY[status] ?? "verification.docStatus.review";
}
