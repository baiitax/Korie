import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth/customer/register
 *
 * Real customer onboarding: creates a genuine Supabase Auth user, a real
 * `public.customers` row, and provisions real NGN + XOF wallets via
 * `provision_customer_wallet` — the same RPC the seed script uses. Nothing
 * here is written to browser state only; a customer created through this
 * endpoint can sign in immediately afterwards with the password they chose
 * and see a real (empty) balance.
 *
 * New customers start at TIER_1 (matches TIER_REQUIREMENTS: no ID document
 * required yet) and PENDING-equivalent verification — see
 * customerVerificationLive.ts — until they submit KYC documents.
 */
const NG_ORG_ID = "10000000-0000-0000-0000-000000000001";
const NE_ORG_ID = "10000000-0000-0000-0000-000000000002";

function fail(code: string, message: string, httpStatus = 422) {
  return createErrorResponse({ code, message, httpStatus, requestId: `KP-REQ-${Date.now()}` });
}

function normalizePhone(raw: string, country: "NG" | "NE"): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (country === "NG") {
    if (cleaned.startsWith("234")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+234${cleaned.slice(1)}`;
    return `+234${cleaned}`;
  }
  if (cleaned.startsWith("227")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+227${cleaned.slice(1)}`;
  return `+227${cleaned}`;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "We couldn't read your request. Please try again.", 400);
  }

  const country = body.country === "NE" ? "NE" : "NG";
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = normalizePhone(String(body.phone || ""), country);
  const password = String(body.password || "");
  const agreeTerms = Boolean(body.agreeTerms);
  const agreeAml = Boolean(body.agreeAml);

  if (!agreeTerms || !agreeAml) {
    return fail("CONSENT_REQUIRED", "You must review and agree to the Terms of Service and AML Banking Disclosures.");
  }
  if (!firstName || !lastName || !email || !phone || !password) {
    return fail("MISSING_FIELDS", "All fields are required to open a verified digital banking account.");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return fail("INVALID_EMAIL", "Please provide a valid email address.");
  }
  if (password.length < 8) {
    return fail("WEAK_PASSWORD", "Please choose a password with at least 8 characters.");
  }

  const admin = getSupabaseAdminClient();
  const orgId = country === "NG" ? NG_ORG_ID : NE_ORG_ID;

  // 1) Real Supabase Auth user.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "CUSTOMER", first_name: firstName, last_name: lastName },
  });

  if (createError || !created?.user) {
    const msg = createError?.message || "";
    if (/already.*registered|already exists/i.test(msg)) {
      return fail("EMAIL_IN_USE", "An account with this email already exists. Please sign in instead.", 409);
    }
    return fail("REGISTRATION_FAILED", "We couldn't create your account right now. Please try again.", 500);
  }

  const authUserId = created.user.id;

  // 2) Real customers row.
  const { data: customerRow, error: customerError } = await admin
    .from("customers")
    .insert({
      org_id: orgId,
      auth_user_id: authUserId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      country,
      kyc_tier: "TIER_1",
      status: "ACTIVE",
    })
    .select("id, org_id, first_name, last_name, email, phone, country, kyc_tier, status")
    .single();

  if (customerError || !customerRow) {
    // Roll back the orphaned Auth user so a failed signup can be retried cleanly.
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    const msg = customerError?.message || "";
    if (/duplicate key|unique/i.test(msg)) {
      return fail("EMAIL_OR_PHONE_IN_USE", "An account with this email or phone number already exists.", 409);
    }
    return fail("REGISTRATION_FAILED", "We couldn't finish setting up your profile. Please try again.", 500);
  }

  // 3) Real wallets in both corridor currencies — matches the seeded demo
  // customers so every real account can transact on day one.
  const [ngnResult, xofResult] = await Promise.all([
    admin.rpc("provision_customer_wallet", { p_customer_id: customerRow.id, p_org_id: orgId, p_currency: "NGN", p_country: "NG" }),
    admin.rpc("provision_customer_wallet", { p_customer_id: customerRow.id, p_org_id: orgId, p_currency: "XOF", p_country: "NE" }),
  ]);

  if (ngnResult.error || xofResult.error) {
    // The customer and Auth user are real and usable even if a wallet
    // provisioning call failed transiently; do not roll those back. The
    // customer can still sign in, and support can provision the missing
    // wallet — but we tell the truth about what happened.
    return createSuccessResponse(
      { registered: true, walletsProvisioned: false },
      {
        code: "ACCOUNT_CREATED_WALLET_PENDING",
        message: "Your account was created, but we couldn't finish setting up your wallets. Please contact support before your first transfer.",
        requestId: `KP-REQ-${Date.now()}`,
        environment: "PRODUCTION",
      },
    );
  }

  return createSuccessResponse(
    { registered: true, walletsProvisioned: true },
    { code: "ACCOUNT_CREATED", message: "Your KoriePay account is ready. Please sign in.", requestId: `KP-REQ-${Date.now()}`, environment: "PRODUCTION" },
  );
}
