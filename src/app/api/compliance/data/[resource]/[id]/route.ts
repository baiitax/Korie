import { NextRequest, NextResponse } from "next/server";
import { authorizeComplianceRequest, COMPLIANCE_READ_ROLES, COMPLIANCE_WRITE_ROLES } from "@/lib/security/complianceAuth";
import {
  getResource,
  patchResource,
  COMPLIANCE_READABLE_RESOURCES,
  COMPLIANCE_MUTABLE_RESOURCES,
} from "@/lib/admin/resourceApi";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { maskIdentityPersons, canUnmaskPii } from "@/lib/security/piiMasking";

export const dynamic = "force-dynamic";

/**
 * GET   /api/compliance/data/[resource]/[id] — single record (read roles).
 * PATCH /api/compliance/data/[resource]/[id] — audited mutation (write
 *       roles). Only compliance-mutable resources accept PATCHes; every
 *       write lands in audit_events with before/after state.
 */

const UNCONFIGURED = {
  status: "error",
  error: {
    code: "COMPLIANCE_BACKEND_NOT_CONFIGURED",
    message: "The compliance backend is not configured on this deployment (missing Supabase credentials).",
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { resource: string; id: string } },
) {
  const auth = await authorizeComplianceRequest(request, COMPLIANCE_READ_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { status: "error", error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
  }
  if (!COMPLIANCE_READABLE_RESOURCES.has(params.resource)) {
    return NextResponse.json(
      { status: "error", error: { code: "UNKNOWN_RESOURCE", message: `Resource "${params.resource}" is not available to the compliance portal.` } },
      { status: 404 },
    );
  }

  // PS-11 (roadmap 2.5): the identity record leaves this API with PII
  // masked unless a privileged officer explicitly unmasks — audited when
  // they do, exactly like the support console's Customer 360 (spec §55).
  const wantsUnmask = params.resource === "identity-persons" && request.nextUrl.searchParams.get("unmask") === "1";
  if (wantsUnmask && !canUnmaskPii([auth.roleName ?? ""])) {
    return NextResponse.json(
      { status: "error", error: { code: "FORBIDDEN_UNMASK", message: "Your role cannot unmask customer PII." } },
      { status: 403 },
    );
  }

  const result = await getResource(params.resource, params.id);
  if ("error" in result) {
    if (result.error.kind === "backend-unconfigured") return NextResponse.json(UNCONFIGURED, { status: 503 });
    const status = result.error.kind === "not-found" ? 404 : 400;
    return NextResponse.json(
      { status: "error", error: { code: result.error.kind === "not-found" ? "NOT_FOUND" : "RESOURCE_QUERY_FAILED", message: "message" in result.error ? result.error.message : result.error.kind } },
      { status },
    );
  }
  const record =
    params.resource === "identity-persons" && !wantsUnmask
      ? maskIdentityPersons([result.record])[0]
      : result.record;

  if (wantsUnmask) {
    try {
      const admin = getSupabaseAdminClient();
      await admin.from("audit_events").insert({
        actor_id: auth.profileId ?? auth.userId ?? "00000000-0000-0000-0000-000000000000",
        actor_email: auth.email ?? "unknown",
        actor_role: auth.roleName ?? "UNKNOWN",
        action: "PII_UNMASKED",
        resource_type: "compliance:identity-persons",
        resource_id: params.id,
        details: { scope: "record" },
        ip_address: request.headers.get("x-forwarded-for") ?? "unrecorded",
        request_id: request.headers.get("x-kp-request-id") ?? `api-${Date.now().toString(36)}`,
      });
    } catch {
      // See the list route: never block the read on the audit write.
    }
  }

  return NextResponse.json({ status: "ok", resource: params.resource, record });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { resource: string; id: string } },
) {
  const auth = await authorizeComplianceRequest(request, COMPLIANCE_WRITE_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { status: "error", error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
  }
  if (!COMPLIANCE_MUTABLE_RESOURCES.has(params.resource)) {
    return NextResponse.json(
      {
        status: "error",
        error: { code: "MUTATION_NOT_ALLOWED", message: `Resource "${params.resource}" does not accept compliance mutations.` },
      },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "INVALID_BODY", message: "Request body must be JSON." } },
      { status: 400 },
    );
  }

  const result = await patchResource(params.resource, params.id, body, {
    userId: auth.userId,
    profileId: auth.profileId,
    orgId: auth.orgId,
    roleName: auth.roleName,
    email: auth.email,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
    requestId: request.headers.get("x-kp-request-id") ?? request.headers.get("x-request-id") ?? undefined,
  });
  if ("error" in result) {
    if (result.error.kind === "backend-unconfigured") return NextResponse.json(UNCONFIGURED, { status: 503 });
    const status =
      result.error.kind === "not-found" ? 404 :
      result.error.kind === "mutation-not-allowed" ? 403 :
      result.error.kind === "invalid-body" ? 400 : 400;
    const code =
      result.error.kind === "not-found" ? "NOT_FOUND" :
      result.error.kind === "mutation-not-allowed" ? "MUTATION_NOT_ALLOWED" :
      result.error.kind === "invalid-body" ? "INVALID_BODY" : "MUTATION_FAILED";
    const message = "message" in result.error ? result.error.message : result.error.kind;
    return NextResponse.json({ status: "error", error: { code, message } }, { status });
  }
  return NextResponse.json({ status: "ok", resource: params.resource, record: result.record });
}
