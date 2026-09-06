import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCustomerById } from "@/lib/customer/customerData";
import { deriveVerificationSummary, getKycDocumentsForCustomer } from "@/lib/customer/customerVerificationLive";

/**
 * /api/customer/portal/verification
 *
 * The customer's real verification state, derived from public.customers +
 * public.customer_kyc_documents (see customerVerificationLive.ts) — never
 * from an in-memory identity engine, never a fabricated percentage.
 *
 * POST uploads the file to the private `customer-kyc-documents` storage
 * bucket and inserts a `PENDING` row. It does NOT approve anything: a human
 * reviewer (or a future provider callback) is the only thing that can move a
 * document to APPROVED/REJECTED. No storage path, signed URL or hash is ever
 * returned to the client.
 *
 * Upload policy enforced here (not just in the form):
 *   • type allowlist (JPG/PNG/WEBP/PDF) — MIME *and* magic bytes
 *   • size 10 KB … 8 MB (matches the bucket's own file_size_limit)
 *   • real SHA-256 of the received bytes stored for the integrity record
 */
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const MIN_BYTES = 10 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_TYPES = ["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE", "CAC_CERTIFICATE", "UTILITY_BILL", "TAX_CLEARANCE"];

const MAGIC: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { mime: "application/pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/webp", test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

function fail(code: string, message: string, httpStatus = 422) {
  return createErrorResponse({ code, message, httpStatus, requestId: `KP-REQ-${Date.now()}` });
}

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return fail(auth.errorCode || "UNAUTHORIZED", "Please sign in to view your verification status.", auth.httpStatus || 401);
  }

  const customer = await getCustomerById(auth.customer.customerId);
  if (!customer) return fail("CUSTOMER_NOT_FOUND", "We could not load your customer profile. Contact support.", 404);

  const documents = await getKycDocumentsForCustomer(customer.id);
  const summary = deriveVerificationSummary(customer, documents);

  return createSuccessResponse({ verification: summary }, { requestId: auth.customer.requestId, environment: "PRODUCTION" });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return fail(auth.errorCode || "UNAUTHORIZED", "Please sign in to submit documents.", auth.httpStatus || 401);
  }

  const customer = await getCustomerById(auth.customer.customerId);
  if (!customer) return fail("CUSTOMER_NOT_FOUND", "We could not load your customer profile.", 404);

  const documents = await getKycDocumentsForCustomer(customer.id);
  const summary = deriveVerificationSummary(customer, documents);
  if (!summary.canSubmitDocument) {
    return fail("REVIEW_IN_PROGRESS", "Your documents are already with our review team. You'll be notified when the review is complete.", 409);
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const documentType = String(form.get("documentType") || "").toUpperCase();
    const expiresAt = form.get("expiresAt") ? String(form.get("expiresAt")) : undefined;

    if (!(file instanceof File)) return fail("FILE_REQUIRED", "Choose a file to upload.");
    if (!ALLOWED_TYPES.includes(documentType)) return fail("UNSUPPORTED_DOCUMENT_TYPE", "That document type isn't supported.");

    const contentType = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME.includes(contentType)) return fail("UNSUPPORTED_MEDIA_TYPE", "Upload a JPG, PNG, WEBP or PDF file.");
    if (file.size < MIN_BYTES || file.size > MAX_BYTES) {
      return fail("FILE_SIZE_INVALID", `The file must be between ${MIN_BYTES / 1024} KB and ${MAX_BYTES / (1024 * 1024)} MB.`);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = MAGIC.find((m) => m.test(bytes));
    if (!sniffed) return fail("FILE_CONTENT_MISMATCH", "That file doesn't look like a real image or PDF document.");
    if (sniffed.mime !== contentType) return fail("FILE_CONTENT_MISMATCH", "The file type doesn't match its contents.");

    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const admin = getSupabaseAdminClient();
    const ext = contentType === "application/pdf" ? "pdf" : contentType.split("/")[1];
    const storagePath = `${customer.id}/${documentType.toLowerCase()}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("customer-kyc-documents")
      .upload(storagePath, bytes, { contentType, upsert: false });
    if (uploadError) {
      return fail("UPLOAD_FAILED", "We couldn't store that file. Please try again.", 500);
    }

    const { data: docRow, error: insertError } = await admin
      .from("customer_kyc_documents")
      .insert({
        customer_id: customer.id,
        document_type: documentType,
        storage_path: storagePath,
        original_filename: file.name?.slice(0, 255) || null,
        mime_type: contentType,
        file_size_bytes: file.size,
        sha256_hex: sha256,
        expires_at: expiresAt || null,
      })
      .select("id, document_type, status, uploaded_at")
      .single();

    if (insertError || !docRow) {
      // Best-effort cleanup: don't leave an orphaned object if the DB insert failed.
      await admin.storage.from("customer-kyc-documents").remove([storagePath]);
      return fail("UPLOAD_FAILED", "We couldn't record that upload. Please try again.", 500);
    }

    const refreshedDocs = await getKycDocumentsForCustomer(customer.id);
    const refreshedSummary = deriveVerificationSummary(customer, refreshedDocs);

    return createSuccessResponse(
      {
        document: { id: docRow.id, documentType: docRow.document_type, verificationStatus: docRow.status, uploadedAt: docRow.uploaded_at },
        verification: refreshedSummary,
      },
      { code: "DOCUMENT_RECEIVED", message: "Your document has been received and is pending review.", requestId: auth.customer.requestId, environment: "PRODUCTION" },
    );
  } catch {
    return fail("UPLOAD_FAILED", "We couldn't receive that file. Please try again.");
  }
}
