import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { CustomerLifecycleEngine } from "@/lib/customer/CustomerLifecycleEngine";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";
import { deriveVerificationSummary } from "@/lib/customer/CustomerVerification";
import { DocumentVaultEngine } from "@/lib/identity/DocumentVaultEngine";
import crypto from "node:crypto";

/**
 * /api/customer/portal/verification
 *
 * The customer's verification truth: which steps are actually satisfied, which
 * remain, and what the customer may do right now. Derived from the customer
 * master + identity record + document vault (see CustomerVerification) so the
 * UI can stop asserting `kycStatus === "VERIFIED"` from an *account* status.
 *
 * POST registers a submitted document in the vault. It does NOT approve
 * anything: the vault record stays `PENDING` until a back-office reviewer or a
 * provider callback changes it. The old portal flow set a local
 * `uploadSuccess` flag after a 1200 ms `setTimeout`, which told the customer
 * their KYC had progressed when nothing had been recorded anywhere.
 *
 * Upload policy enforced here (not just in the form):
 *   • type allowlist (JPG/PNG/WEBP/PDF) — MIME *and* magic bytes
 *   • size 10 KB … 8 MB
 *   • identity/actor pinned to the session
 *   • real SHA-256 of the received bytes for the integrity record
 *   • no storage path, no file URL and no hash are ever returned to the client
 */
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const MIN_BYTES = 10 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_TYPES = [
  "PASSPORT",
  "NATIONAL_ID",
  "DRIVERS_LICENSE",
  "CAC_CERTIFICATE",
  "UTILITY_BILL",
  "TAX_CLEARANCE",
];

const MAGIC: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { mime: "application/pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  // RIFF....WEBP
  {
    mime: "image/webp",
    test: (b) =>
      b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

function fail(code: string, message: string, httpStatus = 422) {
  return createErrorResponse({ code, message, httpStatus, requestId: `KP-REQ-${Date.now()}` });
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return fail(auth.errorCode || "UNAUTHORIZED", "Please sign in to view your verification status.", 401);
  }
  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) {
    return fail("CUSTOMER_IDENTITY_UNRESOLVED", "We could not resolve your profile for this session.", 403);
  }

  const customer = CustomerLifecycleEngine.getInstance().getCustomer(scope.ownerCustomerId);
  if (!customer) {
    return fail("CUSTOMER_NOT_FOUND", "We could not load your customer profile. Contact support.", 404);
  }

  const summary = deriveVerificationSummary(customer);
  return createSuccessResponse(
    { verification: summary },
    { requestId: auth.context.requestId, environment: auth.context.environment },
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["kyc:verify"]);
  if (!auth.isAuthenticated || !auth.context) {
    return fail(auth.errorCode || "UNAUTHORIZED", "Please sign in to submit documents.", 401);
  }
  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) {
    return fail("CUSTOMER_IDENTITY_UNRESOLVED", "We could not resolve your profile for this session.", 403);
  }

  const customer = CustomerLifecycleEngine.getInstance().getCustomer(scope.ownerCustomerId);
  if (!customer) return fail("CUSTOMER_NOT_FOUND", "We could not load your customer profile.", 404);

  const summary = deriveVerificationSummary(customer);
  if (!summary.canSubmitDocument) {
    return fail(
      "REVIEW_IN_PROGRESS",
      "Your documents are already with our review team. You'll be notified when the review is complete.",
      409,
    );
  }

  const identityId = customer.identityRecordId;
  if (!identityId) {
    // The customer master and the identity engine are keyed differently today,
    // so we cannot bind a document to an identity we cannot resolve. Failing
    // here is correct; inventing an id would orphan the record.
    return fail(
      "IDENTITY_NOT_LINKED",
      "Your profile isn't linked to an identity record yet, so we can't accept a document here. Please contact support.",
      503,
    );
  }

  let contentType = "";
  try {
    const form = await req.formData();
    const file = form.get("file");
    const documentType = String(form.get("documentType") || "").toUpperCase();
    const expiresAt = form.get("expiresAt") ? String(form.get("expiresAt")) : undefined;

    if (!(file instanceof File)) return fail("FILE_REQUIRED", "Choose a file to upload.");
    if (!ALLOWED_TYPES.includes(documentType)) {
      return fail("UNSUPPORTED_DOCUMENT_TYPE", "That document type isn't supported.");
    }
    contentType = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME.includes(contentType)) {
      return fail("UNSUPPORTED_MEDIA_TYPE", "Upload a JPG, PNG, WEBP or PDF file.");
    }
    if (file.size < MIN_BYTES || file.size > MAX_BYTES) {
      return fail(
        "FILE_SIZE_INVALID",
        `The file must be between ${MIN_BYTES / 1024} KB and ${MAX_BYTES / (1024 * 1024)} MB.`,
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = MAGIC.find((m) => m.test(bytes));
    if (!sniffed) {
      return fail("FILE_CONTENT_MISMATCH", "That file doesn't look like a real image or PDF document.");
    }
    if (sniffed.mime !== contentType) {
      // e.g. .pdf label on a JPEG, or a renamer hiding a binary payload.
      return fail("FILE_CONTENT_MISMATCH", "The file type doesn't match its contents.");
    }

    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const doc = DocumentVaultEngine.registerDocument({
      identityId,
      documentType,
      documentNumberMasked: undefined,
      mimeType: contentType,
      fileSizeBytes: file.size,
      uploadedBy: String(auth.context.userId),
      expiresAt,
    });

    // Overwrite the placeholder hash with the real digest of the received bytes.
    DocumentVaultEngine.attestIntegrity(doc.id, sha256);

    return createSuccessResponse(
      {
        document: {
          id: doc.id,
          documentType: doc.documentType,
          verificationStatus: doc.verificationStatus,
          uploadedAt: doc.uploadedAt,
        },
        verification: deriveVerificationSummary(
          CustomerLifecycleEngine.getInstance().getCustomer(scope.ownerCustomerId)!,
        ),
      },
      {
        code: "DOCUMENT_RECEIVED",
        message: "Your document has been received and is pending review.",
        requestId: auth.context.requestId,
        environment: auth.context.environment,
      },
    );
  } catch {
    // Raw parse/transport errors never reach the customer verbatim.
    return fail("UPLOAD_FAILED", "We couldn't receive that file. Please try again.");
  }
}
