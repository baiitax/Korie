// One-off script to provision real Supabase Auth users + public.support_officers
// rows for the KoriePay Support Portal, replacing the old in-memory
// SEED_OFFICERS roster. Safe to re-run (idempotent upserts).
//
// Org assignment: NG-jurisdiction officers -> KoriePay Nigeria HQ,
// NE-jurisdiction officers -> KoriePay Niger HQ, CROSS_BORDER officers ->
// KoriePay Nigeria HQ (their org membership doesn't gate jurisdiction access;
// support_officers.jurisdiction is what the app checks).
import WS from "ws";
globalThis.WebSocket = WS;

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NG_HQ = "10000000-0000-0000-0000-000000000001";
const NE_HQ = "10000000-0000-0000-0000-000000000002";
const DEFAULT_PASSWORD = "KorieSupport@2026!";

const OFFICERS = [
  {
    code: "OFF-SUP-01",
    fullName: "Zainab Abubakar",
    email: "zainab.support@koriepay.internal",
    role: "TIER_1_JUNIOR",
    tier: "TIER_1_JUNIOR",
    jurisdiction: "NG",
    languages: ["en", "ha"],
    maxCapacity: 12,
    qaScore: 94.5,
    skills: ["Transfers", "Agent POS", "Airtime/Data", "Hausa Support"],
    joinedDate: "2026-06-15",
    status: "ONLINE",
  },
  {
    code: "OFF-SUP-02",
    fullName: "Abdoul-Razak Souley",
    email: "abdoul.support@koriepay.internal",
    role: "TIER_1_JUNIOR",
    tier: "TIER_1_JUNIOR",
    jurisdiction: "NE",
    languages: ["fr", "ha"],
    maxCapacity: 12,
    qaScore: 92.0,
    skills: ["XOF Transfers", "Coris Bank Node", "Merchant Payouts", "French Support"],
    joinedDate: "2026-07-01",
    status: "ONLINE",
  },
  {
    code: "OFF-SUP-03",
    fullName: "Chidinma Eze",
    email: "chidinma.senior@koriepay.internal",
    role: "TIER_2_SENIOR",
    tier: "TIER_2_SENIOR",
    jurisdiction: "NG",
    languages: ["en"],
    maxCapacity: 8,
    qaScore: 98.2,
    skills: ["Complex Disputes", "Reconciliation", "High-Value Escalations"],
    joinedDate: "2025-10-10",
    status: "ONLINE",
  },
  {
    code: "OFF-SUP-04",
    fullName: "Haruna Dan-Borno",
    email: "haruna.supervisor@koriepay.internal",
    role: "SUPPORT_SUPERVISOR",
    tier: "MANAGEMENT",
    jurisdiction: "CROSS_BORDER",
    languages: ["en", "ha", "fr"],
    maxCapacity: 6,
    qaScore: 99.1,
    skills: ["Queue Management", "Incident Leadership", "QA Scoring", "Playbook Authoring"],
    joinedDate: "2025-03-01",
    status: "ONLINE",
  },
  {
    code: "OFF-SUP-05",
    fullName: "Femi Alabi",
    email: "femi.finance@koriepay.internal",
    role: "TIER_3_FINANCE",
    tier: "TIER_3_SPECIALIST",
    jurisdiction: "NG",
    languages: ["en"],
    maxCapacity: 10,
    qaScore: 97.4,
    skills: ["Ledger Reconciliation", "Settlement Adjustment", "Refund Verification"],
    joinedDate: "2025-06-20",
    status: "BUSY",
  },
  {
    code: "OFF-SUP-06",
    fullName: "Amina Bello CAMS",
    email: "amina.compliance@koriepay.internal",
    role: "TIER_3_COMPLIANCE",
    tier: "TIER_3_SPECIALIST",
    jurisdiction: "CROSS_BORDER",
    languages: ["en", "ha"],
    maxCapacity: 8,
    qaScore: 99.8,
    skills: ["KYC/KYB Clearance", "AML Holds", "Sanctions Review", "Court Directives"],
    joinedDate: "2025-01-15",
    status: "ONLINE",
  },
  {
    code: "OFF-SUP-07",
    fullName: "Tariq Al-Mansoor",
    email: "tariq.techops@koriepay.internal",
    role: "TIER_3_TECH_OPS",
    tier: "TIER_3_SPECIALIST",
    jurisdiction: "CROSS_BORDER",
    languages: ["en"],
    maxCapacity: 10,
    qaScore: 98.0,
    skills: ["Webhook Replay", "API Latency", "Providus & Coris Bank Rail Diagnostics"],
    joinedDate: "2025-04-12",
    status: "ONLINE",
  },
  {
    code: "OFF-SUP-08",
    fullName: "Read-Only Analyst",
    email: "readonly.support@koriepay.internal",
    role: "SUPPORT_READ_ONLY",
    tier: "TIER_2_SENIOR",
    jurisdiction: "CROSS_BORDER",
    languages: ["en"],
    maxCapacity: 0,
    qaScore: 100,
    skills: ["Audit", "Reporting"],
    joinedDate: "2025-09-01",
    status: "ONLINE",
  },
];

function orgFor(jurisdiction) {
  return jurisdiction === "NE" ? NE_HQ : NG_HQ;
}

async function ensureAuthUser(email, fullName) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "SUPPORT_OFFICER" },
  });
  if (!error) return created.user.id;
  if (error.message && error.message.toLowerCase().includes("already been registered")) {
    let page = 1;
    while (true) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) throw listErr;
      const hit = list.users.find((u) => u.email === email);
      if (hit) return hit.id;
      if (list.users.length < 200) break;
      page += 1;
    }
    throw new Error(`Could not resolve existing auth user for ${email}`);
  }
  throw error;
}

async function main() {
  for (const o of OFFICERS) {
    const authUserId = await ensureAuthUser(o.email, o.fullName);
    const { data: row, error } = await admin
      .from("support_officers")
      .upsert(
        {
          org_id: orgFor(o.jurisdiction),
          auth_user_id: authUserId,
          officer_code: o.code,
          full_name: o.fullName,
          email: o.email,
          role: o.role,
          tier: o.tier,
          jurisdiction: o.jurisdiction,
          languages: o.languages,
          max_capacity: o.maxCapacity,
          status: o.status,
          qa_score: o.qaScore,
          skills: o.skills,
          joined_date: o.joinedDate,
        },
        { onConflict: "email" },
      )
      .select("id, officer_code, full_name, role")
      .single();
    if (error) {
      console.error(`❌ ${o.code} (${o.email}):`, error.message);
      process.exitCode = 1;
      continue;
    }
    console.log(`✅ ${row.officer_code} ${row.full_name} (${row.role}) -> ${row.id}`);
  }
  console.log("\nDefault password for all seeded officers:", DEFAULT_PASSWORD);
}

main();
