import { NextRequest } from "next/server";
import { RequestContext } from "@/types/apiGateway";
import { CustomerLifecycleEngine } from "@/lib/customer/CustomerLifecycleEngine";

/**
 * KoriePay — customer identity resolution for portal read paths.
 * -----------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for "which customer is making this request".
 *
 * Product rule: customer identity is derived from the authenticated server
 * context and NEVER from `customerId` / `userId` / `accountId` sent by the
 * browser. Browser-supplied identity is ignored, not merely disfavoured.
 *
 * Resolution order (first hit wins, otherwise fail closed):
 *   1. `auth.customerId` on the request context — set by a real session layer
 *      (Supabase JWT → customer) once auth is wired (see BANKING_INTEGRATION_PLAN §9).
 *   2. `identityRecordId` match on the customer master — the documented
 *      production link between master identity and banking customer.
 *   3. SANDBOX shim for the format-only dev credential (`usr_dev_01`). This is
 *      the only hardcoded identity left in the customer read path, it is gated
 *      on the exact dev subject, and it is what the mock middleware produces.
 *
 * If none match, this returns `null` and the route answers 403. It never falls
 * back to "the demo customer", because silently returning someone else's data
 * is worse than an honest refusal.
 */
export interface CustomerScope {
  ok: boolean;
  ownerCustomerId?: string;
  /** Present when ok === false. */
  reason?: "NO_IDENTITY" | "UNMAPPED_IDENTITY";
}

export function resolveOwnerCustomerId(
  context: RequestContext | null | undefined,
): string | null {
  if (!context) return null;

  // 1. Explicit customer claim from a real session.
  const claim = (context as unknown as { customerId?: string }).customerId;
  if (typeof claim === "string" && claim.trim()) return claim.trim();

  const userId = context.userId;
  if (!userId) return null;

  // 2. Identity reference → customer master.
  const engine = CustomerLifecycleEngine.getInstance();
  const identityId = userId.startsWith("KID-") ? userId : `KID-${userId.replace(/^usr_/, "").toUpperCase()}`;
  const byIdentity = engine.getCustomers().find((c) => c.identityRecordId === identityId);
  if (byIdentity) return byIdentity.id;

  // 3. Sandbox shim — the format-only auth middleware always yields usr_dev_01.
  //    Remove together with the mock middleware, in the same PR that wires
  //    Supabase auth. Nothing else may depend on it.
  if (userId === "usr_dev_01") return "cust-ng-001-ibrahim";

  return null;
}

/**
 * Guard wrapper: resolve owner from the authenticated context or produce the
 * failure the caller should return. Every customer portal route funnels through
 * here so the ownership rule cannot be forgotten page by page.
 */
export function customerScopeFromRequest(
  _req: NextRequest,
  context: RequestContext | null | undefined,
): CustomerScope {
  const ownerCustomerId = resolveOwnerCustomerId(context);
  if (!ownerCustomerId) {
    return {
      ok: false,
      reason: context?.userId ? "UNMAPPED_IDENTITY" : "NO_IDENTITY",
    };
  }
  return { ok: true, ownerCustomerId };
}
