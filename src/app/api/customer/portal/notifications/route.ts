import { NextRequest } from "next/server";
import { authenticateCustomerRequest } from "@/lib/security/customerAuth";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/customer/portal/notifications
 *
 * Real notification feed, read from public.customer_notifications. Rows are
 * created automatically by the trg_notify_customer_on_transaction trigger
 * whenever one of the customer's own transactions is inserted or changes
 * status — nothing here is derived/fabricated client-side.
 *
 * PATCH marks a notification (or all) as read.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: "Please sign in to view your notifications.", httpStatus: auth.httpStatus || 401, requestId: `KP-REQ-${Date.now()}` });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_notifications")
    .select("id, category, severity, title, body, related_transaction_id, is_read, created_at, read_at")
    .eq("customer_id", auth.customer.customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return createErrorResponse({ code: "NOTIFICATIONS_LOOKUP_FAILED", message: "Unable to load notifications right now.", httpStatus: 500, requestId: `KP-REQ-${Date.now()}` });
  }

  const items = (data || []).map((n) => ({
    id: n.id,
    kind: n.category,
    tone: n.severity === "CRITICAL" ? "danger" : n.severity === "WARNING" ? "warning" : "info",
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    isRead: n.is_read,
    readAt: n.read_at,
    relatedTransactionId: n.related_transaction_id,
  }));

  return createSuccessResponse(
    {
      notifications: items,
      unreadCount: items.filter((n) => !n.isRead).length,
      supportsMarkRead: true,
      generatedAt: new Date().toISOString(),
    },
    { requestId: auth.customer.requestId, environment: "PRODUCTION" },
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateCustomerRequest(req);
  if (!auth.isAuthenticated || !auth.customer) {
    return createErrorResponse({ code: auth.errorCode || "UNAUTHORIZED", message: "Please sign in.", httpStatus: auth.httpStatus || 401, requestId: `KP-REQ-${Date.now()}` });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* an empty body is treated as "mark all read" */
  }

  const admin = getSupabaseAdminClient();
  const id = body.id ? String(body.id) : null;
  const now = new Date().toISOString();

  let query = admin
    .from("customer_notifications")
    .update({ is_read: true, read_at: now })
    .eq("customer_id", auth.customer.customerId)
    .eq("is_read", false);
  if (id) query = query.eq("id", id);

  const { error } = await query;
  if (error) {
    return createErrorResponse({ code: "MARK_READ_FAILED", message: "Could not update notifications.", httpStatus: 500, requestId: `KP-REQ-${Date.now()}` });
  }

  return createSuccessResponse({ updated: true }, { requestId: auth.customer.requestId, environment: "PRODUCTION" });
}
