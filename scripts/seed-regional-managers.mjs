// One-off seed script for the Regional Manager portal.
//
// What it creates (all REAL reference structure, no fabricated operations):
//   1. A Kano territory row in aggregator_territories for the existing,
//      verified aggregator (AGG-NG-KAN-0001) — correcting the empty
//      territory register so the agent→aggregator graph is real.
//   2. Links the existing Kano agent (AG-NG-KAN-0042) to that territory.
//   3. Two Regional Manager auth users + regional_manager_users rows:
//        • NG manager supervising Kano/Jigawa/Katsina (has live data)
//        • NE manager supervising Maradi/Zinder (honest empty states)
//
// Run with:  node --env-file=.env.local scripts/seed-regional-managers.mjs
// The migration 20260910000050_regional_manager_portal.sql must be applied first.

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

const PASSWORD = "KorieRegional@2026!";

const MANAGERS = [
  {
    email: "musa.danfulani@koriepay.internal",
    fullName: "Musa Danfulani",
    phone: "+234 800 000 0001",
    country: "NG",
    territories: ["Kano State", "Jigawa State", "Katsina State"],
  },
  {
    email: "ibrahim.souley@koriepay.internal",
    fullName: "Ibrahim Souley",
    phone: "+227 90 00 00 02",
    country: "NE",
    territories: ["Maradi Region", "Zinder Region"],
  },
];

async function ensureAuthUser(email, fullName) {
  const { data: existingUsers, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = existingUsers.users.find((u) => u.email === email);
  if (existing) {
    console.log(`Auth user already exists: ${email}`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "REGIONAL_MANAGER" },
  });
  if (error) throw error;
  console.log(`Created auth user: ${email}`);
  return data.user.id;
}

async function main() {
  console.log("== Regional Manager portal seed ==");

  /* 1. Territory register: a real Kano territory for the real aggregator. */
  const { data: agg } = await admin
    .from("aggregators")
    .select("id, aggregator_code, business_name, country")
    .eq("aggregator_code", "AGG-NG-KAN-0001")
    .maybeSingle();
  if (!agg) throw new Error("Aggregator AGG-NG-KAN-0001 not found — seed it first (scripts/seed-merchant-demo.mjs).");
  console.log(`Aggregator: ${agg.business_name} (${agg.aggregator_code})`);

  let territoryId;
  const { data: existingTerritory } = await admin
    .from("aggregator_territories")
    .select("id, code")
    .eq("aggregator_id", agg.id)
    .eq("state_or_region", "Kano State")
    .maybeSingle();
  if (existingTerritory) {
    territoryId = existingTerritory.id;
    console.log(`Territory already exists: ${existingTerritory.code}`);
  } else {
    const { data: created, error } = await admin
      .from("aggregator_territories")
      .insert({
        aggregator_id: agg.id,
        name: "Kano Metro & Central",
        code: "TER-NG-KAN-001",
        country: "NG",
        state_or_region: "Kano State",
        lga_or_commune: "Kano Municipal",
        hub_address: "Sahel Commerce Tower, Murtala Mohammed Way, Kano",
        hub_phone: "+234 64 881 920",
        supervisor_name: "Hassan Bawa",
      })
      .select("id, code")
      .single();
    if (error) throw error;
    territoryId = created.id;
    console.log(`Created territory: ${created.code} (Kano State)`);
  }

  /* 2. Link the real Kano agent to the territory. */
  const { data: agent } = await admin
    .from("agents")
    .select("id, agent_code, state_or_region, aggregator_territory_id")
    .eq("agent_code", "AG-NG-KAN-0042")
    .maybeSingle();
  if (agent) {
    if (!agent.aggregator_territory_id) {
      const { error } = await admin
        .from("agents")
        .update({ aggregator_territory_id: territoryId })
        .eq("id", agent.id);
      if (error) throw error;
      console.log(`Linked agent ${agent.agent_code} to territory TER-NG-KAN-001`);
    } else {
      console.log(`Agent ${agent.agent_code} already linked to a territory.`);
    }
  } else {
    console.log("Agent AG-NG-KAN-0042 not found (skipping link).");
  }

  /* 3. Regional managers. */
  for (const m of MANAGERS) {
    const authUserId = await ensureAuthUser(m.email, m.fullName);
    const { data: existingRow } = await admin
      .from("regional_manager_users")
      .select("id")
      .eq("email", m.email)
      .maybeSingle();
    if (existingRow) {
      await admin
        .from("regional_manager_users")
        .update({ territories: m.territories, country: m.country, full_name: m.fullName, phone: m.phone })
        .eq("id", existingRow.id);
      console.log(`Updated regional manager: ${m.email} (${m.country}: ${m.territories.join(", ")})`);
    } else {
      const { error } = await admin.from("regional_manager_users").insert({
        auth_user_id: authUserId,
        full_name: m.fullName,
        email: m.email,
        phone: m.phone,
        country: m.country,
        territories: m.territories,
        status: "ACTIVE",
      });
      if (error) throw error;
      console.log(`Created regional manager: ${m.email} (${m.country}: ${m.territories.join(", ")})`);
    }
  }

  /* 4. Support-desk officer rows for the managers (the documented cross-desk
   *    pattern: internal staff carry a support_officers row so their
   *    escalations attribute to a real identity). Least-privilege role:
   *    SUPPORT_READ_ONLY — the regional portal's own API decides what a
   *    manager may file; the desk role grants nothing extra. */
  for (const m of MANAGERS) {
    const { data: rmRow } = await admin
      .from("regional_manager_users")
      .select("id, auth_user_id")
      .eq("email", m.email)
      .maybeSingle();
    if (!rmRow) continue;
    const { data: existingOfficer } = await admin
      .from("support_officers")
      .select("id")
      .eq("auth_user_id", rmRow.auth_user_id)
      .maybeSingle();
    if (existingOfficer) {
      console.log(`Officer row already exists for ${m.email}`);
      continue;
    }
    const { error } = await admin.from("support_officers").insert({
      org_id: "10000000-0000-0000-0000-000000000001",
      auth_user_id: rmRow.auth_user_id,
      officer_code: `RM-${m.country}-${m.fullName.split(" ").pop().toUpperCase().slice(0, 6)}`,
      full_name: m.fullName,
      email: m.email,
      role: "SUPPORT_READ_ONLY",
      tier: "TIER_0_AUTOMATION",
      jurisdiction: m.country,
      languages: ["en", "fr"],
      max_capacity: 0,
      status: "OFFLINE",
    });
    if (error) throw error;
    console.log(`Created support officer (SUPPORT_READ_ONLY) for ${m.email}`);
  }

  console.log("\nDone. Sign-in (both use password " + PASSWORD + "):");
  MANAGERS.forEach((m) => console.log(`  ${m.email} — ${m.country} — ${m.territories.join(", ")}`));
}

main().catch((e) => {
  console.error("SEED FAILED:", e.message);
  process.exit(1);
});
