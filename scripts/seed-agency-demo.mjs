// One-off seed script: creates ONE real Supabase Auth user + agents row +
// agent_float_accounts (backed by real ledger_accounts rows) for the demo
// agent used by the /agent portal. Run with:
//   node --env-file=.env.local scripts/seed-agency-demo.mjs
//
// This does NOT fabricate balances into the ledger silently — it creates
// zero-balance ledger accounts, then performs one real funding posting
// (an initial float allocation) so the numbers you see in the portal are
// backed by actual ledger_entries rows.

import WS from "ws";
// Polyfill global WebSocket for @supabase/supabase-js's realtime client on
// Node < 22 (this script never actually uses realtime, but the client
// constructor eagerly requires a WebSocket implementation to exist).
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

const NG_ORG_ID = "10000000-0000-0000-0000-000000000001"; // KoriePay Nigeria HQ
const AGENT_EMAIL = "garba.kano@korieagent.com";
const AGENT_PASSWORD = "KorieAgent@2026!";

async function main() {
  console.log("== KoriePay Agency Banking demo seed ==");

  // 1. Create (or find) the real Supabase Auth user for the agent.
  let authUserId;
  const { data: existingUsers, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = existingUsers.users.find((u) => u.email === AGENT_EMAIL);

  if (existing) {
    authUserId = existing.id;
    console.log(`Auth user already exists: ${authUserId}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: AGENT_EMAIL,
      password: AGENT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Alhaji Garba Sani", role: "AGENT" },
    });
    if (error) throw error;
    authUserId = data.user.id;
    console.log(`Created auth user: ${authUserId}`);
  }

  // 2. Create the AGENT role membership in organization_members (if roles/org exist).
  const { data: agentRole } = await admin.from("roles").select("id").eq("name", "AGENT").single();

  const { data: userProfile, error: profileErr } = await admin
    .from("user_profiles")
    .upsert(
      {
        auth_user_id: authUserId,
        email: AGENT_EMAIL,
        full_name: "Alhaji Garba Sani",
        phone: "+2348029981234",
        country: "NG",
        status: "ACTIVE",
      },
      { onConflict: "auth_user_id" }
    )
    .select()
    .single();
  if (profileErr) throw profileErr;
  console.log(`user_profiles row: ${userProfile.id}`);

  if (agentRole) {
    const { error: memberErr } = await admin
      .from("organization_members")
      .upsert(
        { org_id: NG_ORG_ID, user_id: userProfile.id, role_id: agentRole.id, status: "ACTIVE" },
        { onConflict: "org_id,user_id" }
      );
    if (memberErr) throw memberErr;
    console.log("organization_members row upserted (AGENT role).");
  }

  // 3. Create the agents row.
  const { data: agent, error: agentErr } = await admin
    .from("agents")
    .upsert(
      {
        org_id: NG_ORG_ID,
        auth_user_id: authUserId,
        agent_code: "AG-NG-KAN-0042",
        agent_name: "Alhaji Garba Sani",
        business_name: "Kano Central Agency Banking Outpost",
        phone: "+2348029981234",
        email: AGENT_EMAIL,
        country: "NG",
        state_or_region: "Kano State",
        city_or_lga: "Fagge LGA, Kano Central",
        tier: "SUPER_AGENT",
        status: "ACTIVE",
        kyc_status: "VERIFIED",
        terminal_id: "POS-NG-KAN-0042",
        daily_cash_limit: 10000000.0, // NGN 10,000,000
        single_transaction_limit: 2000000.0, // NGN 2,000,000
      },
      { onConflict: "agent_code" }
    )
    .select()
    .single();
  if (agentErr) throw agentErr;
  console.log(`agents row: ${agent.id}`);

  // 4. Create the two real ledger_accounts (WALLET_FLOAT + CASH_IN_HAND) and
  //    link them via agent_float_accounts, if not already present.
  const kinds = [
    { kind: "WALLET_FLOAT", name: "Agent Wallet Float — AG-NG-KAN-0042", acctNo: "AGT-FLOAT-NG-0042" },
    { kind: "CASH_IN_HAND", name: "Agent Cash In Hand — AG-NG-KAN-0042", acctNo: "AGT-CASH-NG-0042" },
  ];

  const floatAccountIds = {};

  for (const { kind, name, acctNo } of kinds) {
    const { data: existingFloat } = await admin
      .from("agent_float_accounts")
      .select("id, ledger_account_id")
      .eq("agent_id", agent.id)
      .eq("account_kind", kind)
      .eq("currency", "NGN")
      .maybeSingle();

    if (existingFloat) {
      floatAccountIds[kind] = existingFloat.ledger_account_id;
      console.log(`${kind} ledger account already exists: ${existingFloat.ledger_account_id}`);
      continue;
    }

    const { data: ledgerAccount, error: ledgerErr } = await admin
      .from("ledger_accounts")
      .insert({
        org_id: NG_ORG_ID,
        account_number: acctNo,
        name,
        type: "ASSET",
        currency: "NGN",
        country: "NG",
        balance: 0,
      })
      .select()
      .single();
    if (ledgerErr) throw ledgerErr;

    const { error: linkErr } = await admin.from("agent_float_accounts").insert({
      agent_id: agent.id,
      ledger_account_id: ledgerAccount.id,
      account_kind: kind,
      currency: "NGN",
      cash_threshold_min: 200000.0, // NGN 200,000 (major units, matches live schema convention)
    });
    if (linkErr) throw linkErr;

    floatAccountIds[kind] = ledgerAccount.id;
    console.log(`Created ${kind} ledger account: ${ledgerAccount.id}`);
  }

  // 5. Post ONE real initial funding transaction so the agent's wallet float
  //    starts with a real, ledger-backed balance instead of a fabricated
  //    frontend number. This posts a balanced double-entry transaction:
  //    DEBIT a Treasury/Capital funding account, CREDIT the agent wallet float.
  const { data: existingFundingTx } = await admin
    .from("ledger_transactions")
    .select("id")
    .eq("transaction_reference", "SEED-AGENT-FLOAT-FUNDING-0042")
    .maybeSingle();

  if (existingFundingTx) {
    console.log("Initial float funding already posted, skipping.");
  } else {
    // Ensure a treasury funding (LIABILITY/EQUITY-side) account exists to fund from.
    const { data: existingTreasury } = await admin
      .from("ledger_accounts")
      .select("id, balance")
      .eq("account_number", "TREASURY-NG-AGENT-FUNDING")
      .maybeSingle();

    let treasuryAccountId;
    if (existingTreasury) {
      treasuryAccountId = existingTreasury.id;
    } else {
      const { data: treasuryAccount, error: treasuryErr } = await admin
        .from("ledger_accounts")
        .insert({
          org_id: NG_ORG_ID,
          account_number: "TREASURY-NG-AGENT-FUNDING",
          name: "Treasury — Nigeria Agent Float Funding",
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

    const FUNDING_AMOUNT = 3200000.0; // NGN 3,200,000 (major units, matches live schema convention)

    const { data: fundingTx, error: fundingTxErr } = await admin
      .from("ledger_transactions")
      .insert({
        org_id: NG_ORG_ID,
        transaction_reference: "SEED-AGENT-FLOAT-FUNDING-0042",
        description: "Initial agent wallet float funding (demo seed)",
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
        narration: "Treasury funds agent wallet float (initial seed)",
      },
      {
        transaction_id: fundingTx.id,
        account_id: floatAccountIds.WALLET_FLOAT,
        entry_type: "CREDIT",
        amount: FUNDING_AMOUNT,
        currency: "NGN",
        narration: "Agent wallet float credited from treasury (initial seed)",
      },
    ]);
    if (entriesErr) throw entriesErr;

    await admin
      .from("ledger_accounts")
      .update({ balance: FUNDING_AMOUNT })
      .eq("id", floatAccountIds.WALLET_FLOAT);
    await admin
      .from("ledger_accounts")
      .update({ balance: FUNDING_AMOUNT })
      .eq("id", treasuryAccountId);

    console.log(`Posted initial float funding: ₦${FUNDING_AMOUNT.toLocaleString()}`);
  }

  console.log("\n✅ Seed complete.");
  console.log(`Agent login email: ${AGENT_EMAIL}`);
  console.log(`Agent login password: ${AGENT_PASSWORD}`);
  console.log(`Agent ID (agents.id): ${agent.id}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
