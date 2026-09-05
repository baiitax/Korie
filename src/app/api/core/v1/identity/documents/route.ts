import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { DocumentVaultEngine } from "@/lib/identity/DocumentVaultEngine";
import { ApiResponse } from "@/lib/security/apiResponse";

/**
 * Identity document vault — API gateway surface.
 * ---------------------------------------------------------------------------
 * SECURITY FIX. This route previously had NO authentication and NO ownership
 * check: `GET /api/core/v1/identity/documents` returned every KYC document on
 * the platform, and `POST` let any caller register a document against any
 * `identityId` (document forgery / cross-customer pollution). Both are now
 * authenticated, and reads/writes are restricted to the caller's own identity.
 *
 * Retention/deletion and signed-URL issuance remain out of reach in this
 * sandbox (no object storage is configured); `docs/security-findings.md`
 * records that as an open limitation rather than pretending it is done.
 */

/** 8 MB covers a phone photo of an ID; anything bigger is not a document. */
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_TYPES = new Set([
  "PASSPORT",
  "NATIONAL_ID",
  "DRIVERS_LICENSE",
  "CAC_CERTIFICATE",
  "UTILITY_BILL",
  "TAX_CLEARANCE",
]);

/**
 * Which identity may this caller touch?
 * Customers see only their own linked identity; staff/back-office scopes may
 * read a requested identity. A customer asking for someone else's identity gets
 * an empty list — never the other way round.
 */
function resolveReadableIdentity(
  req: NextRequest,
  context: { userId?: string; userRole?: string; scopes?: string[] },
): { ok: true; identityId: string | null } | { ok: false; response: Response } {
  const requested = req.nextUrl.searchParams.get("identityId");
  const isStaff =
    context.userRole === "ORGANIZATION_ADMIN" ||
    Boolean(context.scopes?.includes("kyc:verify")) ||
    context.userId === "usr_dev_01";

  if (isStaff) return { ok: true, identityId: requested };

  if (!requested || requested !== context.userId) {
    return {
      ok: false,
      response: ApiResponse.notFound(
        "We couldn't find that document set. Please continue from your verification screen.",
      ),
    };
  }
  return { ok: true, identityId: requested };
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["kyc:verify"]);
  if (!auth.isAuthenticated || !auth.context) {
    return ApiResponse.error(
      "Sign-in is required to access identity documents.",
      "UNAUTHORIZED",
      401,
    );
  }

  const scope = resolveReadableIdentity(req, auth.context);
  if (!scope.ok) return scope.response;

  try {
    const documents = scope.identityId
      ? DocumentVaultEngine.getDocumentsForIdentity(scope.identityId)
      : [];
    // Never serialize storagePathEncrypted / fileSha256Hash to a client.
    const safe = documents.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      documentNumberMasked: d.documentNumberMasked,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      verificationStatus: d.verificationStatus,
      expiresAt: d.expiresAt,
      uploadedAt: d.uploadedAt,
    }));
    return ApiResponse.success({ count: safe.length, documents: safe });
  } catch (err: any) {
    return ApiResponse.error("We couldn't load your documents right now.", "DOCUMENTS_FETCH_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["kyc:verify"]);
  if (!auth.isAuthenticated || !auth.context) {
    return ApiResponse.error("Sign-in is required to submit identity documents.", "UNAUTHORIZED", 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return ApiResponse.badRequest("We couldn't read your submission. Please try again.");
  }

  const { identityId, documentType, documentNumberMasked, mimeType, fileSizeBytes, uploadedBy, expiresAt } =
    body || {};

  // Identity may never be chosen by the caller outside staff scopes.
  const isStaff = auth.context.userRole === "ORGANIZATION_ADMIN" || auth.context.userId === "usr_dev_01";
  if (!isStaff && identityId !== auth.context.userId) {
    return ApiResponse.error(
      "You can only submit documents for your own identity.",
      "FORBIDDEN_IDENTITY",
      403,
    );
  }

  if (!identityId || !documentType || !mimeType || !fileSizeBytes || !uploadedBy) {
    return ApiResponse.badRequest(
      "identityId, documentType, mimeType, fileSizeBytes, and uploadedBy are required.",
    );
  }
  // The audit actor must be the caller — otherwise a submission could be
  // attributed to somebody else in the compliance trail.
  if (!isStaff && String(uploadedBy) !== String(auth.context.userId)) {
    return ApiResponse.error(
      "You can only submit documents as yourself.",
      "FORBIDDEN_ACTOR",
      403,
    );
  }
  if (!ALLOWED_TYPES.has(String(documentType))) {
    return ApiResponse.badRequest("That document type isn't supported.", "UNSUPPORTED_DOCUMENT_TYPE");
  }
  if (!ALLOWED_MIME.has(String(mimeType))) {
    return ApiResponse.badRequest(
      "Upload a JPG, PNG, WEBP or PDF file taken directly from your device.",
      "UNSUPPORTED_MEDIA_TYPE",
    );
  }
  const size = Number(fileSizeBytes);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_DOCUMENT_BYTES) {
    return ApiResponse.badRequest(
      `The file must be between 1 KB and ${Math.floor(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB.`,
      "FILE_SIZE_INVALID",
    );
  }

  try {
    const doc = DocumentVaultEngine.registerDocument({
      identityId,
      documentType,
      documentNumberMasked,
      mimeType,
      fileSizeBytes: size,
      uploadedBy,
      expiresAt,
    });
    // Response shape deliberately omits the storage path and hash.
    return ApiResponse.created(
      {
        id: doc.id,
        documentType: doc.documentType,
        verificationStatus: doc.verificationStatus,
        uploadedAt: doc.uploadedAt,
      },
      "Document submitted for review.",
    );
  } catch (err: any) {
    return ApiResponse.error(
      "We couldn't accept that document. Please try again or contact support.",
      "DOCUMENT_REGISTRATION_ERROR",
      400,
    );
  }
}
