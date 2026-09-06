// =============================================================================
// File: src/app/api/customer/adashi/circles/route.ts
// Description: Owner-scoped customer Adashi BFF.
//   GET → seed demo circles (idempotent) + run the due/auto-debit sweep
//         (demo substitute for the cron runner) + return PRIVACY-SANITIZED
//         circle view models + the member's email-reminder outbox.
// Auth/scope follow the customer portal pattern: bearer + session-owned
// customer identity; never trust a browser-supplied customer id.
// =============================================================================

import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { customerScopeFromRequest } from "@/lib/customer/customerScope";
import {
  buildCircleViewModels,
  ensureCustomerCirclesSeeded,
} from "@/lib/customer/AdashiCustomerEngine";
import { AdashiCycleObligationEngine } from "@/lib/adashi/AdashiCycleObligationEngine";
import { emailNotificationEngine } from "@/lib/email/EmailNotificationEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: "We could not confirm who you are. Please sign in again.",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
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
  const customerId = scope.ownerCustomerId;

  ensureCustomerCirclesSeeded();

  // Due sweep — demo substitute for the scheduled auto-collection runner
  // (see docs/customer-adashi-rebuild/01-audit-and-plan.md, phase 3).
  const sweepEvents = await AdashiCycleObligationEngine.runDueSweep();

  const circles = buildCircleViewModels(customerId);
  const reminders = emailNotificationEngine.listByCustomer(customerId).slice(0, 25);

  return createSuccessResponse(
    {
      circles,
      sweepEvents,
      reminders: reminders.map((r) => ({
        id: r.id,
        templateId: r.templateId,
        subject: r.subject,
        bodyText: r.bodyText,
        status: r.status,
        transportMode: r.transportMode,
        readAt: r.readAt ?? null,
        createdAt: r.createdAt,
        adashiId: r.adashiId ?? null,
        obligationId: r.obligationId ?? null,
      })),
      outbox: {
        transportConfigured: emailNotificationEngine.isSmtpConfigured(),
        mode: emailNotificationEngine.isSmtpConfigured() ? "SMTP" : "DEMO_OUTBOX",
        note: emailNotificationEngine.isSmtpConfigured()
          ? "Reminders are delivered via the configured SMTP transport."
          : "No SMTP transport is configured — reminders are composed and held in the demo outbox as QUEUED; nothing is claimed as sent.",
      },
    },
    { requestId: auth.context.requestId, environment: auth.context.environment },
  );
}
