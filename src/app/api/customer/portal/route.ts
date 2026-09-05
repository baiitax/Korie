import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/security/authMiddleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { CustomerLifecycleEngine } from "@/lib/customer/CustomerLifecycleEngine";
import { AccountLifecycleEngine } from "@/lib/customer/AccountLifecycleEngine";
import { BeneficiarySecurityEngine } from "@/lib/customer/BeneficiarySecurityEngine";
import {
  engineToUser,
  engineToWallet,
  engineToBeneficiary,
} from "@/lib/engineAdapters";
import { TransactionService } from "@/lib/services/TransactionService";
import { orderCurrenciesXofFirst } from "@/lib/customer/customerFeatures";
// Catalog data for domains that don't yet have a dedicated engine (transactions
// history beyond this session, cards, support tickets). These are exposed via
// the API so the client never imports mocks directly; the engine-backed fields
// (customer, wallet balances, beneficiaries) come from the real engines above.
import {
  CUSTOMER_TRANSACTIONS,
  CUSTOMER_SUPPORT_TICKETS,
} from "@/services/customerDataService";

/**
 * GET /api/customer/portal
 *
 * Single aggregated payload for the customer portal. Reads the LIVE engine
 * layer (customer lifecycle, account/subledger balances, beneficiary security)
 * and combines with the session/catalog domains. This is the "one connected
 * data load" the customer portal hydrates from — replacing scattered client
 * mock imports.
 *
 * Auth + scope required; identity resolved from the auth context.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ["payments:read"]);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || "UNAUTHORIZED",
      message: auth.errorMessage || "Unauthorized",
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;

  // Resolve the caller's customer from the authenticated identity (never a
  // client-supplied id). In production this is a token -> customer lookup.
  const ownerCustomerId = resolveCustomerId(context.userId);

  const customerEngine = CustomerLifecycleEngine.getInstance();
  const accountEngine = AccountLifecycleEngine.getInstance();
  const beneficiaryEngine = BeneficiarySecurityEngine.getInstance();

  const customerRecord = customerEngine.getCustomer(ownerCustomerId);
  const accounts = accountEngine.getAccounts(ownerCustomerId);
  const beneficiaryRecords = beneficiaryEngine.getBeneficiaries(ownerCustomerId);

  // Build the payload. If the engine has no record for this identity, fall back
  // to the seeded customer identity so the portal still loads in the sandbox.
  const customer = customerRecord
    ? engineToUser(customerRecord)
    : fallbackUser(ownerCustomerId);
  // XOF first, NGN second (Niger-first). No customer-visible USD.
  const wallets = accounts.length > 0
    ? orderCurrenciesXofFirst(accounts.map(engineToWallet))
    : [];
  const beneficiaries = beneficiaryRecords.map(engineToBeneficiary);

  // Cross-border execution rates from the transfer engine (single source of
  // truth) — the customer quote must match the rate that will be executed.
  const fxRates = [
    TransactionService.getCrossBorderRate("NGN"),
    TransactionService.getCrossBorderRate("XOF"),
  ].map((q) => ({
    fromCurrency: q.sourceCurrency,
    toCurrency: q.destinationCurrency,
    rate: q.rate,
    source: "KoriePay Bilateral Sahel Engine",
  }));

  return createSuccessResponse(
    {
      portal: {
        customer,
        wallets,
        beneficiaries,
        transactions: CUSTOMER_TRANSACTIONS,
        // Cards are COMING SOON — do not expose fabricated card records.
        cards: [],
        supportTickets: CUSTOMER_SUPPORT_TICKETS,
        fxRates,
      },
    },
    {
      requestId: context.requestId,
      correlationId: context.correlationId,
      environment: context.environment,
    },
  );
}

function resolveCustomerId(userId?: string): string {
  if (userId === "usr_dev_01") return "cust-ng-001-ibrahim";
  if (userId) return `cust-${userId.replace("usr_", "")}`;
  return "cust-ng-001-ibrahim";
}

function fallbackUser(customerId: string) {
  return {
    id: customerId,
    firstName: "Ibrahim",
    lastName: "Bello",
    fullName: "Ibrahim Bello",
    email: "ibrahim.bello@koriepay.com",
    phone: "+2348031112233",
    country: "NG" as const,
    countryName: "Nigeria",
    kycTier: "TIER_2" as const,
    kycStatus: "VERIFIED" as const,
    preferredLanguage: "en" as const,
    registeredAt: new Date().toISOString(),
    mfaEnabled: true,
    biometricEnabled: false,
  };
}
