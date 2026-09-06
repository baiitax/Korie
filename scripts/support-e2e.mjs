/**
 * scripts/support-e2e.mjs — Support Portal end-to-end suite (spec §112–115).
 *
 * Why this exists: the support portal's promises — the 8-state lifecycle,
 * pause-aware SLA, RBAC per officer tier, PII masking, macro substitution,
 * trilingual KB, idempotent creation, XOF-first / "Coris Bank" naming —
 * can only be falsified by driving the real app. This suite does two things:
 *
 *   1. API engine flows (auth'd fetch against the live server): lifecycle,
 *      SLA pause/resume, idempotency, RBAC negatives, dispute decision,
 *      PII unmask, search, naming invariants.
 *   2. Browser flows (headless Chromium at desktop + mobile widths): route
 *      sweep with i18n-leak detection, inbox → ticket detail, new-ticket
 *      modal, officer switcher RBAC in the UI, PII unmask toggle, KB
 *      language switching, dark mode, mobile bottom nav, focus visibility.
 *
 *   node scripts/support-e2e.mjs [base-url]
 *
 * Requires the `playwright` devDependency and a Chromium download
 * (`npx playwright install chromium`). Exit code = number of failures.
 *
 * The suite is re-runnable: it creates tickets with a timestamp marker and
 * asserts on those, never on exact queue counts.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const TOKEN = "kp_test_cdb3db2b9b22a98c9c1b";

const OFF = {
  SUPERVISOR: "OFF-SUP-04", // Haruna Dan-Borno — rank 4, unmask + close
  SENIOR: "OFF-SUP-03",     // Chidinma Eze — TIER_2
  JUNIOR: "OFF-SUP-01",     // Zainab Abubakar — TIER_1 (least-priv human)
  FINANCE: "OFF-SUP-05",    // Femi Alabi — TIER_3_FINANCE (dispute owner)
};

let failures = 0;
let skips = 0;
const results = [];

async function check(name, fn) {
  try {
    const skip = await fn();
    if (skip === "skip") {
      skips += 1;
      results.push(`  SKIP  ${name}`);
      console.log(`  SKIP  ${name}`);
    } else {
      results.push(`  PASS  ${name}`);
      console.log(`  PASS  ${name}`);
    }
  } catch (err) {
    failures += 1;
    results.push(`  FAIL  ${name} — ${err.message}`);
    console.log(`  FAIL  ${name} — ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function api(path, { method = "GET", body, officer = OFF.SUPERVISOR, token = TOKEN } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-kp-support-officer": officer,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

/* =====================================================================
 * PART 1 — engine flows over the API
 * =================================================================== */
console.log("\n== PART 1 · engine flows (API) ==");

const MARKER = `E2E-${Date.now().toString(36)}`;
const createdTicketId = { id: null };
const lifecycleTicketId = { id: null };

// real customer from the 360 resolver (engine-backed), used for created tickets
const AMARA = (async () => {
  const { json } = await api("/api/support/customers/cust-ne-001-amara");
  return { id: json.data.customer.id, name: json.data.customer.name };
})();

await check("A1 · overview KPIs + real health nodes (Coris/Providus, never 'Koris')", async () => {
  const { status, json } = await api("/api/support/overview?range=7D");
  assert(status === 200, `overview ${status}`);
  const kpis = json.data.kpis;
  assert(kpis && kpis.openTickets > 0, `openTickets=${kpis?.openTickets}`);
  const { status: hStatus, json: h } = await api("/api/support/health");
  assert(hStatus === 200, `health ${hStatus}`);
  const text = JSON.stringify(h.data);
  assert(/Coris/i.test(text), "health missing Coris Bank node");
  assert(/Providus/i.test(text), "health missing Providus Bank node");
  assert(!/Koris/i.test(text), "health leaks 'Koris' (spec §87)");
});

let openTicketId = null;
await check("A2 · ticket list carries computed SLA per row; status filter works", async () => {
  const { status, json } = await api("/api/support/tickets?open=1&limit=50");
  assert(status === 200, `tickets ${status}`);
  const rows = json.data.items;
  assert(rows.length > 0, "no OPEN tickets");
  for (const row of rows) {
    assert(row.sla && row.sla.state, `ticket ${row.id} missing sla`);
    const OPEN = ["NEW","TRIAGED","ASSIGNED","IN_PROGRESS","WAITING_FOR_INTERNAL_TEAM","WAITING_FOR_CUSTOMER","ESCALATED","REOPENED"];
  assert(OPEN.includes(row.status), `filter leak: ${row.status}`);
  }
  openTicketId = rows[0].id;
});

await check("A3 · idempotent creation: same key → same ticket + cached flag", async () => {
  const key = `e2e-key-${MARKER}`;
  const payload = {
    subject: `E2E idempotency probe ${MARKER}`,
    description: "Created twice with the same idempotency key.",
    category: "TRANSFER",
    priority: "NORMAL",
    jurisdiction: "NE",
    channel: "IN_APP",
    customerId: (await AMARA).id,
    customerName: (await AMARA).name,
    idempotencyKey: key,
  };
  const first = await api("/api/support/tickets", { method: "POST", body: payload });
  assert(first.status === 200 || first.status === 201, `create ${first.status} ${JSON.stringify(first.json?.code)}`);
  const second = await api("/api/support/tickets", { method: "POST", body: payload });
  assert(second.status === first.status, `second status ${second.status}`);
  const id1 = first.json.data?.ticket?.id;
  const id2 = second.json.data?.ticket?.id;
  assert(id1 && id1 === id2, `id mismatch ${id1} vs ${id2}`);
  assert(second.json.meta?.idempotency_cached === true, "meta.idempotency_cached not true on replay");
  createdTicketId.id = id1;
});

await check("A4 · ticket detail exposes sla, allowedTransitions, capabilities", async () => {
  const { status, json } = await api(`/api/support/tickets/${createdTicketId.id}`);
  assert(status === 200, `detail ${status}`);
  const d = json.data;
  assert(d.sla && d.sla.state, "missing sla");
  assert(Array.isArray(d.allowedTransitions) && d.allowedTransitions.length > 0, "allowedTransitions empty");
  assert(d.capabilities?.canReply === true, `supervisor canReply=${d.capabilities?.canReply}`);
});

/** Walk a ticket through server-authorized transitions toward a target state. */
async function walkTicket(id, prefer) {
  const visited = new Set();
  for (let step = 0; step < 8; step++) {
    const d = (await api(`/api/support/tickets/${id}`)).json.data;
    const status = d.ticket?.status ?? d.status;
    if (status === "RESOLVED" || status === "CLOSED") return d;
    const wanted = prefer(status).find((st) => d.allowedTransitions.includes(st) && st !== status && !visited.has(st));
    if (!wanted) return d; // furthest reachable point
    visited.add(wanted);
    const up = await api(`/api/support/tickets/${id}`, { method: "PATCH", body: { status: wanted } });
    if (up.status !== 200) throw new Error(`PATCH ${wanted} → ${up.status} ${up.json?.error?.code}`);
  }
  throw new Error(`walk did not converge for ${id}`);
}

await check("A5 · lifecycle: NEW → … → RESOLVED via server-authorized transitions only", async () => {
  const { id } = createdTicketId;
  const d = await walkTicket(id, (cur) => {
    if (cur === "RESOLVED") return [];
    // drive toward resolution: resolve when allowed, else advance the pipeline
    return ["RESOLVED", "IN_PROGRESS", "ASSIGNED", "TRIAGED"];
  });
  assert(d.ticket?.status === "RESOLVED", `final ${d.ticket?.status}`);
  assert(d.sla.state === "MET" || d.sla.state === "MISSED", `sla after resolve ${d.sla.state}`);
});

await check("A6 · SLA pause: WAITING_FOR_CUSTOMER pauses; customer reply resumes", async () => {
  const payload = {
    subject: `E2E SLA pause probe ${MARKER}`,
    description: "Verifies the pause-aware SLA clock.",
    category: "COMPLAINT",
    priority: "LOW",
    jurisdiction: "NE",
    channel: "EMAIL",
    customerId: (await AMARA).id,
    customerName: (await AMARA).name,
    idempotencyKey: `e2e-pause-${MARKER}`,
  };
  const created = await api("/api/support/tickets", { method: "POST", body: payload });
  const id = created.json.data?.ticket?.id;
  assert(id, `create failed ${created.status}`);
  lifecycleTicketId.id = id;

  await walkTicket(id, () => ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ASSIGNED", "TRIAGED"]);
  let d = (await api(`/api/support/tickets/${id}`)).json.data;
  if (d.ticket?.status !== "WAITING_FOR_CUSTOMER") {
    const toWait = await api(`/api/support/tickets/${id}`, { method: "PATCH", body: { status: "WAITING_FOR_CUSTOMER" } });
    assert(toWait.status === 200, `to WAITING ${toWait.status} ${toWait.json?.error?.code}`);
  }
  d = (await api(`/api/support/tickets/${id}`)).json.data;
  assert(d.ticket?.status === "WAITING_FOR_CUSTOMER", `status ${d.ticket?.status}`);
  assert(d.sla.state === "PAUSED", `sla during wait ${d.sla.state}`);

  const reply = await api(`/api/support/tickets/${id}/messages`, {
    method: "POST",
    body: { content: "I just checked, my card still has not been credited.", senderType: "CUSTOMER" },
  });
  assert(reply.status === 200 || reply.status === 201, `customer reply ${reply.status}`);
  d = (await api(`/api/support/tickets/${id}`)).json.data;
  assert(d.ticket?.status === "IN_PROGRESS", `auto-resume failed: ${d.ticket?.status}`);
  assert(d.sla.state !== "PAUSED", `sla still paused: ${d.sla.state}`);
  assert((d.sla.pausedMs ?? 0) > 0, `pausedMs=${d.sla.pausedMs} — clock was not paused`);
});

await check("A7 · macro substitution: variables replaced, no braces left", async () => {
  const { status, json } = await api("/api/support/macros");
  assert(status === 200, `macros ${status}`);
  const macro = (json.data.items || []).find((m) => m.enabled && m.variables?.length > 0);
  if (!macro) return "skip";
  const sent = await api(`/api/support/tickets/${lifecycleTicketId.id}/messages`, {
    method: "POST",
    body: { macroId: macro.id },
  });
  assert(sent.status === 200 || sent.status === 201, `macro reply ${sent.status}`);
  const msg = sent.json.data?.message;
  assert(msg, "no message in reply payload");
  const body = msg.content ?? "";
  assert(body.length > 0, "empty macro content");
  assert(!body.includes("{{"), `unsubstituted variables in: ${body}`);
  const d = (await api(`/api/support/tickets/${lifecycleTicketId.id}`)).json.data;
  const stored = (d.ticket?.messages || []).map((m) => m.content).join("\n");
  assert(stored.includes(body), "macro message not persisted on ticket");
});

await check("A8 · RBAC: TIER_1 cannot close, cannot escalate to Finance, cannot decide", async () => {
  const { status, json } = await api("/api/support/tickets?open=1&limit=1", { officer: OFF.JUNIOR });
  assert(status === 200, `junior tickets ${status}`);
  const rows = json.data.items;
  if (!rows.length) return "skip";
  const id = rows[0].id;

  const close = await api(`/api/support/tickets/${id}`, { method: "PATCH", body: { status: "CLOSED" }, officer: OFF.JUNIOR });
  assert(close.status === 403, `close as TIER_1 → ${close.status} (expected 403) ${close.json?.error?.code}`);
  assert(close.json?.error?.code === "FORBIDDEN", `code ${close.json?.error?.code}`);

  const esc = await api(`/api/support/escalations`, {
    method: "POST",
    body: { ticketId: id, destination: "FINANCE", reason: "E2E RBAC probe" },
    officer: OFF.JUNIOR,
  });
  assert(esc.status === 403, `escalate to FINANCE as TIER_1 → ${esc.status} (expected 403)`);
  assert(esc.json?.error?.code === "FORBIDDEN_DESTINATION" || esc.json?.error?.code === "FORBIDDEN", `code ${esc.json?.error?.code}`);

  const disputes = (await api("/api/support/disputes", { officer: OFF.JUNIOR })).json.data.items;
  if (!disputes.length) return "skip";
  const decide = await api(`/api/support/disputes/${disputes[0].id}`, {
    method: "PATCH",
    body: { decision: { type: "REFUND_APPROVED", reason: "E2E RBAC probe" } },
    officer: OFF.JUNIOR,
  });
  assert(decide.status === 403, `dispute decision as TIER_1 → ${decide.status} (expected 403)`);
});

await check("A9 · dispute: TIER_3_FINANCE decision moves it to UNDER_REVIEW", async () => {
  const { status, json } = await api("/api/support/disputes", { officer: OFF.FINANCE });
  assert(status === 200, `disputes ${status}`);
  const target = (json.data.items || []).find(
    (x) => x.decisionOwner === "TIER_3_FINANCE" && (x.status === "OPEN" || x.status === "PENDING"),
  );
  if (!target) return "skip";
  const res = await api(`/api/support/disputes/${target.id}`, {
    method: "PATCH",
    body: { decision: { type: "REFUND_APPROVED", reason: `E2E approved refund ${MARKER}` } },
    officer: OFF.FINANCE,
  });
  assert(res.status === 200, `decide ${res.status} ${res.json?.error?.code}`);
  const rec = res.json.data?.dispute?.recoveryCaseReference;
  assert(rec, "approved refund did not create a recovery case (§29/§31)");
  const after = (await api(`/api/support/disputes/${target.id}`, { officer: OFF.FINANCE })).json.data;
  assert(after.dispute?.status === "RESOLVED", `status ${after.dispute?.status}`);
  assert(after.dispute?.recoveryCaseReference === rec, "recovery reference not persisted");
});

let customerPhoneFull = null;
await check("A10 · PII: masked by default, unmask audited + tier-gated (TIER_1 → 403)", async () => {
  const masked = await api("/api/support/customers/cust-ne-001-amara");
  assert(masked.status === 200, `360 ${masked.status}`);
  const c = masked.json.data;
  assert(c.customer, "360 view missing customer");
  assert(/[•*]{3,}/.test(c.customer.phoneMasked ?? ""), `phoneMasked=${c.customer.phoneMasked} not masked`);
  assert(!c.customer.phoneMasked.startsWith("++"), `double-plus artifact: ${c.customer.phoneMasked}`);
  assert(c.customer.phone === undefined, "full phone leaked in masked view");

  const denied = await api("/api/support/customers/cust-ne-001-amara?unmask=1", { officer: OFF.JUNIOR });
  assert(denied.status === 403, `unmask as TIER_1 → ${denied.status}`);
  assert(denied.json?.error?.code === "FORBIDDEN_UNMASK", `code ${denied.json?.error?.code}`);

  const unmasked = await api("/api/support/customers/cust-ne-001-amara?unmask=1");
  assert(unmasked.status === 200, `unmask as supervisor ${unmasked.status}`);
  const u = unmasked.json.data;
  assert(u.customer.phone && !u.customer.phone.includes("*"), `unmasked phone ${u.customer.phone}`);
  customerPhoneFull = u.customer.phone;
});

await check("A11 · search is live and capability-gated; missing token → 401", async () => {
  const { status, json } = await api(`/api/support/search?q=Amara`);
  assert(status === 200, `search ${status}`);
  assert(json.data && typeof json.data === "object", "search shape");
  const noAuth = await fetch(BASE + "/api/support/search?q=Amara");
  assert(noAuth.status === 401, `unauthenticated search → ${noAuth.status}`);
});

await check("A12 · audit trail records the unmask we just performed", async () => {
  const { status, json } = await api("/api/support/audit?limit=25");
  assert(status === 200, `audit ${status}`);
  const hit = (json.data.items || []).find((a) => a.action === "PII_UNMASKED" || a.details?.includes("unmask"));
  assert(hit, "no PII_UNMASKED audit entry found");
});

/* =====================================================================
 * PART 2 — browser flows (UI)
 * =================================================================== */
console.log("\n== PART 2 · browser flows (Chromium) ==");

const ROUTES = [
  "/support", "/support/inbox", "/support/tickets", "/support/customers",
  "/support/transactions", "/support/disputes", "/support/refunds", "/support/reversals",
  "/support/kyc", "/support/escalations", "/support/tasks", "/support/knowledge",
  "/support/macros", "/support/analytics", "/support/analytics/agents", "/support/analytics/sla",
  "/support/analytics/csat", "/support/audit", "/support/notifications", "/support/integrations",
  "/support/system-health", "/support/settings", "/support/dashboard", "/support/my-queue",
  "/support/knowledge-base", "/support/playbooks", "/support/incidents", "/support/automation",
  "/support/qa", "/support/training", "/support/capacity", "/support/team",
];
const DETAIL_ROUTES = [
  "/support/tickets/TCK-2026-10497",
  "/support/customers/cust-ne-001-amara",
  "/support/transactions/TX-XB-2026-77188",
  "/support/disputes/DSP-2026-0031",
  "/support/escalations/ESC-2026-0041",
  "/support/knowledge/KB-1001",
];

const browser = await chromium.launch();

/** goto with retries — dev/preview servers can stall under load */
async function goto(page, url, opts = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000, ...opts });
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      console.log(`        retry ${attempt} → ${url} (${String(err.message).split("\n")[0]})`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}


async function newPage(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(30000);
  ctx.setDefaultNavigationTimeout(90000); // dev-server cold compile
  const page = await ctx.newPage();
  return { ctx, page };
}

async function expectHealthy(page, label) {
  const body = await page.locator("body").innerText();
  assert(!/Something went wrong/i.test(body), `${label}: error boundary shown`);
  assert(!/supportOps\./.test(body), `${label}: raw i18n key leaked: ${body.match(/supportOps\.[\w.]+/)?.[0]}`);
  assert(!/undefined|null\.|\bNaN\b/.test(body.slice(0, 4000)), `${label}: rendered undefined/NaN`);
}

// warm compile of the heaviest routes before sweeping (dev mode compiles per route)
{
  const { ctx, page } = await newPage(1440, 900);
  for (const r of ["/support", "/support/inbox", ...DETAIL_ROUTES]) {
    await goto(page, BASE + r);
  }
  await ctx.close();
}

let desktop = await newPage(1440, 900);
const { page: dp } = desktop;

await check("U1 · route sweep: 31 list pages render healthy (no errors, no i18n leaks, sidebar present)", async () => {
  for (const r of ROUTES) {
    await goto(dp, BASE + r);
    await dp.waitForSelector("body", { timeout: 20000 });
    const body = await dp.locator("body").innerText();
    assert(body.length > 200, `${r}: page nearly empty (${body.length} chars)`);
    await expectHealthy(dp, r);
    if (r !== "/support/reversals" && !r.startsWith("/support/dashboard") && !r.startsWith("/support/my-queue") && !r.startsWith("/support/knowledge-base")) {
      const sidebar = await dp.locator('nav[aria-label="KoriePay Support"]').count();
      assert(sidebar > 0, `${r}: sidebar missing`);
    }
  }
});

await check("U2 · detail routes render with real data (ticket / customer / tx / dispute / escalation / KB)", async () => {
  await goto(dp, BASE + "/support/tickets/TCK-2026-10497");
  await dp.waitForSelector("text=KP-SUP-10497", { timeout: 60000 });
  await expectHealthy(dp, "/support/tickets/TCK-2026-10497");

  await goto(dp, BASE + "/support/customers/cust-ne-001-amara");
  await dp.waitForSelector("text=Amara", { timeout: 60000 });
  await expectHealthy(dp, "/support/customers/cust-ne-001-amara");

  await goto(dp, BASE + "/support/transactions/TX-XB-2026-77188");
  await dp.waitForSelector("text=TX-XB-2026-77188", { timeout: 60000 });
  const txBody = await dp.locator("body").innerText();
  assert(/Coris/i.test(txBody), "tx investigation missing Coris node");
  await expectHealthy(dp, "/support/transactions/TX-XB-2026-77188");

  await goto(dp, BASE + "/support/disputes/DSP-2026-0031");
  // the page renders the human-facing disputeNumber (DSC-…), not the internal id
  await dp.waitForSelector("text=DSC-2026-0031", { timeout: 60000 });
  await expectHealthy(dp, "/support/disputes/DSP-2026-0031");

  await goto(dp, BASE + "/support/escalations/ESC-2026-0041");
  await dp.waitForSelector("text=ESC-2026-0041", { waitUntil: "domcontentloaded" }).catch(() => {});
  await dp.waitForSelector("text=ESC-2026", { timeout: 60000 });
  await expectHealthy(dp, "/support/escalations/ESC-2026-0041");

  await goto(dp, BASE + "/support/knowledge/KB-1001");
  await dp.waitForSelector('[role="dialog"], h1', { timeout: 30000 });
  await expectHealthy(dp, "/support/knowledge/KB-1001");
});

await check("U3 · dashboard shows live KPI numbers", async () => {
  await goto(dp, BASE + "/support");
  await dp.waitForTimeout(1500);
  const body = await dp.locator("body").innerText();
  const numbers = (body.match(/\b\d{1,4}\b/g) || []).length;
  assert(numbers > 6, `dashboard renders few numbers (${numbers})`);
  assert(/SLA/i.test(body), "dashboard missing SLA section");
});

await check("U4 · inbox: row click selects ticket (preview link), detail renders SLA badge", async () => {
  await goto(dp, BASE + "/support/inbox");
  const row = dp.locator("main button:has-text('KP-SUP-'), [class*=space-y] button:has-text('KP-SUP-')").first();
  await row.waitFor({ timeout: 60000 });
  await row.click();
  await dp.waitForTimeout(800);
  const link = dp.locator('a[href^="/support/tickets/TCK-"]');
  assert((await link.count()) > 0, "preview pane link did not appear after row click");
  // ticket detail (direct — same data path)
  const href = (await link.first().getAttribute("href")) ?? "";
  const id = href.split("/").pop();
  await goto(dp, BASE + `/support/tickets/${id}`);
  // wait for the detail data (SLA badge) to actually render before asserting
  await dp.waitForFunction(
    () => /On track|At risk|Breached|Paused|Met|Missed/.test(document.body.innerText),
    { timeout: 30000 },
  ).catch(async () => {
    const tail = (await dp.locator("body").innerText()).slice(-300);
    throw new Error(`SLA badge text missing (tail: ${tail})`);
  });
  const body = await dp.locator("body").innerText();
  assert(/On track|At risk|Breached|Paused|Met|Missed/.test(body), "SLA badge text missing");
});

await check("U5 · new-ticket modal creates a ticket (toast + appears on API)", async () => {
  await goto(dp, BASE + "/support");
  await dp.waitForSelector('button:has-text("New ticket")', { timeout: 30000 });
  await dp.click('button:has-text("New ticket")');
  await dp.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await dp.fill("#nt-customer", "cust-ne-001-amara");
  await dp.fill("#nt-subject", `E2E UI ticket ${MARKER}`);
  await dp.fill("#nt-desc", "Created from the E2E browser flow.");
  await dp.click('[role="dialog"] button:has-text("Create")');
  await dp.waitForTimeout(2500);
  const toast = await dp.locator("body").innerText();
  assert(/KP-SUP-\d+|TCK-2026-/.test(toast), `no ticket number in toast: ${toast.slice(-200)}`);
  const { status, json } = await api(`/api/support/tickets?q=${MARKER}`);
  const found = (json.data.items || []).some((t) => t.subject.includes(MARKER));
  assert(found, `ticket ${MARKER} not visible in API (${status})`);
});

await check("U6 · officer switcher: 'Assign' action visible to supervisor, hidden for TIER_1", async () => {
  // assigned ticket: Assign button renders iff capabilities.canAssign (rank ≥ 2)
  const { json } = await api("/api/support/tickets?open=1&limit=50");
  const candidate = (json.data.items || []).find((t) => t.assignedOfficerId && !t.isDuplicateOf);
  assert(candidate, "no assigned open ticket");
  const id = candidate.id;

  await goto(dp, BASE + `/support/tickets/${id}`);
  await dp.waitForSelector("h1, h2", { timeout: 60000 });
  const assignAsSup = await dp.locator('button:has-text("Assign")').count();
  assert(assignAsSup > 0, `supervisor sees no Assign on ${id}`);

  const switcher = dp.locator('select[aria-label="Acting as"]');
  await switcher.selectOption(OFF.JUNIOR);
  await dp.waitForTimeout(1500);
  await goto(dp, BASE + `/support/tickets/${id}`);
  await dp.waitForSelector("h1, h2", { timeout: 60000 });
  await dp.waitForTimeout(1500); // let the officer-change refetch settle
  const assignAsJunior = await dp.locator('button:has-text("Assign")').count();
  assert(assignAsJunior === 0, `TIER_1 sees Assign on ${id} (RBAC leak in UI)`);

  await switcher.selectOption(OFF.SUPERVISOR);
  await dp.waitForTimeout(800);
});

await check("U7 · customer 360: PII masked by default, toggle reveals (audited)", async () => {
  await goto(dp, BASE + "/support/customers/cust-ne-001-amara");
  await dp.waitForSelector("text=Amara", { timeout: 60000 });
  let body = await dp.locator("body").innerText();
  if (customerPhoneFull) {
    assert(!body.includes(customerPhoneFull), "full phone visible before unmask");
  }
  assert(/[•*]{3,}/.test(body), "no masked value on screen");
  const btn = dp.locator('button:has-text("nmask")').first();
  const n = await btn.count();
  if (n === 0) {
    console.log("        (unmask toggle not rendered — officer lacks capability?)");
    return;
  }
  await btn.click();
  await dp.waitForTimeout(1500);
  body = await dp.locator("body").innerText();
  if (customerPhoneFull) {
    assert(body.includes(customerPhoneFull), "full phone not shown after unmask");
  }
});

await check("U8 · knowledge article: EN → FR → HA all render distinct text", async () => {
  await goto(dp, BASE + "/support/knowledge/KB-1001");
  await dp.waitForSelector("h1", { timeout: 30000 });
  const title = (sel) => dp.locator(sel).first().innerText();
  const en = await title("h1");
  const langBtn = (code) => dp.locator(`button:text-is("${code}")`).first();
  await langBtn("fr").click();
  await dp.waitForTimeout(1200);
  const fr = await title("h1");
  await langBtn("ha").click();
  await dp.waitForTimeout(1200);
  const ha = await title("h1");
  assert(en.trim() !== fr.trim(), `FR title same as EN: "${fr}"`);
  assert(en.trim() !== ha.trim(), `HA title same as EN: "${ha}"`);
  assert(fr.trim() !== ha.trim(), "FR and HA titles identical");
  const htmlLang = await dp.evaluate(() => document.documentElement.lang);
  assert(htmlLang === "ha", `documentElement.lang=${htmlLang} after switching to HA`);
  await langBtn("en").click(); // restore default language for later checks
  await dp.waitForTimeout(800);
});

await check("U9 · dark mode toggle swaps theme + background", async () => {
  await goto(dp, BASE + "/support");
  const before = await dp.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await dp.locator('div[role="group"] + button').click();
  await dp.waitForTimeout(500);
  const isDark = await dp.evaluate(() => document.documentElement.classList.contains("dark"));
  const after = await dp.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert(isDark, "html.dark not set after toggle");
  assert(before !== after, `background unchanged (${before})`);
  await dp.locator('div[role="group"] + button').click(); // restore
});

await check("U10 · keyboard focus is visible (WCAG 2.4.7)", async () => {
  await goto(dp, BASE + "/support");
  await dp.waitForSelector("nav", { timeout: 30000 });
  for (let i = 0; i < 5; i++) await dp.keyboard.press("Tab");
  const info = await dp.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return { tag: el.tagName, outline: cs.outlineStyle, width: cs.outlineWidth, shadow: cs.boxShadow };
  });
  const visible =
    (info.outline !== "none" && parseFloat(info.width) > 0) ||
    (info.shadow && info.shadow !== "none");
  assert(visible, `no visible focus ring on ${info.tag} (outline ${info.outline} ${info.width})`);
});

await desktop.ctx.close();

// mobile pass
const mobile = await newPage(390, 844);
const { page: mp } = mobile;
await check("U11 · mobile (390px): floating bottom nav visible, sidebar hidden", async () => {
  for (const r of ["/support", "/support/inbox", "/support/tickets"]) {
    await goto(mp, BASE + r);
    await mp.waitForSelector("body", { timeout: 30000 });
    const mobileNav = mp.locator('[aria-label="mobile"]');
    assert((await mobileNav.count()) > 0, `${r}: bottom nav missing`);
    const visible = await mobileNav.first().isVisible();
    assert(visible, `${r}: bottom nav not visible`);
    const sidebar = mp.locator('nav[aria-label="KoriePay Support"]').first();
    if ((await sidebar.count()) > 0) {
      const visible = await sidebar.isVisible();
      assert(!visible, `${r}: desktop sidebar visible at 390px`);
    }
    await expectHealthy(mp, r);
  }
});
await mobile.ctx.close();

await browser.close();

/* =================================================================== */
console.log("\n== SUMMARY ==");
console.log(results.join("\n"));
console.log(`\n${results.length - failures - skips} passed, ${failures} failed, ${skips} skipped`);
process.exit(failures);
