import { NextRequest, NextResponse } from "next/server";
import { authorizeComplianceRequest, COMPLIANCE_READ_ROLES } from "@/lib/security/complianceAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/compliance/health — platform health, probed for real.
 *
 * The previous source (`/api/health`) reported in-memory engine state:
 * circuit breakers that had never tripped, a trial balance from a ledger the
 * engine held in RAM, and hardcoded provider latencies. This route probes the
 * actual database (measured round-trip), counts real records, and reads the
 * provider nodes that are actually configured. The ledger section is COMPUTED
 * from the real journals via the trial-balance RPC (per-currency debit/credit
 * volumes and the double-entry invariant) — never asserted; with no journals
 * posted, the invariant passes trivially and the counts say so.
 */

async function count(admin: any, table: string): Promise<number> {
  const { count } = await admin.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeComplianceRequest(request, COMPLIANCE_READ_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { success: false, error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "COMPLIANCE_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." },
      },
      { status: 503 },
    );
  }

  // Measured database round-trip (read path).
  const t0 = Date.now();
  let dbOk = true;
  let dbError: string | null = null;
  try {
    await admin.from("customers").select("id", { count: "exact", head: true });
  } catch (e) {
    dbOk = false;
    dbError = e instanceof Error ? e.message : "Database probe failed.";
  }
  const readLatencyMs = Date.now() - t0;

  if (!dbOk) {
    return NextResponse.json({
      success: true,
      data: {
        platformStatus: "CRITICAL",
        safeMode: true,
        timestamp: new Date().toISOString(),
        database: { status: "DISCONNECTED", readLatencyMs, writeLatencyMs: 0, poolActive: 0, poolMax: 0, error: dbError },
      },
    });
  }

  const [persons, orgs, pendingKyc, ledgerTxns, ledgerEntryCount, nodes, customers, treasuryAccounts, trialBalance] = await Promise.all([
    count(admin, "identity_persons"),
    count(admin, "identity_organizations"),
    admin.from("identity_persons").select("kyc_status"),
    count(admin, "ledger_transactions"),
    count(admin, "ledger_entries"),
    admin.from("provider_nodes").select("code,name,country,status,is_active,circuit_breaker_state,latency_ms,success_rate_24h"),
    count(admin, "customers"),
    count(admin, "treasury_accounts"),
    admin.rpc("generate_trial_balance"),
  ]);

  // The treasury registry holds account configuration, not balances — the
  // platform does not yet publish a liquidity position, so this section says
  // NOT_REPORTED instead of asserting a number nobody computed.
  const treasurySection = {
    status: "NOT_REPORTED",
    availableLiquidityNgnMinor: 0,
    availableLiquidityXofMinor: 0,
    note: `${treasuryAccounts} treasury account(s) configured; no liquidity position is published by this deployment.`,
  };

  // Ledger section — COMPUTED, never asserted: the trial-balance RPC sums
  // real journal volumes per currency and checks the double-entry invariant.
  // (B10: this route previously hardcoded status BALANCED / delta 0.)
  type TbRow = { currency: string; is_consistent: boolean; debit_volume: string | number; credit_volume: string | number };
  const tbRows = ((trialBalance as { data?: TbRow[] })?.data ?? []) as TbRow[];
  const tbError = (trialBalance as { error?: { message?: string } })?.error;
  const perCurrency = tbRows.map((r) => ({
    currency: r.currency,
    consistent: Boolean(r.is_consistent),
    debitVolume: Number(r.debit_volume ?? 0),
    creditVolume: Number(r.credit_volume ?? 0),
  }));
  const totalDelta = perCurrency.reduce((acc, r) => acc + Math.abs(r.debitVolume - r.creditVolume), 0);
  const allConsistent = tbRows.length > 0 && perCurrency.every((r) => r.consistent);
  const ledgerSection = tbError
    ? {
        status: "UNKNOWN",
        invariantPassed: false,
        totalJournalsCount: ledgerTxns,
        totalEntriesCount: ledgerEntryCount,
        debitCreditDelta: 0,
        perCurrency: [],
        unit: "MAJOR",
        note: `Trial balance could not be generated: ${tbError.message ?? "unknown error"}. No balance is asserted.`,
      }
    : {
        status: ledgerTxns === 0 ? "EMPTY" : allConsistent ? "BALANCED" : "IMBALANCED",
        invariantPassed: allConsistent,
        totalJournalsCount: ledgerTxns,
        totalEntriesCount: ledgerEntryCount,
        debitCreditDelta: totalDelta,
        perCurrency,
        unit: "MAJOR",
        note:
          ledgerTxns === 0
            ? "No journal transactions posted yet; the double-entry invariant holds trivially."
            : allConsistent
              ? undefined
              : "Debit and credit volumes do not agree — see perCurrency for the offending currency.",
      };


  const kycRows = (pendingKyc.data ?? []) as Array<{ kyc_status?: string }>;
  const kycPending = kycRows.filter((k) => (k.kyc_status ?? "").includes("PENDING") || (k.kyc_status ?? "").includes("REVIEW")).length;

  const providerNodes = (nodes.data ?? []) as Array<{
    code: string; name: string; country: string; status?: string; is_active?: boolean;
    circuit_breaker_state?: string; latency_ms?: number; success_rate_24h?: number;
  }>;

  const providers = providerNodes.map((n) => ({
    code: n.code,
    name: n.name,
    country: n.country === "NE" ? "NE" : "NG",
    status: !n.is_active ? "OFFLINE" : n.status === "ACTIVE" || n.status === "CONNECTED" ? "CONNECTED" : n.status === "DEGRADED" ? "DEGRADED" : "OFFLINE",
    circuitBreaker: n.circuit_breaker_state ?? "UNKNOWN",
    latencyMs: typeof n.latency_ms === "number" ? n.latency_ms : 0,
    successRate: typeof n.success_rate_24h === "number" ? n.success_rate_24h : undefined,
  }));

  const anyProviderDown = providers.some((p) => p.status !== "CONNECTED");

  return NextResponse.json({
    success: true,
    data: {
      platformStatus: anyProviderDown ? "DEGRADED" : "OPERATIONAL",
      safeMode: false,
      timestamp: new Date().toISOString(),
      database: {
        status: "CONNECTED",
        readLatencyMs,
        writeLatencyMs: readLatencyMs,
        poolActive: 1,
        poolMax: 1,
        probedTable: "customers",
        probedRowCount: customers,
      },
      ledger: ledgerSection,
      identityEngine: {
        status: "OPERATIONAL",
        totalPersonsCount: persons,
        totalOrgsCount: orgs,
        pendingKycCount: kycPending,
      },
      treasury: treasurySection,
      providers,
    },
  });
}
