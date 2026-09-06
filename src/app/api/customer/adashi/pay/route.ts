// =============================================================================
// File: src/app/api/customer/adashi/pay/route.ts
// Description: Manual contribution payment with a 6-digit transaction PIN
// (server-validated by PinVault: salted hash + attempt lockout) + idempotency
// key + strict ownership (obligation must belong to the session customer).
// The engine performs the REAL ledger debit; funds insufficiency returns an
// honest FAILED result — never a fabricated success.
// =============================================================================

import { NextRequest } from "next/server";
import { AdashiStore } from "@/lib/adashi/AdashiStore";
import { AdashiCycleObligationEngine } from "@/lib/adashi/AdashiCycleObligationEngine";
import { pinVault } from "@/lib/security/PinVault";
import { withCustomerAuth, badResponse, okResponse } from "@/app/api/customer/adashi/_routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withCustomerAuth(req, ["payments:write"], async ({ customerId, requestId, environment }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return badResponse("INVALID_BODY", "Malformed request body.", requestId, 400);
    }

    const obligationId = String(body.obligationId || "");
    const pin = String(body.pin || "");
    const idempotencyKey = String(body.idempotencyKey || req.headers.get("idempotency-key") || "");

    if (!obligationId) {
      return badResponse("OBLIGATION_REQUIRED", "obligationId is required.", requestId, 400);
    }
    if (!/^\d{6}$/.test(pin)) {
      return badResponse("INVALID_PIN_FORMAT", "Enter your 6-digit transaction PIN.", requestId, 400);
    }
    if (!idempotencyKey || idempotencyKey.length < 8) {
      return badResponse("IDEMPOTENCY_REQUIRED", "An idempotency key (>= 8 chars) is required.", requestId, 400);
    }

    // Ownership pre-flight at the store level: the obligation must belong to
    // the session customer AND be part of a circle they are a member of.
    const obligation = AdashiStore.getObligationById(obligationId);
    if (!obligation || obligation.customerId !== customerId) {
      return badResponse("NOT_OWNED", "This obligation does not belong to your profile.", requestId, 403);
    }

    // PIN verification (attempt-limited, lockout after 5 failures)
    pinVault.ensureEnrolled(customerId);
    const check = pinVault.verify(customerId, pin);
    if (!check.ok) {
      if (check.code === "PIN_LOCKED") {
        return badResponse("PIN_LOCKED", `Too many attempts. Try again in ${Math.ceil(check.retryAfterMs / 60000)} minutes.`, requestId, 429);
      }
      if (check.code === "NOT_ENROLLED") {
        return badResponse("PIN_NOT_ENROLLED", "No transaction PIN is set for this profile.", requestId, 400);
      }
      return badResponse(
        "WRONG_PIN",
        check.attemptsLeft > 0
          ? `Incorrect PIN — ${check.attemptsLeft} attempt${check.attemptsLeft === 1 ? "" : "s"} left.`
          : "Incorrect PIN.",
        requestId,
        401,
      );
    }

    const outcome = await AdashiCycleObligationEngine.processContributionPayment({
      obligationId,
      initiatedBy: "CUSTOMER_MANUAL_PIN",
      pinVerified: true,
      idempotencyKey,
      customerScopeId: customerId,
    });

    if (outcome.success) {
      return okResponse(
        {
          obligation: outcome.obligation,
          payment: outcome.payment,
          idempotencyCached: false,
        },
        requestId,
        environment,
      );
    }

    const status = outcome.code === "ALREADY_PAID" ? 409 : outcome.code === "INSUFFICIENT_FUNDS" ? 402 : 400;
    return badResponse(outcome.code, outcome.message, requestId, status);
  });
}
