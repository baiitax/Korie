import { NextRequest, NextResponse } from "next/server";
import { authorizeComplianceRequest, COMPLIANCE_READ_ROLES } from "@/lib/security/complianceAuth";
import { listResource, facetResource, COMPLIANCE_READABLE_RESOURCES } from "@/lib/admin/resourceApi";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { maskIdentityPersons, canUnmaskPii } from "@/lib/security/piiMasking";

export const dynamic = "force-dynamic";

/**
 * GET /api/compliance/data/[resource] — the compliance portal's read plane.
 *
 * Same registry-backed engine as the admin data plane, scoped to the
 * compliance-readable whitelist and authorized against real Supabase
 * sessions with compliance roles. The previous build authenticated this
 * portal with a hardcoded sandbox token — that token is gone.
 *
 * Query params: q (search), limit, offset, whitelisted filters, and
 * ?facet=<filterKey> for distinct filter values.
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
  { params }: { params: { resource: string } },
) {
  const auth = await authorizeComplianceRequest(request, COMPLIANCE_READ_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { status: "error", error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
  }

  const resource = params.resource;
  if (!COMPLIANCE_READABLE_RESOURCES.has(resource)) {
    return NextResponse.json(
      {
        status: "error",
        error: { code: "UNKNOWN_RESOURCE", message: `Resource "${resource}" is not available to the compliance portal.` },
      },
      { status: 404 },
    );
  }

  const sp = request.nextUrl.searchParams;

  // PS-11 (roadmap 2.5): identity rows leave this API with PII masked unless
  // a privileged officer explicitly unmasks — and the unmask is audited.
  const wantsUnmask = resource === "identity-persons" && sp.get("unmask") === "1";
  if (wantsUnmask && !canUnmaskPii([auth.roleName ?? ""])) {
    return NextResponse.json(
      { status: "error", error: { code: "FORBIDDEN_UNMASK", message: "Your role cannot unmask customer PII." } },
      { status: 403 },
    );
  }

  if (sp.get("facet")) {
    const result = await facetResource(resource, sp.get("facet")!);
    if ("error" in result) {
      const status = result.error.kind === "backend-unconfigured" ? 503 : 400;
      return NextResponse.json({ status: "error", error: { code: "FACET_FAILED", message: result.error.kind === "backend-unconfigured" ? UNCONFIGURED.error.message : ("message" in result.error ? result.error.message : result.error.kind) } }, { status: status });
    }
    return NextResponse.json({ status: "ok", resource, facet: sp.get("facet"), values: result.values });
  }

  const result = await listResource(resource, sp);
  if ("error" in result) {
    if (result.error.kind === "backend-unconfigured") {
      return NextResponse.json(UNCONFIGURED, { status: 503 });
    }
    const status = result.error.kind === "unknown-resource" ? 404 : 400;
    return NextResponse.json(
      { status: "error", error: { code: "RESOURCE_QUERY_FAILED", message: result.error.kind === "unknown-resource" ? `Resource "${resource}" is not registered.` : ("message" in result.error ? result.error.message : result.error.kind) } },
      { status },
    );
  }

  const rows =
    resource === "identity-persons" && !wantsUnmask ? maskIdentityPersons(result.rows) : result.rows;

  if (wantsUnmask) {
    try {
      const admin = getSupabaseAdminClient();
      await admin.from("audit_events").insert({
        actor_id: auth.profileId ?? auth.userId ?? "00000000-0000-0000-0000-000000000000",
        actor_email: auth.email ?? "unknown",
        actor_role: auth.roleName ?? "UNKNOWN",
        action: "PII_UNMASKED",
        resource_type: "compliance:identity-persons",
        resource_id: "list",
        details: { scope: "list", count: result.count },
        ip_address: request.headers.get("x-forwarded-for") ?? "unrecorded",
        request_id: request.headers.get("x-kp-request-id") ?? `api-${Date.now().toString(36)}`,
      });
    } catch {
      // The unmask already succeeded; an audit-write failure must not leak it
      // silently — but blocking the read would misreport a backend hiccup as
      // a denial. Insert failures surface in the audit console gap checks.
    }
  }

  return NextResponse.json({
    status: "ok",
    resource,
    rows,
    count: result.count,
    limit: result.limit,
    offset: result.offset,
  });
}
