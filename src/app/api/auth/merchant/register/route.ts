import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth/merchant/register
 *
 * Real self-serve Business/Merchant onboarding: creates a genuine Supabase
 * Auth user, a real `organizations` row (business_type = 'MERCHANT'), a
 * `merchant_profiles` row (status = 'PENDING', kyb_status = 'PENDING'), the
 * MERCHANT_OWNER `merchant_staff_users` row linking that Auth user, and a
 * zero-balance settlement ledger account. The merchant can sign in and see
 * their own dashboard immediately, but `authenticateMerchantRequest`
 * rejects money-moving actions (settlement payouts, live API keys) with
 * MERCHANT_NOT_ACTIVE until an ops reviewer verifies KYB and activates the
 * account — mirroring the agent self-serve hold pattern exactly. No
 * starting balance or approved KYB status is ever fabricated here.
 */
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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "We couldn't read your request. Please try again.", 400);
  }

  const country = body.country === "NE" ? "NE" : "NG";
  const businessName = String(body.businessName || "").trim();
  const tradingName = String(body.tradingName || businessName || "").trim();
  const ownerFullName = String(body.ownerFullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = normalizePhone(String(body.phone || ""), country);
  const password = String(body.password || "");
  const category = body.category ? String(body.category).trim() : "GENERAL_RETAIL";
  const cacNumber = body.cacNumber ? String(body.cacNumber).trim() : null;
  const tinNumber = body.tinNumber ? String(body.tinNumber).trim() : null;
  const agreeTerms = Boolean(body.agreeTerms);
  const agreeAml = Boolean(body.agreeAml);

  if (!agreeTerms || !agreeAml) {
    return fail("CONSENT_REQUIRED", "You must review and agree to the Terms of Service and AML Banking Disclosures.");
  }
  if (!businessName || !ownerFullName || !email || !phone || !password) {
    return fail("MISSING_FIELDS", "Business name, owner name, phone, email and password are all required to register a business account.");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return fail("INVALID_EMAIL", "Please provide a valid email address.");
  }
  if (password.length < 8) {
    return fail("WEAK_PASSWORD", "Please choose a password with at least 8 characters.");
  }

  const admin = getSupabaseAdminClient();
  const currency = country === "NG" ? "NGN" : "XOF";

  // 1) Real Supabase Auth user.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "MERCHANT_OWNER", full_name: ownerFullName },
  });

  if (createError || !created?.user) {
    const msg = createError?.message || "";
    if (/already.*registered|already exists/i.test(msg)) {
      return fail("EMAIL_IN_USE", "An account with this email already exists. Please sign in instead.", 409);
    }
    return fail("REGISTRATION_FAILED", "We couldn't create your account right now. Please try again.", 500);
  }

  const authUserId = created.user.id;

  // 2) Real organizations row for this business — every merchant is its own
  // tenant, distinct from the shared HQ organizations used by agents.
  const baseSlug = slugify(businessName) || `merchant-${authUserId.slice(0, 8)}`;
  let orgSlug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
    if (!existing) break;
    orgSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const { data: orgRow, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: businessName,
      slug: orgSlug,
      country,
      business_type: "MERCHANT",
      tier: "TIER_1",
      verification_status: "PENDING",
      default_currency: currency,
    })
    .select("id")
    .single();

  if (orgError || !orgRow) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return fail("REGISTRATION_FAILED", "We couldn't set up your business workspace. Please try again.", 500);
  }

  // 3) Real merchant_profiles row — PENDING until ops review.
  const merchantCode = `MER-${country}-${authUserId.slice(0, 6).toUpperCase()}`;

  const { data: merchantRow, error: merchantError } = await admin
    .from("merchant_profiles")
    .insert({
      org_id: orgRow.id,
      merchant_code: merchantCode,
      business_name: businessName,
      trading_name: tradingName,
      cac_number: cacNumber,
      tin_number: tinNumber,
      email,
      phone,
      country,
      currency,
      category,
      tier: "TIER_1",
      status: "PENDING",
      kyb_status: "PENDING",
    })
    .select("id, merchant_code, status")
    .single();

  if (merchantError || !merchantRow) {
    await admin.from("organizations").delete().eq("id", orgRow.id);
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    const msg = merchantError?.message || "";
    if (/duplicate key|unique/i.test(msg)) {
      return fail("EMAIL_IN_USE", "A business account with this email already exists.", 409);
    }
    return fail("REGISTRATION_FAILED", "We couldn't finish setting up your business profile. Please try again.", 500);
  }

  // 4) MERCHANT_OWNER staff row linking the real Auth user.
  const { error: staffError } = await admin.from("merchant_staff_users").insert({
    merchant_id: merchantRow.id,
    auth_user_id: authUserId,
    full_name: ownerFullName,
    email,
    phone,
    role: "MERCHANT_OWNER",
    status: "ACTIVE",
  });

  if (staffError) {
    await admin.from("merchant_profiles").delete().eq("id", merchantRow.id);
    await admin.from("organizations").delete().eq("id", orgRow.id);
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return fail("REGISTRATION_FAILED", "We couldn't finish linking your account. Please try again.", 500);
  }

  // 5) Zero-balance settlement ledger account — no starting capital invented.
  let settlementProvisioned = false;
  const { error: settleError } = await admin.rpc("provision_merchant_settlement_account", {
    p_merchant_id: merchantRow.id,
    p_org_id: orgRow.id,
    p_currency: currency,
    p_country: country,
  });
  settlementProvisioned = !settleError;

  await admin.from("merchant_audit_logs").insert({
    merchant_id: merchantRow.id,
    action: "MERCHANT_SELF_REGISTERED",
    target_type: "merchant_profiles",
    target_id: merchantRow.id,
    result: "SUCCESS",
    reason: `Self-service registration; merchant_code=${merchantCode}; awaiting ops KYB review before activation.`,
  });

  return createSuccessResponse(
    { registered: true, merchantCode, status: merchantRow.status, settlementProvisioned },
    {
      code: "MERCHANT_ACCOUNT_CREATED_PENDING_REVIEW",
      message: "Your business account has been created. Sign in to view your dashboard — settlements and live payments unlock once our team verifies your business.",
      requestId: `KP-REQ-${Date.now()}`,
      environment: "PRODUCTION",
    },
  );
}
