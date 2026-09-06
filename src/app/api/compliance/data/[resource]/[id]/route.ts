import { NextRequest, NextResponse } from "next/server";
import { authorizeComplianceRequest, COMPLIANCE_READ_ROLES, COMPLIANCE_WRITE_ROLES } from "@/lib/security/complianceAuth";
import {
  getResource,
  patchResource,
  COMPLIANCE_READABLE_RESOURCES,
  COMPLIANCE_MUTABLE_RESOURCES,
} from "@/lib/admin/resourceApi";

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

  const result = await getResource(params.resource, params.id);
  if ("error" in result) {
    if (result.error.kind === "backend-unconfigured") return NextResponse.json(UNCONFIGURED, { status: 503 });
    const status = result.error.kind === "not-found" ? 404 : 400;
    return NextResponse.json(
      { status: "error", error: { code: result.error.kind === "not-found" ? "NOT_FOUND" : "RESOURCE_QUERY_FAILED", message: "message" in result.error ? result.error.message : result.error.kind } },
      { status },
    );
  }
  return NextResponse.json({ status: "ok", resource: params.resource, record: result.record });
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
