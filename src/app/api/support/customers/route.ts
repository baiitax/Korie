import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { resolveCustomer360 } from "@/lib/support/SupportContexts";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/customers?q=
 * Customer search for support (authorized; search results still carry only
 * masked PII — spec §56).
 */
export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const store = (await import("@/lib/support/SupportOpsStore")).SupportOpsStore.getInstance();
  const engine = (await import("@/lib/support/SupportOpsEngine")).SupportOpsEngine.getInstance();
  engine.sweepAutoClose();

  let contextIds = Object.keys(store.entityContexts);
  // Also include authoritative engine customers
  const { CustomerLifecycleEngine } = await import("@/lib/customer/CustomerLifecycleEngine");
  const engineCustomers = CustomerLifecycleEngine.getInstance().getCustomers();

  const all = [
    ...engineCustomers.map((c) => ({
      id: c.id,
      name: c.fullName,
      country: c.country,
      status: c.status,
      kycTier: c.kycTier,
      riskLevel:
        c.riskStatus === "HIGH" || c.riskStatus === "CRITICAL"
          ? "HIGH"
          : c.riskStatus === "ELEVATED"
            ? "MEDIUM"
            : "LOW",
      source: "CUSTOMER_ENGINE" as const,
      emailMasked: undefined as string | undefined,
      phoneMasked: undefined as string | undefined,
    })),
    ...contextIds.map((id) => {
      const c = store.entityContexts[id];
      return {
        id,
        name: c.fullName,
        country: c.country,
        status: c.accountStatus,
        kycTier: c.kycTier,
        riskLevel: c.riskLevel,
        source: "SUPPORT_STORE" as const,
        emailMasked: c.emailMasked,
        phoneMasked: c.phoneMasked,
      };
    }),
  ];

  const filtered = q
    ? all.filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
    : all;

  return createSuccessResponse(
    {
      items: filtered.slice(0, 50).map((c) => ({
        ...c,
        openTickets: store.ticketsForCustomer(c.id).filter((t) => engine.getStore().isTicketOpen(t)).length,
      })),
    },
    { requestId: access.ctx.requestId },
  );
}

void operationalError;
