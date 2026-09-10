/**
 * AML monitoring sweep — the DB-backed transaction surveillance engine.
 *
 * Evaluates REAL rows in `public.transactions` against the seeded,
 * versioned scenarios in `public.aml_scenarios` and persists genuine
 * alerts in `public.aml_alerts`. No synthetic data is generated anywhere:
 * alerts can only exist because a user actually moved money.
 *
 * Determinism & idempotency:
 *  - Only transactions with aml_evaluated_at IS NULL are considered
 *    triggers; every processed row is marked, so re-running the sweep
 *    never duplicates work. Transactions are screened at initiation
 *    (any status except FAILED/REVERSED/CANCELLED/DISPUTED): the wallet
 *    debit is a real double-entry posting even while bank confirmation
 *    is pending, which is exactly when real-time surveillance runs.
 *  - Scenario windows aggregate over ALL successful transactions in the
 *    window (evaluated or not) so patterns that span sweeps are caught.
 *  - Dedup guard: a customer never receives a second alert for the same
 *    scenario while one is still open for them.
 *
 * Currency basis: scenario thresholds are NGN. XOF amounts are converted
 * at the live `fx_rates` reference row; if no rate is available the
 * conversion is skipped and the alert's feature_snapshot says so — the
 * system never guesses silently.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface SweepScenario {
  id: string;
  scenario_code: string;
  name: string;
  severity: "P0_CRITICAL" | "P1_HIGH" | "P2_MEDIUM" | "P3_LOW";
  version: number;
  threshold_amount: number;
  time_window_seconds: number;
}

interface FeedTransaction {
  id: string;
  reference: string | null;
  wallet_id: string | null;
  type: string;
  status: string;
  amount: number;
  fee: number | null;
  currency: string;
  source_currency: string | null;
  destination_currency: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface CustomerContext {
  customerId: string;
  displayName: string;
}

export interface SweepAlertInput {
  scenario: SweepScenario;
  customer: CustomerContext;
  trigger: FeedTransaction;
  ngnTotal: number;
  txCount: number;
  windowSeconds: number;
  rateBasis: string;
}

export interface SweepResult {
  scenariosRun: number;
  transactionsEvaluated: number;
  alertsCreated: number;
  startedAt: string;
  finishedAt: string;
  notes: string[];
}

/** SLA hours by scenario severity. */
const SLA_HOURS: Record<string, number> = {
  P0_CRITICAL: 4,
  P1_HIGH: 24,
  P2_MEDIUM: 48,
  P3_LOW: 72,
};

const CATCHUP_DAYS = 7;
const STRUCTURING_SINGLE_TXN_CAP = 5_000_000; // CBN currency reporting threshold

/**
 * Total NGN-equivalent debit of a transaction (principal + fee): the money
 * that actually left the wallet is the honest basis for volume scenarios.
 */
function ngnAmount(tx: FeedTransaction, xofToNgn: number | null): number | null {
  const debit = Number(tx.amount) + Number(tx.fee ?? 0);
  if ((tx.currency || "NGN") === "NGN") return debit;
  if ((tx.currency || "") === "XOF") {
    if (xofToNgn === null) return null;
    return debit * xofToNgn;
  }
  return null; // USD or unknown — not silently converted
}

function inWindow(tx: FeedTransaction, anchorIso: string, seconds: number): boolean {
  const anchor = new Date(anchorIso).getTime();
  const t = new Date(tx.created_at).getTime();
  return t <= anchor && anchor - t <= seconds * 1000;
}

function makeAlertReference(): string {
  const d = new Date();
  const stamp = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KPC-AL-${stamp}-${rand}`;
}

function describeWhatHappened(a: SweepAlertInput): string {
  const hours = Math.round((a.windowSeconds / 3600) * 10) / 10;
  const amt = Math.round(a.ngnTotal).toLocaleString("en-NG");
  return `Customer ${a.customer.displayName} moved NGN ${amt} equivalent across ${a.txCount} transaction(s) within a ${hours}h window, breaching scenario ${a.scenario.scenario_code} (threshold NGN ${a.scenario.threshold_amount.toLocaleString("en-NG")}).`;
}

function describeWhy(a: SweepAlertInput): string {
  switch (a.scenario.scenario_code) {
    case "AML_CROSS_01":
      return "Cumulative cross-border corridor (NGN<->XOF) volume in 24h exceeds the corridor velocity threshold, a pattern consistent with informal value transfer layered through the corridor.";
    case "AML_MULE_01":
      return "Rapid outflow concentrated in a 2h window at this scale is consistent with account takeover or a money-mule drain pattern.";
    case "AML_RAPID_01":
      return "High-value movement compressed into a 1h window is consistent with rapid pass-through of funds rather than genuine wallet use.";
    case "AML_STRUC_01":
      return `Multiple transactions each below the NGN ${STRUCTURING_SINGLE_TXN_CAP.toLocaleString("en-NG")} reporting threshold accumulating above the daily structuring threshold is consistent with smurfing to avoid currency transaction reporting.`;
    case "AML_VELOC_01":
      return "24h cumulative volume exceeds the medium-severity velocity outlier threshold, deviating from the customer's expected wallet activity profile.";
    default:
      return `Aggregate transaction behaviour breached scenario ${a.scenario.scenario_code}.`;
  }
}

function describeHow(a: SweepAlertInput): string {
  return `Deterministic evaluation of persisted transactions during the monitoring sweep: window=${a.windowSeconds}s, count=${a.txCount}, NGN-equivalent total=${Math.round(a.ngnTotal)}, conversion basis=${a.rateBasis}, triggered by transaction ${a.trigger.reference ?? a.trigger.id} (${a.trigger.type}).`;
}

export async function runAmlMonitoringSweep(
  admin: SupabaseClient,
): Promise<SweepResult> {
  const startedAt = new Date().toISOString();
  const notes: string[] = [];
  const alertsCreated: string[] = [];

  /* 1 ─ Active scenarios (the institution's declared risk appetite). */
  const { data: scenarios, error: scenarioErr } = await admin
    .from("aml_scenarios")
    .select("id, scenario_code, name, severity, version, threshold_amount, time_window_seconds")
    .eq("is_active", true);
  if (scenarioErr) throw new Error(`Scenario load failed: ${scenarioErr.message}`);
  const activeScenarios: SweepScenario[] = (scenarios ?? []).map((s: Record<string, unknown>) => ({
    id: String(s.id),
    scenario_code: String(s.scenario_code),
    name: String(s.name),
    severity: (s.severity as SweepScenario["severity"]) ?? "P3_LOW",
    version: Number(s.version ?? 1),
    threshold_amount: Number(s.threshold_amount ?? 0),
    time_window_seconds: Number(s.time_window_seconds ?? 86400),
  }));

  /* 2 ─ Unevaluated transactions (the sweep's incremental cursor). */
  const since = new Date(Date.now() - CATCHUP_DAYS * 86400_000).toISOString();
  const { data: pending, error: pendingErr } = await admin
    .from("transactions")
    .select("id, reference, wallet_id, type, status, amount, fee, currency, source_currency, destination_currency, created_at, metadata")
    .is("aml_evaluated_at", null)
    .in("status", ["SUCCESSFUL", "PENDING", "PROCESSING", "INITIATED"])
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(5000);
  if (pendingErr) throw new Error(`Pending load failed: ${pendingErr.message}`);
  const pendingTxns: FeedTransaction[] = (pending ?? []) as unknown as FeedTransaction[];

  if (pendingTxns.length === 0) {
    return {
      scenariosRun: activeScenarios.length,
      transactionsEvaluated: 0,
      alertsCreated: 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      notes: ["No unevaluated successful transactions in the catch-up window."],
    };
  }

  /* 3 ─ Resolve the customers behind the pending transactions. */
  const walletIds = Array.from(new Set(pendingTxns.map((t) => t.wallet_id).filter(Boolean))) as string[];
  const walletCustomer = new Map<string, string>();
  if (walletIds.length > 0) {
    const { data: wallets } = await admin
      .from("wallets")
      .select("id, customer_id")
      .in("id", walletIds);
    (wallets ?? []).forEach((w: { id: string; customer_id: string }) =>
      walletCustomer.set(w.id, w.customer_id),
    );
  }
  const customerIds = new Set<string>();
  for (const t of pendingTxns) {
    const cid =
      walletCustomer.get(t.wallet_id ?? "") ??
      (t.metadata && typeof t.metadata.customer_id === "string" ? t.metadata.customer_id : null);
    if (cid) customerIds.add(cid);
  }
  const { data: customerRows } = await admin
    .from("customers")
    .select("id, first_name, last_name, email")
    .in("id", Array.from(customerIds));
  const customerName = new Map<string, string>();
  const customerEmail = new Map<string, string>();
  (customerRows ?? []).forEach((c: { id: string; first_name?: string; last_name?: string; email?: string }) => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.id;
    customerName.set(c.id, name);
    customerEmail.set(c.id, c.email ?? "");
  });

  /* 4 ─ Full 24h-max activity per affected customer (patterns span sweeps). */
  const maxWindow = Math.max(...activeScenarios.map((s) => s.time_window_seconds), 3600);
  const activitySince = new Date(Date.now() - (maxWindow + CATCHUP_DAYS * 86400) * 1000).toISOString();
  const { data: activity } = await admin
    .from("transactions")
    .select("id, reference, wallet_id, type, status, amount, fee, currency, source_currency, destination_currency, created_at, metadata")
    .in("status", ["SUCCESSFUL", "PENDING", "PROCESSING", "INITIATED"])
    .gte("created_at", activitySince)
    .order("created_at", { ascending: true })
    .limit(20000);
  const allTxns: FeedTransaction[] = (activity ?? []) as unknown as FeedTransaction[];

  const customerOf = (t: FeedTransaction): string | null =>
    walletCustomer.get(t.wallet_id ?? "") ??
    (t.metadata && typeof t.metadata.customer_id === "string" ? t.metadata.customer_id : null);

  const byCustomer = new Map<string, FeedTransaction[]>();
  for (const t of allTxns) {
    const cid = customerOf(t);
    if (!cid) continue;
    if (!byCustomer.has(cid)) byCustomer.set(cid, []);
    byCustomer.get(cid)!.push(t);
  }

  /* 5 ─ FX conversion basis (live reference data, never guessed). */
  let xofToNgn: number | null = null;
  let rateBasis = "not-required";
  const needsXof = pendingTxns.some((t) => (t.currency || "") === "XOF");
  if (needsXof) {
    const { data: direct } = await admin
      .from("fx_rates")
      .select("rate")
      .eq("source_currency", "XOF")
      .eq("destination_currency", "NGN")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (direct && direct.length > 0) {
      xofToNgn = Number(direct[0].rate);
      rateBasis = `fx_rates XOF->NGN ${xofToNgn}`;
    } else {
      const { data: inverse } = await admin
        .from("fx_rates")
        .select("rate")
        .eq("source_currency", "NGN")
        .eq("destination_currency", "XOF")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (inverse && inverse.length > 0 && Number(inverse[0].rate) > 0) {
        xofToNgn = 1 / Number(inverse[0].rate);
        rateBasis = `fx_rates inverse of NGN->XOF ${Number(inverse[0].rate)}`;
      } else {
        notes.push("No XOF->NGN rate available; XOF transactions were skipped for NGN-threshold scenarios.");
      }
    }
  }

  /* 6 ─ Existing open alerts per customer+scenario (dedup guard). */
  const { data: openAlerts } = await admin
    .from("aml_alerts")
    .select("customer_id, scenario_code")
    .not("status", "in", '("FALSE_POSITIVE","DISMISSED","CLOSED")');
  const openPair = new Set(
    (openAlerts ?? []).map((a: { customer_id: string; scenario_code: string }) => `${a.customer_id}|${a.scenario_code}`),
  );

  /* 7 ─ Evaluate each pending trigger against each scenario. */
  interface Planned {
    scenario: SweepScenario;
    customerId: string;
    trigger: FeedTransaction;
    total: number;
    count: number;
    skipped: boolean;
  }
  const planned: Planned[] = [];

  for (const tx of pendingTxns) {
    const cid = customerOf(tx);
    if (!cid) continue;
    const history = byCustomer.get(cid) ?? [];

    for (const sc of activeScenarios) {
      if (openPair.has(`${cid}|${sc.scenario_code}`)) continue;
      const window = history.filter((h) => inWindow(h, tx.created_at, sc.time_window_seconds));

      let total = 0;
      let count = 0;
      let skipped = false;

      if (sc.scenario_code === "AML_STRUC_01") {
        // Structuring: >= 3 transactions each below the reporting cap,
        // cumulative >= threshold, inside the window.
        const sub = window.filter((h) => {
          const ngn = ngnAmount(h, xofToNgn);
          return ngn !== null && ngn > 0 && ngn < STRUCTURING_SINGLE_TXN_CAP;
        });
        total = sub.reduce<number>((acc, h) => acc + (ngnAmount(h, xofToNgn) ?? 0), 0);
        count = sub.length;
        if (count < 3) continue;
      } else if (sc.scenario_code === "AML_CROSS_01") {
        const corridor = window.filter(
          (h) => h.type === "CROSS_BORDER_TRANSFER" || h.type === "FX_CONVERSION",
        );
        const values = corridor.map((h) => ngnAmount(h, xofToNgn));
        if (values.some((v) => v === null)) skipped = true;
        total = values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
        count = corridor.length;
        if (count === 0) continue;
      } else {
        // AML_MULE_01 / AML_RAPID_01 / AML_VELOC_01: cumulative outflow volume.
        const values = window.map((h) => ngnAmount(h, xofToNgn));
        if (values.some((v) => v === null)) skipped = true;
        total = values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
        count = window.length;
      }

      if (total >= sc.threshold_amount) {
        planned.push({ scenario: sc, customerId: cid, trigger: tx, total, count, skipped });
        openPair.add(`${cid}|${sc.scenario_code}`); // one alert per customer+scenario per sweep
      }
    }
  }

  /* 8 ─ Persist alerts (explainable, evidence-linked). */
  for (const p of planned) {
    const slaHours = SLA_HOURS[p.scenario.severity] ?? 72;
    const input: SweepAlertInput = {
      scenario: p.scenario,
      customer: {
        customerId: p.customerId,
        displayName: customerName.get(p.customerId) ?? p.customerId,
      },
      trigger: p.trigger,
      ngnTotal: p.total,
      txCount: p.count,
      windowSeconds: p.scenario.time_window_seconds,
      rateBasis,
    };
    const row = {
      alert_reference: makeAlertReference(),
      scenario_id: p.scenario.id,
      scenario_code: p.scenario.scenario_code,
      scenario_version: p.scenario.version,
      customer_id: p.customerId,
      account_id: p.trigger.wallet_id,
      transaction_id: p.trigger.id,
      transaction_reference: p.trigger.reference,
      severity: p.scenario.severity,
      status: "NEW",
      disputed_or_triggered_amount: Math.round(p.total * 100) / 100,
      currency: "NGN",
      what_happened: describeWhatHappened(input),
      why_suspicious: describeWhy(input),
      who_involved: `${customerName.get(p.customerId) ?? p.customerId} (${customerEmail.get(p.customerId) ?? "no email on file"})`,
      how_pattern_detected: describeHow(input),
      feature_snapshot: {
        window_seconds: p.scenario.time_window_seconds,
        transaction_count: p.count,
        ngn_equivalent_total: Math.round(p.total * 100) / 100,
        threshold: p.scenario.threshold_amount,
        conversion_basis: rateBasis,
        conversion_skipped_for_some_transactions: p.skipped,
        triggered_by: p.trigger.reference ?? p.trigger.id,
        sweep_started_at: startedAt,
      },
      sla_due_at: new Date(Date.now() + slaHours * 3600_000).toISOString(),
      is_sla_breached: false,
    };
    const { data: inserted, error: insertErr } = await admin
      .from("aml_alerts")
      .insert(row)
      .select("id")
      .single();
    if (insertErr) {
      notes.push(`Alert insert failed for ${p.scenario.scenario_code}: ${insertErr.message}`);
      continue;
    }
    alertsCreated.push(inserted.id);
  }

  /* 9 ─ Mark the swept transactions as evaluated. */
  const { error: markErr } = await admin
    .from("transactions")
    .update({ aml_evaluated_at: new Date().toISOString() })
    .in(
      "id",
      pendingTxns.map((t) => t.id),
    );
  if (markErr) notes.push(`Evaluated-marker update failed: ${markErr.message}`);

  return {
    scenariosRun: activeScenarios.length,
    transactionsEvaluated: pendingTxns.length,
    alertsCreated: alertsCreated.length,
    startedAt,
    finishedAt: new Date().toISOString(),
    notes,
  };
}
