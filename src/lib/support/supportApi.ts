// =============================================================================
// File: src/lib/support/supportApi.ts
// Description: Shared plumbing for /api/support/* routes.
//
// Security model (spec §54/§91), NOW REAL:
//   1. Session  — authenticateSupportOfficerRequest validates a real Supabase
//      access token (issued by supabase.auth.signInWithPassword on the
//      client) and resolves the caller's public.support_officers row. There
//      is no client-asserted officer identity anymore — the browser cannot
//      widen its own access by sending a different header.
//   2. RBAC     — capabilities are derived from the resolved officer's role,
//      exactly as before (SupportPermissions.hasCapability).
//   3. Auditing — sensitive actions append support_audit_log rows.
// =============================================================================

import { NextRequest } from "next/server";
import { createErrorResponse } from "@/lib/security/apiResponse";
import { authenticateSupportOfficerRequest } from "@/lib/security/supportOfficerAuth";
import { SupportActor } from "./SupportOpsEngine";
import { SupportOfficer } from "@/types/support";

export interface SupportApiContext {
  officer: SupportOfficer;
  actor: SupportActor;
  requestId: string;
  correlationId: string;
}

export async function requireSupportAccess(
  req: NextRequest,
  _scope: "support:read" | "support:write" | "support:finance" = "support:read",
): Promise<{ ok: true; ctx: SupportApiContext } | { ok: false; response: ReturnType<typeof createErrorResponse> }> {
  void _scope; // scope enforcement now happens per-capability (hasCapability), not per-key.

  const auth = await authenticateSupportOfficerRequest(req);
  if (!auth.isAuthenticated || !auth.officer) {
    return {
      ok: false,
      response: createErrorResponse({
        code: auth.errorCode || "UNAUTHORIZED",
        message: auth.errorMessage || "Support access requires a valid KoriePay session.",
        httpStatus: auth.httpStatus || 401,
      }),
    };
  }

  const officer: SupportOfficer = {
    id: auth.officer.officerId,
    fullName: auth.officer.fullName,
    email: auth.officer.email,
    role: auth.officer.role,
    tier: auth.officer.tier as SupportOfficer["tier"],
    jurisdiction: auth.officer.jurisdiction,
    languages: auth.officer.languages as SupportOfficer["languages"],
    activeTicketCount: 0, // computed on demand by /api/support/officers, not carried on the session
    maxCapacity: auth.officer.maxCapacity,
    status: auth.officer.status,
    qaScore: auth.officer.qaScore,
    skills: auth.officer.skills,
    joinedDate: auth.officer.joinedDate,
  };

  return {
    ok: true,
    ctx: {
      officer,
      actor: {
        officerId: auth.officer.officerId,
        name: auth.officer.fullName,
        role: auth.officer.role,
        requestId: auth.officer.requestId,
      },
      requestId: auth.officer.requestId,
      correlationId: req.headers.get("x-kp-correlation-id") || auth.officer.requestId,
    },
  };
}

/** Operational, agent-facing error copy (spec §73 — never raw stack/SQL). */
export function operationalError(
  code: string,
  message: string,
  httpStatus = 400,
  requestId?: string,
) {
  return createErrorResponse({ code, message, httpStatus, requestId });
}
