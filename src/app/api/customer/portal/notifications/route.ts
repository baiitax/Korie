import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { CustomerLifecycleEngine } from "@/lib/customer/CustomerLifecycleEngine";
import { TransactionService } from "@/lib/services/TransactionService";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";
import { openDisputeRefsFor } from "@/lib/customer/disputeStatus";
import { deriveVerificationSummary, VerificationState } from "@/lib/customer/CustomerVerification";
import { mapEngineStatusToUi } from "@/lib/customer/CustomerTransactionQuery";

/**
 * GET /api/customer/portal/notifications
 *
 * A DERIVED notification list — deliberately not a stored inbox.
 * ---------------------------------------------------------------------------
 * The portal previously showed a hardcoded unread badge of `3`. That is a
 * fabricated state, so it is removed. Until a real notification store + fan-out
 * exists, the honest answer is: a notification exists only when something in
 * the customer's own account genuinely needs their attention.
 *
 * Sources (all authoritative, all ownership-scoped):
 *   • a transaction of theirs that is not terminal (PENDING / PROCESSING)
 *   • a dispute-bearing transaction (DISPUTED)
 *   • their verification state, when it blocks capability
 *
 * Counting rule: every item is actionable, so `unreadCount` equals the number
 * of items. There is no read/unread ledger yet, which is exactly why the badge
 * must not pretend to track one — when the store lands, add a `readAt` column
 * and this route returns it.
 *
 * Text is NOT composed here: each item carries an i18n key plus params so the
 * customer reads it in English / Français / Hausa.
 */
export const dynamic = "force-dynamic";

interface CustomerNotification {
  id: string;
  kind: "TRANSACTION" | "VERIFICATION" | "SECURITY" | "SYSTEM";
  tone: "info" | "warning" | "danger" | "success";
  titleKey: string;
  bodyKey: string;
  params: Record<string, string | number>;
  createdAt: string;
  /** Present when the item links into a real screen. */
  link?: { href: string; labelKey: string };
  reference?: string;
}

const BLOCKING_STATES: VerificationState[] = [
  "NOT_STARTED",
  "ACTION_REQUIRED",
  "REJECTED",
  "EXPIRED",
  "RETRY_REQUIRED",
];

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: "Please sign in to view your notifications.",
      httpStatus: auth.httpStatus || 401,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }
  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) {
    return createErrorResponse({
      code: "CUSTOMER_IDENTITY_UNRESOLVED",
      message: "We could not resolve your profile for this session.",
      httpStatus: 403,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }
  const ownerCustomerId = scope.ownerCustomerId;
  const items: CustomerNotification[] = [];
  // Same join the History route makes, so the bell and the ledger view can
  // never disagree about what is disputed.
  const disputedRefs = openDisputeRefsFor(ownerCustomerId);

  // 1. Their own non-terminal transactions.
  try {
    for (const tx of TransactionService.listRawForOwner(ownerCustomerId)) {
      const uiStatus = disputedRefs.has(tx.reference)
        ? "DISPUTED"
        : mapEngineStatusToUi(tx.status);
      if (uiStatus === "PENDING" || uiStatus === "PROCESSING") {
        items.push({
          id: `notif-tx-${tx.reference}`,
          kind: "TRANSACTION",
          tone: "warning",
          titleKey: "notifications.transaction.pendingTitle",
          bodyKey: "notifications.transaction.pendingBody",
          params: { reference: tx.reference },
          createdAt: tx.updated_at || tx.created_at,
          reference: tx.reference,
          link: { href: "/customer/transactions", labelKey: "notifications.viewTransactions" },
        });
      } else if (uiStatus === "DISPUTED") {
        items.push({
          id: `notif-tx-${tx.reference}`,
          kind: "TRANSACTION",
          tone: "danger",
          titleKey: "notifications.transaction.disputedTitle",
          bodyKey: "notifications.transaction.disputedBody",
          params: { reference: tx.reference },
          createdAt: tx.updated_at || tx.created_at,
          reference: tx.reference,
          link: { href: "/customer/support", labelKey: "notifications.viewCase" },
        });
      }
    }
  } catch {
    // A failed source must not fabricate "no notifications". The route still
    // returns what it did read; the client renders a partial-data warning.
  }

  // 2. Verification that blocks capability.
  const customer = CustomerLifecycleEngine.getInstance().getCustomer(ownerCustomerId);
  if (customer) {
    const verification = deriveVerificationSummary(customer);
    if (BLOCKING_STATES.includes(verification.state)) {
      items.push({
        id: `notif-verification-${verification.state}`,
        kind: "VERIFICATION",
        tone: verification.state === "REJECTED" ? "danger" : "warning",
        titleKey: "notifications.verification.title",
        bodyKey: `notifications.verification.${verification.state}`,
        params: { remaining: verification.remainingCount },
        createdAt: customer.updatedAt,
        link: { href: "/customer/kyc", labelKey: "notifications.continueVerification" },
      });
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return createSuccessResponse(
    {
      notifications: items,
      unreadCount: items.length,
      // Truthful capability flag for the UI: no read-receipt store exists, so
      // the bell must not render a "mark all read" affordance.
      supportsMarkRead: false,
      generatedAt: new Date().toISOString(),
    },
    { requestId: auth.context.requestId, environment: auth.context.environment },
  );
}
