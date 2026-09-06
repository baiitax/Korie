// One-off script to seed COMPLIANCE REFERENCE DATA ONLY into the live database.
//
// What goes in (and why each is legitimate):
//   1. aml_scenarios          — the 5 monitoring scenarios defined in the repo's
//                               own AmlScenarioEngine source code.
//   2. risk_rules             — the 7 decision rules defined in the repo's own
//                               RiskDecisionEngine source code.
//   3. regulatory_obligations  — the 3 obligations from the repo's
//                               RegulatoryComplianceEngine + 2 statutory NFIU
//                               obligations (CTR / STR) that are facts of
//                               Nigerian AML law, not product state.
//   4. identity_persons       — synced 1:1 from the existing `customers` table
//                               (the repo's own synthetic seed roster), so the
//                               due-diligence queue reflects the real customer
//                               register rather than an empty table.
//   5. aml_customer_profiles  — one baseline profile per customer using the
//                               engine's own default (LOW / 15 / baseline
//                               expectations). No operational history invented.
//   6. provider_registry      — mirrored from the 4 live provider_nodes rows.
//   7. workforce_identities   — the internal staff roster that already exists
//                               as real Supabase auth users (support/compliance/
//                               finance/techops), names from the repo's roster.
//   8. Officer provisioning    — user_profiles + organization_members rows for
//                               amina.compliance@koriepay.internal
//                               (COMPLIANCE_OFFICER). Note: organization_members
//                               enforces one role per user, and the existing
//                               Ops Admin keeps AGENCY_OPS_ADMIN (which already
//                               carries admin READ access via ADMIN_READ_ROLES).
//
// What deliberately does NOT go in: alerts, cases, notes, decisions, complaints,
// restrictions, audit history — operational state stays empty until real
// activity produces it. The seed itself writes one audit_events row saying it
// ran, so the trail is honest about what was inserted.
//
// Run: DATABASE_URL=postgres://... node scripts/seed-compliance-reference.mjs
// Idempotent: ON CONFLICT DO NOTHING everywhere.
import pg from "pg";

const conn = process.env.DATABASE_URL;
if (!conn) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const c = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await c.connect();

const NG_HQ = "10000000-0000-0000-0000-000000000001";
const COMPLIANCE_OFFICER_ROLE = "7f3916e2-95f5-4de9-a6db-57bb35f9786f";
const now = new Date().toISOString();

/* ── 1. AML scenarios (verbatim from src/lib/aml/AmlScenarioEngine.ts) ── */
const scenarios = [
  ["AML_STRUC_01", "Structuring / Smurfing Pattern", "Multiple high-value transfers initiated just below statutory reporting thresholds within a 24-hour window.", "STRUCTURING", "P1_HIGH", "GLOBAL", true, 1, 4500000, 86400],
  ["AML_RAPID_01", "Rapid Movement of Funds / Pass-Through Account", "Account receives substantial inbound funds and forwards >90% onward within 60 minutes to disparate counterparties.", "PASS_THROUGH", "P0_CRITICAL", "GLOBAL", true, 1, 1000000, 3600],
  ["AML_VELOC_01", "Unusual Transaction Velocity Outlier", "Sudden spike in transaction velocity exceeding 5x customer historical 30-day declared baseline.", "VELOCITY", "P2_MEDIUM", "GLOBAL", true, 1, 500000, 86400],
  ["AML_MULE_01", "High-Risk Account Takeover & Money Mule Drain", "Device hardware change accompanied by rapid beneficiary addition and immediate maximum outflow.", "MULE_RING", "P0_CRITICAL", "GLOBAL", true, 1, 200000, 7200],
  ["AML_CROSS_01", "Unusual Cross-Border Corridor Velocity (NGN <-> XOF)", "Repeated bilateral corridor conversions with rapid circular counterparty repatriation.", "CROSS_BORDER_FX", "P1_HIGH", "GLOBAL", true, 1, 2000000, 86400],
];
for (const s of scenarios) {
  await c.query(
    `insert into aml_scenarios (scenario_code, name, description, category, severity, jurisdiction, is_active, version, threshold_amount, time_window_seconds)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (scenario_code) do nothing`,
    s,
  );
}
console.log(`aml_scenarios: ${scenarios.length} ensured`);

/* ── 2. Risk rules (verbatim from src/lib/risk/RiskDecisionEngine.ts) ── */
const rules = [
  ["RULE_DEV_NEW_SIGNATURE", "Unknown / New Device Signature", "DEVICE", "Transaction initiated from a hardware hash never seen on account.", "MEDIUM", 25, "ALLOW_WITH_STEP_UP", true],
  ["RULE_DEV_MULTI_ACCOUNT_24H", "Rapid Multi-Account Device Switching", "DEVICE", "Device bound to 4+ distinct accounts in 24h.", "HIGH", 55, "HOLD", true],
  ["RULE_GEO_IMPOSSIBLE_TRAVEL", "Geovelocity / Impossible Travel Anomaly", "GEO", "Geovelocity rate implies impossible physical travel (>800 km/h).", "CRITICAL", 70, "HOLD", true],
  ["RULE_NET_VPN_PROXY", "High-Risk VPN / Tor / Proxy Connection", "NETWORK", "Connection originates from commercial VPN / proxy subnet.", "MEDIUM", 30, "ALLOW_WITH_STEP_UP", true],
  ["RULE_TXN_NEW_BENEFICIARY_HIGH_VAL", "High-Value First-Time Beneficiary", "TRANSACTION", "High-value transfer to an unverified new counterparty.", "HIGH", 40, "REVIEW", true],
  ["RULE_VEL_10M_BURST", "Velocity Burst (10-Minute Count)", "VELOCITY", "5 or more transactions initiated within 10 minutes.", "HIGH", 50, "HOLD", true],
  ["RULE_VEL_1H_VOLUME", "Velocity Burst (1-Hour Cumulative Volume)", "VELOCITY", "Cumulative volume in 1 hour exceeds the review threshold.", "HIGH", 45, "REVIEW", true],
];
for (const r of rules) {
  await c.query(
    `insert into risk_rules (rule_code, rule_name, scope, description, severity, score_delta, default_action, is_active)
     values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (rule_code) do nothing`,
    r,
  );
}
console.log(`risk_rules: ${rules.length} ensured`);

/* ── 3. Regulatory obligations (repo engine + statutory NFIU facts) ── */
const obligations = [
  ["CBN-POS-DAILY-01", "NG", "Central Bank of Nigeria (CBN)", "Daily Agency Banking & POS Terminal Returns", "DAILY", "2026-09-06", "2026-09-07", "NOT_STARTED", "Compliance Operations", "cbn.compliance@koriepay.ng"],
  ["BCEAO-UEMOA-MTH-01", "NE", "Banque Centrale des Etats de l'Afrique de l'Ouest (BCEAO)", "Rapport Mensuel sur les Opérations de Monnaie Electronique & Kiosques", "MONTHLY", "2026-08", "2026-09-15", "NOT_STARTED", "Sahel Regulatory Affairs", "bceao.reporting@koriepay.ne"],
  ["NDPC-ANNUAL-AUDIT-01", "NG", "Nigeria Data Protection Commission (NDPC)", "Annual Data Protection Compliance Audit & Consent Log", "ANNUAL", "2026", "2026-12-31", "NOT_STARTED", "Legal & Privacy Desk", "dpo@koriepay.ng"],
  ["NFIU-CTR-DAILY-01", "NG", "Nigerian Financial Intelligence Unit (NFIU)", "Currency Transaction Reports — all transactions ≥ ₦5,000,000 (individuals) / ₦10,000,000 (body corporates)", "DAILY", "2026-09-06", "2026-09-07", "NOT_STARTED", "Compliance Operations", "cbn.compliance@koriepay.ng"],
  ["NFIU-STR-24H-01", "NG", "Nigerian Financial Intelligence Unit (NFIU)", "Suspicious Transaction Reports — filed within 24 hours of forming suspicion", "ON_EVENT", "2026-09-06", "2026-09-07", "NOT_STARTED", "Compliance Operations", "cbn.compliance@koriepay.ng"],
];
for (const o of obligations) {
  await c.query(
    `insert into regulatory_obligations (obligation_code, jurisdiction, regulator_name, title, frequency, reporting_period, due_date, status, responsible_department, owner_email)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (obligation_code) do nothing`,
    o,
  );
}
console.log(`regulatory_obligations: ${obligations.length} ensured`);

/* ── 4+5. Identity persons & AML baseline profiles, synced from customers ── */
const customers = await c.query(
  `select id, org_id, first_name, last_name, email, phone, country, kyc_tier, created_at
   from customers order by created_at, id`,
);
let seq = 0;
let persons = 0;
let profiles = 0;
for (const cust of customers.rows) {
  seq += 1;
  const ref = `KP-ID-${cust.country}-${String(seq).padStart(4, "0")}`;
  const kycStatus = cust.kyc_tier === "TIER_1" ? "PENDING" : "VERIFIED";
  const r1 = await c.query(
    `insert into identity_persons (id, identity_reference, first_name, last_name, country_code, phone_primary, email_primary, kyc_tier, kyc_status, identity_status, risk_level)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE','LOW') on conflict (id) do nothing`,
    [cust.id, ref, cust.first_name, cust.last_name, cust.country, cust.phone, cust.email, cust.kyc_tier, kycStatus],
  );
  persons += r1.rowCount;
  // Baseline AML profile: the engine's own default for a customer with no
  // history (LOW / 15 / baseline expectations). No history is invented.
  const r2 = await c.query(
    `insert into aml_customer_profiles (customer_id, jurisdiction, aml_risk_tier, aml_risk_score, declared_monthly_income, expected_monthly_volume, expected_max_single_tx, is_pep, is_sanction_flagged, has_adverse_media, last_evaluated_at)
     values ($1,$2,'LOW',15,500000,1000000,100000,false,false,false,$3) on conflict (customer_id) do nothing`,
    [cust.id, cust.country, now],
  );
  profiles += r2.rowCount;
}
console.log(`identity_persons: ${persons} inserted (${customers.rows.length} customers scanned)`);
console.log(`aml_customer_profiles: ${profiles} inserted`);

/* ── 6. Provider registry, mirrored from the live provider nodes ── */
const nodes = await c.query(`select code, name, country, status, circuit_breaker_state, latency_ms, success_rate_24h, last_ping_at from provider_nodes`);
const adapterByCode = {
  NIBSS_NIP: "NipSwitchAdapter",
  PROVIDUS_NG: "ProvidusBankAdapter",
  KORIS_NE: "CorisBankAdapter",
  NIMC_NG: "NimcIdentityAdapter",
};
let providers = 0;
for (const n of nodes.rows) {
  const r = await c.query(
    `insert into provider_registry (provider_code, name, country, currency, adapter_class, health_status, circuit_breaker_state, supported_capabilities, avg_latency_ms, success_rate_24h, last_heartbeat_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict (provider_code) do nothing`,
    [
      n.code,
      n.name,
      n.country,
      n.country === "NE" ? "XOF" : "NGN",
      adapterByCode[n.code] ?? "HttpProviderAdapter",
      n.status === "CONNECTED" ? "HEALTHY" : n.status,
      n.circuit_breaker_state,
      ["PAYMENTS"],
      n.latency_ms,
      n.success_rate_24h,
      n.last_ping_at,
    ],
  );
  providers += r.rowCount;
}
console.log(`provider_registry: ${providers} inserted (${nodes.rows.length} nodes scanned)`);

/* ── 7. Workforce identities from the real internal auth roster ── */
const roster = [
  ["KP-WF-001", "zainab.support@koriepay.internal", "Zainab Abubakar", "Support", "NG"],
  ["KP-WF-002", "abdoul.support@koriepay.internal", "Abdoul-Razak Souley", "Support", "NE"],
  ["KP-WF-003", "chidinma.senior@koriepay.internal", "Chidinma Eze", "Support", "NG"],
  ["KP-WF-004", "haruna.supervisor@koriepay.internal", "Haruna Bello", "Support", "NG"],
  ["KP-WF-005", "femi.finance@koriepay.internal", "Femi Alabi", "Finance", "NG"],
  ["KP-WF-006", "amina.compliance@koriepay.internal", "Amina Bello", "Compliance", "NG"],
  ["KP-WF-007", "tariq.techops@koriepay.internal", "Tariq Al-Mansoor", "Technology Operations", "NG"],
  ["KP-WF-008", "readonly.support@koriepay.internal", "Read-Only Analyst", "Support", "NG"],
];
let workforce = 0;
for (const w of roster) {
  // Only staff whose auth account actually exists — the register mirrors
  // reality, it does not create people.
  const auth = await c.query(`select id from auth.users where email = $1`, [w[1]]);
  if (!auth.rows.length) continue;
  const r = await c.query(
    `insert into workforce_identities (employee_id, email, full_name, department, country, lifecycle_status, mfa_enforced, current_aal)
     values ($1,$2,$3,$4,$5,'ACTIVE',false,'AAL1') on conflict (email) do nothing`,
    w,
  );
  workforce += r.rowCount;
}
console.log(`workforce_identities: ${workforce} inserted`);

/* ── 8. Officer provisioning: profile + memberships ── */
const officer = await c.query(`select id from auth.users where email = 'amina.compliance@koriepay.internal'`);
if (officer.rows.length) {
  const officerId = officer.rows[0].id;
  const prof = await c.query(
    `insert into user_profiles (auth_user_id, email, full_name, country, status)
     values ($1,'amina.compliance@koriepay.internal','Amina Bello','NG','ACTIVE') on conflict (auth_user_id) do nothing`,
    [officerId],
  );
  const profRow = await c.query(`select id from user_profiles where auth_user_id = $1`, [officerId]);
  if (profRow.rows.length) {
    const existing = await c.query(`select id from organization_members where user_id = $1`, [profRow.rows[0].id]);
    if (!existing.rows.length) {
      await c.query(
        `insert into organization_members (org_id, user_id, role_id, status) values ($1,$2,$3,'ACTIVE')`,
        [NG_HQ, profRow.rows[0].id, COMPLIANCE_OFFICER_ROLE],
      );
    }
  }
  console.log(`officer profile: ${prof.rowCount} inserted, COMPLIANCE_OFFICER membership ensured`);
}

/* ── 9. Audit the seed itself ── */
const seedRequestId = `seed-${Date.now().toString(36)}`;
await c.query(
  `insert into audit_events (action, resource_type, resource_id, details, actor_email, actor_role, actor_id, ip_address, request_id, correlation_id)
   values ('COMPLIANCE_REFERENCE_DATA_SEED', 'compliance:seed', 'reference-data',
   $1, 'system@koriepay.internal', 'SYSTEM', '00000000-0000-0000-0000-000000000000', 'seed-script', $2, $2)`,
  [
    JSON.stringify({
      scenarios: scenarios.length,
      rules: rules.length,
      obligations: obligations.length,
      identityPersons: persons,
      amlProfiles: profiles,
      providers,
      workforce,
      note: "Reference data only: engine-defined scenarios/rules, statutory obligations, customer-synced identities, provider mirror, staff roster. Operational tables deliberately left empty.",
    }),
    seedRequestId,
  ],
);
console.log("audit_events: seed recorded");

await c.end();
console.log("DONE");
