// One-off seed script: creates ONE real Supabase Auth user + organizations
// row + aggregators row + aggregator_staff_users row (backed by real
// ledger_accounts for float/reserve/escrow) for the demo aggregator used by
// the /aggregator portal. Run with:
//   node --env-file=.env.local scripts/seed-aggregator-demo.mjs
//
// Mirrors scripts/seed-agency-demo.mjs: no fabricated balances written
// directly onto a ledger_accounts row — the float account starts at 0 and
// then receives ONE real, balanced double-entry funding transaction so the
// number in the portal is backed by actual ledger_entries rows, not a
// hardcoded field write.

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

const AGGREGATOR_EMAIL = "hassan.bawa@korieaggregator.com";
const AGGREGATOR_PASSWORD = "KorieAggregator@2026!";
const ORG_SLUG = "korie-sahel-super-aggregator-ng";
const AGGREGATOR_CODE = "AGG-NG-KAN-0001";

async function main() {
  console.log("== KoriePay Aggregator Portal demo seed ==");

  // 1. Create (or find) the organization the aggregator business operates as.
  let org = (
    await admin.from("organizations").select("id").eq("slug", ORG_SLUG).maybeSingle()
  ).data;

  if (!org) {
    const { data, error } = await admin
      .from("organizations")
      .insert({
        name: "Sahel Super Aggregator Network Ltd",
        slug: ORG_SLUG,
        country: "NG",
        jurisdiction: "CBN Nigeria",
        business_type: "AGGREGATOR",
        tier: "TIER_1",
        verification_status: "VERIFIED",
        default_currency: "NGN",
      })
      .select()
      .single();
    if (error) throw error;
    org = data;
    console.log(`Created organization: ${org.id}`);
  } else {
    console.log(`Organization already exists: ${org.id}`);
  }

  // 2. Create (or find) the real Supabase Auth user for the aggregator's owner.
  let authUserId;
  const { data: existingUsers, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = existingUsers.users.find((u) => u.email === AGGREGATOR_EMAIL);

  if (existing) {
    authUserId = existing.id;
    console.log(`Auth user already exists: ${authUserId}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: AGGREGATOR_EMAIL,
      password: AGGREGATOR_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Hassan Bawa", role: "AGGREGATOR_OWNER" },
    });
    if (error) throw error;
    authUserId = data.user.id;
    console.log(`Created auth user: ${authUserId}`);
  }

  // 3. user_profiles + organization_members (AGGREGATOR_OWNER role), same
  //    pattern as every other portal's demo seed.
  const { data: ownerRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "AGGREGATOR_OWNER")
    .single();

  const { data: userProfile, error: profileErr } = await admin
    .from("user_profiles")
    .upsert(
      {
        auth_user_id: authUserId,
        email: AGGREGATOR_EMAIL,
        full_name: "Hassan Bawa",
        phone: "+2348037761234",
        country: "NG",
        status: "ACTIVE",
      },
      { onConflict: "auth_user_id" }
    )
    .select()
    .single();
  if (profileErr) throw profileErr;
  console.log(`user_profiles row: ${userProfile.id}`);

  if (ownerRole) {
    const { error: memberErr } = await admin
      .from("organization_members")
      .upsert(
        { org_id: org.id, user_id: userProfile.id, role_id: ownerRole.id, status: "ACTIVE" },
        { onConflict: "org_id,user_id" }
      );
    if (memberErr) throw memberErr;
    console.log("organization_members row upserted (AGGREGATOR_OWNER role).");
  }

  // 4. Real ledger accounts for float / reserve / escrow (zero-balance until
  //    the funding posting below), then the aggregators row referencing them.
  const ledgerSpecs = [
    { key: "float", acctNo: "AGG-FLOAT-NG-0001", name: "Aggregator Float — AGG-NG-KAN-0001" },
    { key: "reserve", acctNo: "AGG-RESERVE-NG-0001", name: "Aggregator Reserve — AGG-NG-KAN-0001" },
    { key: "escrow", acctNo: "AGG-ESCROW-NG-0001", name: "Aggregator Escrow — AGG-NG-KAN-0001" },
  ];

  const ledgerIds = {};
  for (const { key, acctNo, name } of ledgerSpecs) {
    const { data: existingAcct } = await admin
      .from("ledger_accounts")
      .select("id")
      .eq("account_number", acctNo)
      .maybeSingle();

    if (existingAcct) {
      ledgerIds[key] = existingAcct.id;
      console.log(`${key} ledger account already exists: ${existingAcct.id}`);
      continue;
    }

    const { data: created, error: createErr } = await admin
      .from("ledger_accounts")
      .insert({
        org_id: org.id,
        account_number: acctNo,
        name,
        type: "ASSET",
        currency: "NGN",
        country: "NG",
        balance: 0,
      })
      .select()
      .single();
    if (createErr) throw createErr;
    ledgerIds[key] = created.id;
    console.log(`Created ${key} ledger account: ${created.id}`);
  }

  const { data: aggregator, error: aggErr } = await admin
    .from("aggregators")
    .upsert(
      {
        org_id: org.id,
        aggregator_code: AGGREGATOR_CODE,
        business_name: "Sahel Super Aggregator Network Ltd",
        legal_entity: "Sahel Super Aggregator Network Limited",
        rc_number: "RC-1928374",
        country: "NG",
        currency: "NGN",
        tier: "TIER_1_SUPER_AGGREGATOR",
        status: "ACTIVE",
        kyb_status: "VERIFIED",
        headquarters: "Kano, Nigeria",
        contact_email: AGGREGATOR_EMAIL,
        contact_phone: "+2348037761234",
        settlement_bank: "Providus Bank",
        settlement_account_number: "0198237465",
        float_account_id: ledgerIds.float,
        reserve_account_id: ledgerIds.reserve,
        escrow_account_id: ledgerIds.escrow,
      },
      { onConflict: "aggregator_code" }
    )
    .select()
    .single();
  if (aggErr) throw aggErr;
  console.log(`aggregators row: ${aggregator.id}`);

  // 5. Staff login row linking the real auth user to this aggregator.
  const { data: staffRow, error: staffErr } = await admin
    .from("aggregator_staff_users")
    .upsert(
      {
        aggregator_id: aggregator.id,
        auth_user_id: authUserId,
        full_name: "Hassan Bawa",
        email: AGGREGATOR_EMAIL,
        phone: "+2348037761234",
        role: "AGGREGATOR_OWNER",
        territory_scope: ["Kano State", "Jigawa State", "Katsina State"],
        status: "ACTIVE",
      },
      { onConflict: "aggregator_id,email" }
    )
    .select()
    .single();
  if (staffErr) throw staffErr;
  console.log(`aggregator_staff_users row: ${staffRow.id}`);

  // 6. Post ONE real initial funding transaction into the float account so
  //    the portal shows a genuine ledger-backed balance, not a fabricated one.
  const FUNDING_REF = "SEED-AGGREGATOR-FLOAT-FUNDING-0001";
  const { data: existingFundingTx } = await admin
    .from("ledger_transactions")
    .select("id")
    .eq("transaction_reference", FUNDING_REF)
    .maybeSingle();

  if (existingFundingTx) {
    console.log("Initial float funding already posted, skipping.");
  } else {
    const { data: existingTreasury } = await admin
      .from("ledger_accounts")
      .select("id")
      .eq("account_number", "TREASURY-NG-AGGREGATOR-FUNDING")
      .maybeSingle();

    let treasuryAccountId;
    if (existingTreasury) {
      treasuryAccountId = existingTreasury.id;
    } else {
      const { data: treasuryAccount, error: treasuryErr } = await admin
        .from("ledger_accounts")
        .insert({
          org_id: org.id,
          account_number: "TREASURY-NG-AGGREGATOR-FUNDING",
          name: "Treasury — Nigeria Aggregator Float Funding",
          type: "EQUITY",
          currency: "NGN",
          country: "NG",
          balance: 0,
        })
        .select()
        .single();
      if (treasuryErr) throw treasuryErr;
      treasuryAccountId = treasuryAccount.id;
    }

    const FUNDING_AMOUNT = 45000000.0; // NGN 45,000,000 — a super-aggregator-scale float

    const { data: fundingTx, error: fundingTxErr } = await admin
      .from("ledger_transactions")
      .insert({
        org_id: org.id,
        transaction_reference: FUNDING_REF,
        description: "Initial aggregator float funding (demo seed)",
        total_amount: FUNDING_AMOUNT,
        currency: "NGN",
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
        currency: "NGN",
        narration: "Treasury funds aggregator float (initial seed)",
      },
      {
        transaction_id: fundingTx.id,
        account_id: ledgerIds.float,
        entry_type: "CREDIT",
        amount: FUNDING_AMOUNT,
        currency: "NGN",
        narration: "Aggregator float credited from treasury (initial seed)",
      },
    ]);
    if (entriesErr) throw entriesErr;

    await admin.from("ledger_accounts").update({ balance: FUNDING_AMOUNT }).eq("id", ledgerIds.float);
    await admin.from("ledger_accounts").update({ balance: FUNDING_AMOUNT }).eq("id", treasuryAccountId);

    console.log(`Posted initial float funding: ₦${FUNDING_AMOUNT.toLocaleString()}`);
  }

  console.log("\n✅ Seed complete.");
  console.log(`Aggregator login email: ${AGGREGATOR_EMAIL}`);
  console.log(`Aggregator login password: ${AGGREGATOR_PASSWORD}`);
  console.log(`Aggregator ID (aggregators.id): ${aggregator.id}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
