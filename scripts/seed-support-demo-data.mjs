// One-off script to seed realistic demo data into the Support Portal now
// that real officers (scripts/seed-support-officers.mjs) and the real
// support_* schema exist. Two strategies, by table:
//
//  1. Tickets / disputes / escalations / tasks / macros — created through
//     the REAL running API (signed in as a real officer), so ticket
//     numbering, SLA computation, auto-assignment and audit logging all go
//     through the exact same code path a real officer's browser would hit.
//     Requires the dev server to be running at BASE_URL.
//
//  2. Read-mostly reference content (knowledge articles, playbooks,
//     incidents, automation rules, training modules, QA reviews) — these
//     have no POST endpoint by design (§107: no write endpoint for
//     thresholds/config), so they are inserted directly with the service
//     role key, exactly like any other one-off content seed.
//
// Safe to re-run: ticket/dispute/escalation creation is idempotent per
// customer+category combination isn't enforced by this script itself, so
// only run this once against a clean support_tickets table (checked below).
import WS from "ws";
globalThis.WebSocket = WS;
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.SUPPORT_SEED_BASE_URL || "http://localhost:3000";
const PASSWORD = "KorieSupport@2026!";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function tokenFor(email) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(`Could not sign in ${email}: ${error?.message}`);
  return data.session.access_token;
}

async function api(token, path, init = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.status === "error") {
    throw new Error(`${init.method || "GET"} ${path} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.data;
}

async function main() {
  const { count } = await admin.from("support_tickets").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log(`support_tickets already has ${count} rows — skipping ticket/dispute/escalation/task/macro seed to avoid duplicates.`);
  } else {
    await seedViaApi();
  }

  await seedReferenceContent();
  console.log("Support demo data seed complete.");
}

async function seedViaApi() {
  const zainab = await tokenFor("zainab.support@koriepay.internal"); // TIER_1_JUNIOR / NG
  const abdoul = await tokenFor("abdoul.support@koriepay.internal"); // TIER_1_JUNIOR / NE
  const chidinma = await tokenFor("chidinma.senior@koriepay.internal"); // TIER_2_SENIOR / NG
  const haruna = await tokenFor("haruna.supervisor@koriepay.internal"); // SUPPORT_SUPERVISOR / CROSS_BORDER
  const femi = await tokenFor("femi.finance@koriepay.internal"); // TIER_3_FINANCE / NG

  console.log("Signed in as 5 officers for demo-data creation.");

  // ---- Macros (trilingual canned responses) --------------------------------
  const macros = [
    {
      key: "transfer-delay-ack",
      name: "Transfer delay acknowledgement",
      category: "TRANSFERS",
      body: {
        en: "Thank you for reaching out. We can see your transfer is still processing with our banking partner. We are actively monitoring it and will update you within 2 hours.",
        fr: "Merci de nous avoir contactés. Nous voyons que votre transfert est toujours en cours de traitement avec notre partenaire bancaire. Nous le suivons activement et vous informerons sous 2 heures.",
        ha: "Na gode da tuntubar mu. Muna ganin cewa canja wurin ku har yanzu ana sarrafa shi tare da abokin bankinmu. Muna sa ido a kansa kuma za mu sanar da ku cikin awa 2.",
      },
    },
    {
      key: "kyc-tier-upgrade-info",
      name: "KYC tier upgrade requirements",
      category: "KYC",
      body: {
        en: "To upgrade your KYC tier, please provide a valid government ID and a recent proof of address. Once submitted, review typically takes 1-2 business days.",
        fr: "Pour améliorer votre niveau KYC, veuillez fournir une pièce d'identité gouvernementale valide et un justificatif de domicile récent. Après soumission, l'examen prend généralement 1 à 2 jours ouvrables.",
        ha: "Don haɓaka matakin KYC naka, da fatan za a bayar da katin shaida na gwamnati mai inganci da tabbacin adireshi na kwanan nan. Bayan an mika, bita yakan ɗauki kwana 1-2 na aiki.",
      },
    },
    {
      key: "dispute-opened-notice",
      name: "Dispute case opened",
      category: "DISPUTES",
      body: {
        en: "We have opened a formal dispute case for this transaction. Our specialist team will review the evidence and reach a decision within 3-5 business days.",
        fr: "Nous avons ouvert un dossier de litige formel pour cette transaction. Notre équipe spécialisée examinera les preuves et rendra une décision sous 3 à 5 jours ouvrables.",
        ha: "Mun buɗe shari'ar rigima ta yau da kullun don wannan ma'amala. Ƙungiyar ƙwararrunmu za ta duba shaidu kuma ta yanke shawara cikin kwana 3-5 na aiki.",
      },
    },
  ];
  const { count: macroCount } = await admin.from("support_macros").select("id", { count: "exact", head: true });
  if ((macroCount ?? 0) === 0) {
    for (const m of macros) {
      await api(haruna, "/api/support/macros", { method: "POST", body: JSON.stringify(m) });
    }
    console.log(`Created ${macros.length} macros.`);
  } else {
    console.log(`support_macros already has ${macroCount} rows — skipping macro seed.`);
  }

  // ---- Tickets --------------------------------------------------------------
  const ticketSpecs = [
    {
      token: zainab,
      customerId: "70000000-0000-0000-0000-000000000003",
      customerName: "Folake Adeleke",
      subject: "Transfer to GTBank still pending after 2 hours",
      description: "Customer Folake Adeleke reports her NGN 45,000 transfer to a GTBank account has been stuck in pending status since this morning. She needs confirmation before end of day.",
      category: "TRANSFER",
      priority: "HIGH",
      jurisdiction: "NG",
      language: "en",
    },
    {
      token: zainab,
      customerId: "70000000-0000-0000-0000-000000000006",
      customerName: "Tunde Bakare",
      subject: "Unable to complete airtime top-up",
      description: "Customer Tunde Bakare's airtime top-up of NGN 2,000 to his own number failed twice with a generic error message.",
      category: "AIRTIME",
      priority: "NORMAL",
      jurisdiction: "NG",
      language: "en",
    },
    {
      token: abdoul,
      customerId: "70000000-0000-0000-0000-000000000013",
      customerName: "Moussa Harouna",
      subject: "Retrait d'agent refusé malgré solde suffisant",
      description: "Le client Moussa Harouna signale qu'un retrait de 15 000 XOF chez un agent a été refusé alors que son solde de portefeuille est suffisant.",
      category: "WITHDRAWAL",
      priority: "HIGH",
      jurisdiction: "NE",
      language: "fr",
    },
    {
      token: chidinma,
      customerId: "70000000-0000-0000-0000-000000000008",
      customerName: "Blessing Okon",
      subject: "Requesting KYC Tier 2 upgrade for higher transfer limits",
      description: "Customer Blessing Okon wants to upgrade from KYC Tier 1 to Tier 2 to unlock higher daily transfer limits ahead of a business payment.",
      category: "KYC_TIER",
      priority: "NORMAL",
      jurisdiction: "NG",
      language: "en",
    },
    {
      token: chidinma,
      customerId: "70000000-0000-0000-0000-000000000011",
      customerName: "Amadou Seydou",
      subject: "Cross-border transfer amount mismatch on receipt",
      description: "Customer Amadou Seydou received less XOF than the amount confirmed on the transfer receipt for a cross-border transfer from Nigeria.",
      category: "PENDING_TRANSACTION",
      priority: "URGENT",
      jurisdiction: "CROSS_BORDER",
      language: "en",
      relatedTransactionId: "KP-2026-CTX-94F2AAF9",
    },
    {
      token: haruna,
      customerId: "70000000-0000-0000-0000-000000000009",
      customerName: "Mustapha Ali",
      subject: "Suspicious login attempt reported by customer",
      description: "Customer Mustapha Ali reports an unrecognized login attempt notification and wants his account reviewed for security.",
      category: "FRAUD_SECURITY",
      priority: "CRITICAL",
      jurisdiction: "NG",
      language: "en",
    },
    {
      token: femi,
      customerId: "70000000-0000-0000-0000-000000000010",
      customerName: "Kelechi Nwosu",
      subject: "Refund request for failed bill payment",
      description: "Customer Kelechi Nwosu's electricity bill payment failed but the amount was debited from her wallet. She is requesting a refund.",
      category: "REFUND",
      priority: "HIGH",
      jurisdiction: "NG",
      language: "en",
    },
  ];

  const createdTickets = [];
  for (const spec of ticketSpecs) {
    const { token, ...payload } = spec;
    const data = await api(token, "/api/support/tickets", { method: "POST", body: JSON.stringify(payload) });
    createdTickets.push(data.ticket);
    console.log(`Created ticket ${data.ticket.ticketNumber}: ${data.ticket.subject}`);
  }

  // A couple of internal + customer messages on the first two tickets.
  await api(zainab, `/api/support/tickets/${createdTickets[0].id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: "Checked with banking ops — the provider is reporting a delay on their end. Following up now.", internal: true }),
  });
  await api(zainab, `/api/support/tickets/${createdTickets[0].id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: "Thank you for your patience — we've confirmed with our banking partner that your transfer is being processed and should reflect within the next hour.", internal: false }),
  });

  // ---- Disputes ---------------------------------------------------------
  const dispute1 = await api(chidinma, "/api/support/disputes", {
    method: "POST",
    body: JSON.stringify({
      ticketId: createdTickets[4].id,
      category: "INCORRECT_AMOUNT",
      transactionReference: "KP-2026-CTX-94F2AAF9",
      customerId: "70000000-0000-0000-0000-000000000011",
      customerName: "Amadou Seydou",
      claim: "Received XOF 40,000 instead of the XOF 42,000 confirmed on the transfer receipt.",
      claimAmount: 2000,
      currency: "XOF",
      priority: "URGENT",
      jurisdiction: "CROSS_BORDER",
    }),
  });
  console.log(`Created dispute ${dispute1.dispute.disputeNumber}.`);

  const dispute2 = await api(femi, "/api/support/disputes", {
    method: "POST",
    body: JSON.stringify({
      ticketId: createdTickets[6].id,
      category: "FAILED_TRANSACTION",
      transactionReference: "KP-2026-BILL-REF-0001",
      customerId: "70000000-0000-0000-0000-000000000010",
      customerName: "Kelechi Nwosu",
      claim: "Bill payment failed but wallet was debited NGN 8,500 for electricity token that was never delivered.",
      claimAmount: 8500,
      currency: "NGN",
      priority: "HIGH",
      jurisdiction: "NG",
    }),
  });
  console.log(`Created dispute ${dispute2.dispute.disputeNumber}.`);

  // ---- Escalation ---------------------------------------------------------
  const escalation1 = await api(haruna, "/api/support/escalations", {
    method: "POST",
    body: JSON.stringify({
      ticketId: createdTickets[5].id,
      reason: "Potential account takeover — unrecognized login attempt on a customer with an active wallet balance. Needs fraud/risk review before any further account action.",
      destination: "FRAUD_RISK",
      priority: "CRITICAL",
    }),
  });
  console.log(`Created escalation ${escalation1.escalation.escalationNumber}.`);

  // ---- Tasks --------------------------------------------------------------
  const tasks = [
    {
      token: zainab,
      title: "Follow up with banking ops on GTBank transfer delay",
      description: "Confirm the transfer has settled and close the loop with the customer.",
      priority: "HIGH",
      ticketId: createdTickets[0].id,
      dueAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    },
    {
      token: chidinma,
      title: "Review KYC Tier 2 documents once submitted",
      priority: "NORMAL",
      ticketId: createdTickets[3].id,
      dueAt: new Date(Date.now() + 2 * 86400 * 1000).toISOString(),
    },
    {
      token: haruna,
      title: "Confirm fraud/risk acknowledged the escalation",
      priority: "URGENT",
      ticketId: createdTickets[5].id,
      dueAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    },
  ];
  for (const t of tasks) {
    const { token, ...payload } = t;
    const data = await api(token, "/api/support/tasks", { method: "POST", body: JSON.stringify(payload) });
    console.log(`Created task: ${data.task.title}`);
  }
}

async function seedReferenceContent() {
  const { count: kbCount } = await admin.from("support_knowledge_articles").select("id", { count: "exact", head: true });
  if ((kbCount ?? 0) === 0) {
    const { error } = await admin.from("support_knowledge_articles").insert([
      {
        category: "TRANSFER",
        audience: "INTERNAL_OFFICER",
        status: "PUBLISHED",
        version: "v1",
        author: "Chidinma Eze",
        tags: ["transfers", "pending", "banking-ops"],
        helpful_count: 12,
        body_en: {
          title: "Diagnosing a stuck bank transfer",
          problem: "Customer transfer to an external bank shows PENDING for more than 30 minutes.",
          symptoms: ["Wallet debited but recipient has not received funds", "Transaction status stuck on PENDING_PROVIDER_INTEGRATION"],
          resolution: "Check the transaction's provider_reference in Customer 360 → Transactions. If the provider has not responded within 2 hours, escalate to BANKING_OPS with the transaction reference.",
          escalationCondition: "No provider response after 2 hours, or customer reports funds debited twice.",
        },
        body_fr: {
          title: "Diagnostiquer un virement bancaire bloqué",
          problem: "Le virement du client vers une banque externe affiche EN ATTENTE depuis plus de 30 minutes.",
          symptoms: ["Portefeuille débité mais le destinataire n'a pas reçu les fonds", "Statut de transaction bloqué sur PENDING_PROVIDER_INTEGRATION"],
          resolution: "Vérifiez la référence du fournisseur dans Client 360 → Transactions. Si le fournisseur ne répond pas sous 2 heures, escaladez vers BANKING_OPS avec la référence de transaction.",
          escalationCondition: "Aucune réponse du fournisseur après 2 heures, ou le client signale un double débit.",
        },
        body_ha: {
          title: "Gano matsalar canja wurin banki da ya makale",
          problem: "Canja wurin abokin ciniki zuwa wata banki ya nuna JIRAN AIKI fiye da mintuna 30.",
          symptoms: ["An cire kudi daga walat amma mai karba bai samu ba", "Matsayin ma'amala ya makale a PENDING_PROVIDER_INTEGRATION"],
          resolution: "Duba lambar mai bayarwa a Customer 360 → Transactions. Idan mai bayarwa bai amsa ba cikin sa'o'i 2, tura zuwa BANKING_OPS tare da lambar ma'amala.",
          escalationCondition: "Babu amsa daga mai bayarwa bayan sa'o'i 2, ko abokin ciniki ya ba da rahoton an cire kudi sau biyu.",
        },
      },
      {
        category: "KYC_TIER",
        audience: "INTERNAL_OFFICER",
        status: "PUBLISHED",
        version: "v1",
        author: "Haruna Dan-Borno",
        tags: ["kyc", "tier-upgrade"],
        helpful_count: 8,
        body_en: {
          title: "KYC tier upgrade review checklist",
          problem: "Customer wants to move from a lower KYC tier to a higher one for increased limits.",
          symptoms: ["Customer submits ID and proof of address", "Transfer/wallet limits blocking a legitimate transaction"],
          resolution: "Confirm the submitted government ID is legible and unexpired, and the proof of address is dated within the last 3 months. Route to compliance for final sign-off — support does not approve KYC changes directly.",
          escalationCondition: "Document appears altered or inconsistent with the account holder's stated details.",
        },
        body_fr: {
          title: "Liste de contrôle pour la mise à niveau du niveau KYC",
          problem: "Le client souhaite passer d'un niveau KYC inférieur à un niveau supérieur pour des limites accrues.",
          symptoms: ["Le client soumet une pièce d'identité et un justificatif de domicile", "Les limites de transfert/portefeuille bloquent une transaction légitime"],
          resolution: "Confirmez que la pièce d'identité soumise est lisible et non expirée, et que le justificatif de domicile date de moins de 3 mois. Transmettez à la conformité pour validation finale — le support n'approuve pas directement les changements KYC.",
          escalationCondition: "Le document semble modifié ou incohérent avec les informations déclarées par le titulaire du compte.",
        },
        body_ha: {
          title: "Jerin dubawa na haɓaka matakin KYC",
          problem: "Abokin ciniki yana son ƙaura daga ƙaramin matakin KYC zuwa mafi girma don ƙarin iyaka.",
          symptoms: ["Abokin ciniki ya mika katin shaida da tabbacin adireshi", "Iyakokin canja wuri/walat suna toshe ma'amala ta gaskiya"],
          resolution: "Tabbatar da cewa katin shaida da aka mika a bayyane yake kuma bai ƙare ba, kuma tabbacin adireshi kwanan wata ne cikin watanni 3 da suka gabata. Tura zuwa bin ka'ida don amincewa ta ƙarshe — tallafi ba ya amincewa da canje-canjen KYC kai tsaye.",
          escalationCondition: "Takarda ta bayyana an canza ta ko ba ta dace da bayanan mai asusun ba.",
        },
      },
    ]);
    if (error) throw new Error(`KB insert failed: ${error.message}`);
    console.log("Seeded 2 knowledge articles.");
  }

  const { count: pbCount } = await admin.from("support_playbooks").select("id", { count: "exact", head: true });
  if ((pbCount ?? 0) === 0) {
    const { error } = await admin.from("support_playbooks").insert([
      {
        title: "Stuck Cross-Border Transfer Triage",
        category: "TRANSFER",
        target_tier: "TIER_1_JUNIOR",
        estimated_minutes: 15,
        required_role: "TIER_1_JUNIOR",
        applicable_jurisdictions: ["NG", "NE", "CROSS_BORDER"],
        steps: [
          { order: 1, instruction: "Open Customer 360 and confirm the wallet debit actually occurred." },
          { order: 2, instruction: "Open the transaction in Transaction Investigation and check provider status." },
          { order: 3, instruction: "If provider has not responded in 2 hours, escalate to BANKING_OPS." },
          { order: 4, instruction: "Keep the customer updated every 2 hours until resolved." },
        ],
      },
      {
        title: "Suspicious Login Response",
        category: "FRAUD_SECURITY",
        target_tier: "TIER_2_SENIOR",
        estimated_minutes: 10,
        required_role: "TIER_2_SENIOR",
        applicable_jurisdictions: ["NG", "NE", "CROSS_BORDER"],
        steps: [
          { order: 1, instruction: "Do not disable the account yourself — this requires FRAUD_RISK sign-off." },
          { order: 2, instruction: "Escalate to FRAUD_RISK immediately with the reported login details." },
          { order: 3, instruction: "Advise the customer to change their password as a precaution." },
        ],
      },
    ]);
    if (error) throw new Error(`Playbooks insert failed: ${error.message}`);
    console.log("Seeded 2 playbooks.");
  }

  const { count: incCount } = await admin.from("support_incidents").select("id", { count: "exact", head: true });
  if ((incCount ?? 0) === 0) {
    const { error } = await admin.from("support_incidents").insert([
      {
        incident_number: "INC-2026-0001",
        title: "Intermittent delays on GTBank payout rail",
        description: "GTBank-bound transfers are experiencing intermittent 30-60 minute delays due to a partner-side settlement queue backlog.",
        affected_services: ["Transfers"],
        affected_providers: ["GTBank"],
        jurisdiction: "NG",
        severity: "MINOR",
        status: "MONITORING",
        customer_notice: "Some transfers to GTBank accounts may take longer than usual to reflect. We are monitoring closely.",
      },
    ]);
    if (error) throw new Error(`Incidents insert failed: ${error.message}`);
    console.log("Seeded 1 incident.");
  }

  const { count: arCount } = await admin.from("support_automation_rules").select("id", { count: "exact", head: true });
  if ((arCount ?? 0) === 0) {
    const { error } = await admin.from("support_automation_rules").insert([
      {
        rule_name: "Auto-tag stuck transfer tickets",
        description: "Applies a 'stuck-transfer' tag when a new TRANSFER category ticket mentions 'pending' for more than 30 minutes.",
        trigger_event: "TICKET_CREATED",
        category: "TRANSFER",
        conditions: [{ field: "category", op: "eq", value: "TRANSFER" }],
        actions: [{ type: "ADD_TAG", value: "stuck-transfer" }],
        enabled: true,
        requires_human_approval: false,
        is_dry_run: true,
      },
    ]);
    if (error) throw new Error(`Automation rules insert failed: ${error.message}`);
    console.log("Seeded 1 automation rule.");
  }

  const { count: tmCount } = await admin.from("support_training_modules").select("id", { count: "exact", head: true });
  if ((tmCount ?? 0) === 0) {
    const { error } = await admin.from("support_training_modules").insert([
      {
        title: "Cross-Border Dispute Handling Fundamentals",
        description: "Covers the dispute lifecycle, evidence standards, and decision-owner routing for NG-NE cross-border transaction disputes.",
        tier: "TIER_2_SENIOR",
        estimated_minutes: 45,
        modules_count: 4,
        certification_name: "Cross-Border Dispute Specialist",
        key_skills: ["Dispute triage", "Evidence review", "Decision routing"],
      },
    ]);
    if (error) throw new Error(`Training modules insert failed: ${error.message}`);
    console.log("Seeded 1 training module.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
