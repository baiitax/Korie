import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/transactions?q=
 * Transaction search over the SAME real customer_transactions/
 * agency_transactions tables the Customer/Agency portals write — no forked
 * "provider trace" layer. Search respects the same capability gate as direct
 * lookup (spec §56): officers without view_transactions get nothing.
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_transactions")) {
    return operationalError("FORBIDDEN", "Your role cannot search transactions.", 403, access.ctx.requestId);
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const admin = getSupabaseAdminClient();

  if (!q) {
    const { data } = await admin
      .from("customer_transactions")
      .select("id, reference, transaction_type, amount, currency, status, created_at, recipient_name, recipient_bank")
      .order("created_at", { ascending: false })
      .limit(25);
    return respondWith(access, data || []);
  }

  const like = `%${q.replace(/[%,()]/g, "")}%`;
  const [{ data: custTx }, { data: agencyTx }] = await Promise.all([
    admin
      .from("customer_transactions")
      .select("id, reference, transaction_type, amount, currency, status, created_at, recipient_name, recipient_bank")
      .or(`reference.ilike.${like},recipient_name.ilike.${like},recipient_bank.ilike.${like}`)
      .limit(25),
    admin
      .from("agency_transactions")
      .select("id, reference, transaction_type, amount, currency, status, created_at, recipient_name, recipient_bank, customer_name")
      .or(`reference.ilike.${like},recipient_name.ilike.${like},customer_name.ilike.${like}`)
      .limit(25),
  ]);

  return respondWith(access, [...(custTx || []), ...(agencyTx || [])]);
}

function respondWith(
  access: { ctx: { requestId: string } },
  rows: Array<{ id: string; reference: string; transaction_type: string; amount: number; currency: string; status: string; created_at: string; recipient_name?: string; recipient_bank?: string }>,
) {
  return createSuccessResponse(
    {
      items: rows.slice(0, 50).map((t) => ({
        transactionId: t.id,
        reference: t.reference,
        type: t.transaction_type,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        timestamp: t.created_at,
        destination: t.recipient_name ? `${t.recipient_name}${t.recipient_bank ? ` · ${t.recipient_bank}` : ""}` : undefined,
      })),
    },
    { requestId: access.ctx.requestId },
  );
}
