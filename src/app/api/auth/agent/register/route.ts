import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/security/apiResponse";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth/agent/register
 *
 * Real self-serve agent onboarding, immediate-login variant. This sits
 * alongside — not instead of — the existing reviewer-gated path
 * (/api/v1/agency/onboarding/apply -> ops decision), which stays for
 * applicants who prefer to apply without creating a login first.
 *
 * Here, a genuine Supabase Auth user + `public.agents` row + zero-balance
 * WALLET_FLOAT/CASH_IN_HAND ledger accounts are created immediately, so the
 * agent can sign in and see their own dashboard right away — but the agents
 * row starts at `status: 'PENDING'`. `authenticateAgentRequest` in
 * agentAuth.ts enforces that a PENDING agent can read their own profile and
 * upload KYC documents, but every money-moving endpoint (cash-in, cash-out,
 * transfer, quote) rejects them with AGENT_NOT_ACTIVE until an ops reviewer
 * (see /api/v1/agency/ops/agents/:id/status) sets them ACTIVE. Nothing here
 * fabricates starting float capital — a real top-up request is required
 * after activation, exactly like the reviewer-approved path.
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
  const fullName = String(body.fullName || "").trim();
  const businessName = String(body.businessName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = normalizePhone(String(body.phone || ""), country);
  const password = String(body.password || "");
  const stateOrRegion = body.stateOrRegion ? String(body.stateOrRegion).trim() : null;
  const cityOrLga = body.cityOrLga ? String(body.cityOrLga).trim() : null;
  const agreeTerms = Boolean(body.agreeTerms);
  const agreeAml = Boolean(body.agreeAml);

  if (!agreeTerms || !agreeAml) {
    return fail("CONSENT_REQUIRED", "You must review and agree to the Terms of Service and AML Banking Disclosures.");
  }
  if (!fullName || !businessName || !email || !phone || !password) {
    return fail("MISSING_FIELDS", "Full name, business name, phone, email and password are all required to apply as an agent.");
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
    user_metadata: { role: "AGENT", full_name: fullName },
  });

  if (createError || !created?.user) {
    const msg = createError?.message || "";
    if (/already.*registered|already exists/i.test(msg)) {
      return fail("EMAIL_IN_USE", "An account with this email already exists. Please sign in instead.", 409);
    }
    return fail("REGISTRATION_FAILED", "We couldn't create your account right now. Please try again.", 500);
  }

  const authUserId = created.user.id;

  // 2) Real user_profiles + organization_members rows so the agent shows up
  // in the same identity graph as reviewer-approved agents.
  const { data: userProfile } = await admin
    .from("user_profiles")
    .upsert(
      { auth_user_id: authUserId, email, full_name: fullName, phone, country, status: "ACTIVE" },
      { onConflict: "auth_user_id" },
    )
    .select()
    .single();

  if (userProfile) {
    const { data: agentRole } = await admin.from("roles").select("id").eq("name", "AGENT").maybeSingle();
    if (agentRole) {
      await admin
        .from("organization_members")
        .upsert(
          { org_id: orgId, user_id: userProfile.id, role_id: agentRole.id, status: "ACTIVE" },
          { onConflict: "org_id,user_id" },
        );
    }
  }

  // 3) Real agents row — PENDING until ops review, exactly like the
  // apply-then-approve path, but the agent can sign in immediately.
  const agentCodePrefix = country === "NG" ? "AG-NG" : "AG-NE";
  const agentCode = `${agentCodePrefix}-${authUserId.slice(0, 6).toUpperCase()}`;

  const { data: agentRow, error: agentError } = await admin
    .from("agents")
    .insert({
      org_id: orgId,
      auth_user_id: authUserId,
      agent_code: agentCode,
      agent_name: fullName,
      business_name: businessName,
      phone,
      email,
      country,
      state_or_region: stateOrRegion,
      city_or_lga: cityOrLga,
      tier: "TIER_1",
      status: "PENDING",
      kyc_status: "PENDING",
    })
    .select("id, org_id, agent_code, status")
    .single();

  if (agentError || !agentRow) {
    // Roll back the orphaned Auth user so a failed signup can be retried cleanly.
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    const msg = agentError?.message || "";
    if (/duplicate key|unique/i.test(msg)) {
      return fail("EMAIL_OR_PHONE_IN_USE", "An account with this email or phone number already exists.", 409);
    }
    return fail("REGISTRATION_FAILED", "We couldn't finish setting up your agent profile. Please try again.", 500);
  }

  // 4) Zero-balance WALLET_FLOAT + CASH_IN_HAND ledger accounts — no
  // starting capital is invented; a real float top-up is required once
  // ops activates the account.
  const currency = country === "NG" ? "NGN" : "XOF";
  const { data: floatAccount } = await admin
    .from("ledger_accounts")
    .insert({
      org_id: orgId,
      account_number: `AGT-FLOAT-${country}-${agentRow.id.slice(0, 8).toUpperCase()}`,
      name: `Agent Wallet Float — ${agentCode}`,
      type: "ASSET",
      currency,
      country,
      balance: 0,
    })
    .select()
    .single();

  const { data: cashAccount } = await admin
    .from("ledger_accounts")
    .insert({
      org_id: orgId,
      account_number: `AGT-CASH-${country}-${agentRow.id.slice(0, 8).toUpperCase()}`,
      name: `Agent Cash In Hand — ${agentCode}`,
      type: "ASSET",
      currency,
      country,
      balance: 0,
    })
    .select()
    .single();

  let walletsProvisioned = false;
  if (floatAccount && cashAccount) {
    const { error: floatLinkError } = await admin.from("agent_float_accounts").insert([
      { agent_id: agentRow.id, ledger_account_id: floatAccount.id, account_kind: "WALLET_FLOAT", currency },
      { agent_id: agentRow.id, ledger_account_id: cashAccount.id, account_kind: "CASH_IN_HAND", currency },
    ]);
    walletsProvisioned = !floatLinkError;
  }

  await admin.from("agent_audit_logs").insert({
    agent_id: agentRow.id,
    action: "AGENT_SELF_REGISTERED",
    target_type: "agents",
    target_id: agentRow.id,
    result: "SUCCESS",
    reason: `Self-service registration; agent_code=${agentCode}; awaiting ops review before activation.`,
  });

  return createSuccessResponse(
    { registered: true, agentCode, status: agentRow.status, walletsProvisioned },
    {
      code: "AGENT_ACCOUNT_CREATED_PENDING_REVIEW",
      message: "Your agent account has been created. Sign in to view your dashboard — transactions unlock once our team verifies your account.",
      requestId: `KP-REQ-${Date.now()}`,
      environment: "PRODUCTION",
    },
  );
}
