// One-off seed script: creates ONE real Supabase Auth user + organizations
// row (business_type = 'MERCHANT') + merchant_profiles row + a
// MERCHANT_OWNER merchant_staff_users row + a real settlement ledger
// account (via the same provision_merchant_settlement_account RPC used by
// self-serve registration) for the demo Business/Merchant account used by
// the /merchant portal. Run with:
//   node --env-file=.env.local scripts/seed-merchant-demo.mjs
//
// Unlike a brand-new self-registration (which starts PENDING/PENDING for
// real ops review), this demo account is activated (status ACTIVE,
// kyb_status VERIFIED) so it demonstrates a fully working merchant
// dashboard end-to-end. It does NOT fabricate a settlement balance into the
// ledger silently — it provisions a zero-balance settlement account, then
// posts one real double-entry funding transaction so any balance shown in
// the portal is backed by actual ledger_entries rows.

import WS from "ws";
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WS;
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MERCHANT_EMAIL = "amaka.owner@koriemerchant.com";
const MERCHANT_PASSWORD = "KorieMerchant@2026!";
const OWNER_FULL_NAME = "Amaka Nwosu";
const BUSINESS_NAME = "Nwosu Family Provisions Store";
const TRADING_NAME = "Nwosu Provisions";
const COUNTRY = "NG";
const CURRENCY = "NGN";
const PHONE = "+2348135550199";

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

async function main() {
  console.log("== KoriePay Merchant Portal demo seed ==");

  // 1. Create (or find) the real Supabase Auth user for the merchant owner.
  let authUserId;
  const { data: existingUsers, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = existingUsers.users.find((u) => u.email === MERCHANT_EMAIL);

  if (existing) {
    authUserId = existing.id;
    console.log(`Auth user already exists: ${authUserId}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: MERCHANT_EMAIL,
      password: MERCHANT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: OWNER_FULL_NAME, role: "MERCHANT_OWNER" },
    });
    if (error) throw error;
    authUserId = data.user.id;
    console.log(`Created auth user: ${authUserId}`);
  }

  // 2. Real organizations row for this business (its own tenant).
  let orgRow;
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slugify(BUSINESS_NAME))
    .maybeSingle();

  if (existingOrg) {
    orgRow = existingOrg;
    console.log(`organizations row already exists: ${orgRow.id}`);
  } else {
    const { data: newOrg, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: BUSINESS_NAME,
        slug: slugify(BUSINESS_NAME),
        country: COUNTRY,
        business_type: "MERCHANT",
        tier: "TIER_1",
        verification_status: "VERIFIED",
        default_currency: CURRENCY,
      })
      .select("id")
      .single();
    if (orgErr) throw orgErr;
    orgRow = newOrg;
    console.log(`Created organizations row: ${orgRow.id}`);
  }

  // 3. Real merchant_profiles row — activated for demo purposes.
  const merchantCode = `MER-${COUNTRY}-${authUserId.slice(0, 6).toUpperCase()}`;

  const { data: merchantRow, error: merchantErr } = await admin
    .from("merchant_profiles")
    .upsert(
      {
        org_id: orgRow.id,
        merchant_code: merchantCode,
        business_name: BUSINESS_NAME,
        trading_name: TRADING_NAME,
        email: MERCHANT_EMAIL,
        phone: PHONE,
        country: COUNTRY,
        currency: CURRENCY,
        category: "GENERAL_RETAIL",
        tier: "TIER_1",
        status: "ACTIVE",
        kyb_status: "VERIFIED",
      },
      { onConflict: "org_id" }
    )
    .select("id, merchant_code, status")
    .single();
  if (merchantErr) throw merchantErr;
  console.log(`merchant_profiles row: ${merchantRow.id} (${merchantRow.status})`);

  // 4. MERCHANT_OWNER staff row linking the real Auth user.
  const { error: staffErr } = await admin.from("merchant_staff_users").upsert(
    {
      merchant_id: merchantRow.id,
      auth_user_id: authUserId,
      full_name: OWNER_FULL_NAME,
      email: MERCHANT_EMAIL,
      phone: PHONE,
      role: "MERCHANT_OWNER",
      status: "ACTIVE",
    },
    { onConflict: "auth_user_id" }
  );
  if (staffErr) throw staffErr;
  console.log("merchant_staff_users row upserted (MERCHANT_OWNER).");

  // 5. Real zero-balance settlement ledger account via the same RPC used by
  //    self-serve registration — no starting capital invented here.
  const { data: settlementAccount, error: settleErr } = await admin.rpc(
    "provision_merchant_settlement_account",
    {
      p_merchant_id: merchantRow.id,
      p_org_id: orgRow.id,
      p_currency: CURRENCY,
      p_country: COUNTRY,
    }
  );
  if (settleErr) throw settleErr;
  console.log(`Settlement ledger account: ${settlementAccount.id} (balance ${settlementAccount.balance})`);

  // 6. Post ONE real funding transaction so the demo settlement balance is
  //    backed by actual ledger_entries rows instead of a fabricated number.
  const FUNDING_REF = "SEED-MERCHANT-SETTLEMENT-FUNDING-0001";
  const { data: existingFundingTx } = await admin
    .from("ledger_transactions")
    .select("id")
    .eq("transaction_reference", FUNDING_REF)
    .maybeSingle();

  if (existingFundingTx) {
    console.log("Initial settlement funding already posted, skipping.");
  } else {
    const TREASURY_ACCOUNT_NUMBER = "TREASURY-NG-MERCHANT-SETTLEMENT-FUNDING";
    let treasuryAccountId;
    const { data: existingTreasury } = await admin
      .from("ledger_accounts")
      .select("id")
      .eq("account_number", TREASURY_ACCOUNT_NUMBER)
      .maybeSingle();

    if (existingTreasury) {
      treasuryAccountId = existingTreasury.id;
    } else {
      const { data: treasuryAccount, error: treasuryErr } = await admin
        .from("ledger_accounts")
        .insert({
          org_id: orgRow.id,
          account_number: TREASURY_ACCOUNT_NUMBER,
          name: "Treasury — Merchant Settlement Funding (Demo)",
          type: "EQUITY",
          currency: CURRENCY,
          country: COUNTRY,
          balance: 0,
        })
        .select()
        .single();
      if (treasuryErr) throw treasuryErr;
      treasuryAccountId = treasuryAccount.id;
    }

    const FUNDING_AMOUNT = 480000.0; // NGN 480,000 — demo settled sales volume

    const { data: fundingTx, error: fundingTxErr } = await admin
      .from("ledger_transactions")
      .insert({
        org_id: orgRow.id,
        transaction_reference: FUNDING_REF,
        description: "Demo settled sales — initial merchant settlement funding (seed)",
        total_amount: FUNDING_AMOUNT,
        currency: CURRENCY,
        status: "COMMITTED",
      })
      .select()
      .single();
    if (fundingTxErr) throw fundingTxErr;

    const { error: entriesErr } = await admin.from("ledger_entries").insert([
      {
        transaction_id: fundingTx.id,
        account_id: treasuryAccountId,
        entry_type: "DEBIT",
        amount: FUNDING_AMOUNT,
        currency: CURRENCY,
        narration: "Treasury funds merchant settlement account (demo seed)",
      },
      {
        transaction_id: fundingTx.id,
        account_id: settlementAccount.id,
        entry_type: "CREDIT",
        amount: FUNDING_AMOUNT,
        currency: CURRENCY,
        narration: "Merchant settlement account credited from treasury (demo seed)",
      },
    ]);
    if (entriesErr) throw entriesErr;

    await admin
      .from("ledger_accounts")
      .update({ balance: FUNDING_AMOUNT })
      .eq("id", settlementAccount.id);
    await admin
      .from("ledger_accounts")
      .update({ balance: FUNDING_AMOUNT })
      .eq("id", treasuryAccountId);

    console.log(`Posted initial settlement funding: ₦${FUNDING_AMOUNT.toLocaleString()}`);
  }

  console.log("\n✅ Seed complete.");
  console.log(`Merchant login email: ${MERCHANT_EMAIL}`);
  console.log(`Merchant login password: ${MERCHANT_PASSWORD}`);
  console.log(`Merchant ID (merchant_profiles.id): ${merchantRow.id}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
