// =============================================================================
// File: src/lib/support/supportApi.ts
// Description: Shared plumbing for /api/support/* routes.
//
// Security model (spec §54/§91):
//   1. Key auth   — authenticateApiRequest (Bearer kp_test_*/kp_live_*, scopes).
//   2. Officer    — asserted via x-kp-support-officer and VALIDATED against
//                   the officer roster. The server, never the browser, decides
//                   which capabilities exist for that officer (RBAC).
//   3. Auditing   — sensitive actions append support audit + global AuditService.
//
// In a production deployment step 2 resolves from the signed-in session
// (Supabase auth user → support roster membership). The sandbox has no
// per-officer session, so the header stands in — every downstream permission
// check is identical.
// =============================================================================

import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createErrorResponse } from "@/lib/security/apiResponse";
import { SupportOpsStore } from "./SupportOpsStore";
import { SupportActor } from "./SupportOpsEngine";
import { SupportOfficer } from "@/types/support";

/** Sandbox default: a TIER-2 senior — enough to see most, never manager-only. */
const DEFAULT_SANDBOX_OFFICER_ID = "OFF-SUP-03";

export interface SupportApiContext {
  officer: SupportOfficer;
  actor: SupportActor;
  requestId: string;
  correlationId: string;
}

export async function requireSupportAccess(
  req: NextRequest,
  scope: "support:read" | "support:write" | "support:finance" = "support:read",
): Promise<{ ok: true; ctx: SupportApiContext } | { ok: false; response: ReturnType<typeof createErrorResponse> }> {
  const auth = await authenticateApiRequest(req, [scope]);
  if (!auth.isAuthenticated || !auth.context) {
    return {
      ok: false,
      response: createErrorResponse({
        code: auth.errorCode || "UNAUTHORIZED",
        message: "Support access requires a valid KoriePay API credential.",
        requestId: auth.context?.requestId,
        httpStatus: auth.httpStatus || 401,
      }),
    };
  }

  const store = SupportOpsStore.getInstance();
  const officerId = req.headers.get("x-kp-support-officer") || DEFAULT_SANDBOX_OFFICER_ID;
  let officer = store.getOfficer(officerId);
  if (!officer) {
    // Unknown/rogue officer id must never widen access — fall back to the
    // least-privileged sandbox identity, not the most privileged.
    officer = store.getOfficer("OFF-SUP-08") ?? store.getOfficer(DEFAULT_SANDBOX_OFFICER_ID);
  }
  if (!officer) {
    return {
      ok: false,
      response: createErrorResponse({
        code: "SUPPORT_ROSTER_UNAVAILABLE",
        message: "The support roster is unavailable. No officer could be resolved.",
        httpStatus: 503,
      }),
    };
  }

  return {
    ok: true,
    ctx: {
      officer,
      actor: {
        officerId: officer.id,
        name: officer.fullName,
        role: officer.role,
        requestId: auth.context.requestId,
      },
      requestId: auth.context.requestId,
      correlationId: auth.context.correlationId,
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
