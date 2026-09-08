// =============================================================================
// File: src/lib/agent/agentScope.ts
// Description: Agent identity resolution for kiosk portal paths — the agent
// analogue of src/lib/customer/customerScope.ts. SINGLE SOURCE OF TRUTH for
// "which agent is making this request". Browser-supplied ids are never used.
//
// Resolution order (first hit wins, otherwise fail closed):
//   1. `agentId` claim on the request context — set by a real session layer
//      (Supabase JWT → agent) once auth is wired.
//   2. SANDBOX shim: the mock auth middleware yields usr_dev_01 with no agent
//      claim; the agent demo session maps to the canonical engine agent
//      agt-ng-001 (Garba Express Services & POS). Gated on the exact dev
//      subject, mirroring the customer-side shim. Remove with the mock auth.
// =============================================================================

import { NextRequest } from "next/server";
import { RequestContext } from "@/types/apiGateway";

export const AGENT_PORTAL_ENGINE_AGENT_ID = "agt-ng-001";
export const AGENT_PORTAL_TERMINAL_ID = "TID-NG-009182";
export const AGENT_PORTAL_TILL_LOCATION_ID = "loc-till-garba";
export const AGENT_PORTAL_DEVICE_ID = "DEV-POS-NG-01";
export const AGENT_PORTAL_COUNTRY = "NG" as const;
export const AGENT_PORTAL_CURRENCY = "NGN" as const;

export interface AgentScope {
  ok: boolean;
  ownerAgentId?: string;
  reason?: "NO_IDENTITY" | "UNMAPPED_IDENTITY";
}

export function resolveOwnerAgentId(context: RequestContext | null | undefined): string | null {
  if (!context) return null;

  // 1. Explicit agent claim from a real session.
  const claim = (context as unknown as { agentId?: string }).agentId;
  if (typeof claim === "string" && claim.trim()) return claim.trim();

  const userId = context.userId;
  if (!userId) return null;

  // 2. Sandbox shim — the format-only auth middleware always yields usr_dev_01.
  //    In the sandbox the agent kiosk session is the engine's seeded demo
  //    agent. Remove together with the mock middleware, in the same PR that
  //    wires Supabase auth.
  if (userId === "usr_dev_01") return AGENT_PORTAL_ENGINE_AGENT_ID;

  return null;
}

export function agentScopeFromRequest(
  _req: NextRequest,
  context: RequestContext | null | undefined,
): AgentScope {
  const ownerAgentId = resolveOwnerAgentId(context);
  if (!ownerAgentId) {
    return {
      ok: false,
      reason: context?.userId ? "UNMAPPED_IDENTITY" : "NO_IDENTITY",
    };
  }
  return { ok: true, ownerAgentId };
}
