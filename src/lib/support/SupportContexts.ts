// =============================================================================
// File: src/lib/support/SupportContexts.ts
// Description: KoriePay Support — Customer 360 & Transaction Investigation
// resolvers, REAL-DB backed (spec §22–§27).
//
// These are the ONLY read paths through which the support UI sees customers
// and transactions. Both resolvers read the SAME tables the Customer Portal
// and Agency Banking already write — customers/wallets/customer_transactions
// for retail customers, agents/agent_float_accounts/agency_transactions for
// agents. There is no forked ledger and no synthetic "provider trace" layer:
// what Support sees is exactly what is in the database, PII-masked by
// default (unmasking requires a capability and is audited by the caller).
// =============================================================================

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listTicketRows,
  listDisputeRows,
  ticketRowToTicket,
} from "./supportDb";

/* ------------------------------------------------------ PII masking (§55) */

export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  const plus = phone.startsWith("+") ? "+" : "";
  if (digits.length <= 4) return `${plus}${digits.slice(0, 1)}•••••••`;
  return `${plus}${digits.slice(0, 4)} ••• ••• ${digits.slice(-4)}`;
}

export function maskEmail(email?: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 2)}${"•".repeat(Math.max(3, local.length - 2))}@${domain}`;
}

export function maskAccount(accountNumber?: string | null): string {
  if (!accountNumber) return "—";
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `•••• ${digits.slice(-4)}`;
}

export function balanceMasked(amount: number, currency: string): string {
  const str = Math.round(amount).toString();
  const last = str.slice(-2);
  const sym = currency === "XOF" ? " CFA" : currency === "NGN" ? "" : ` ${currency}`;
  return `${sym}•••••${last}`;
}

/* ------------------------------------------------- Customer 360 (§22/§23) */

export interface Customer360AccountView {
  currency: "XOF" | "NGN";
  accountNumberMasked: string;
  accountNumber?: string;
  assignedBankName: string;
  status: string;
  isPrimary: boolean;
  balanceMasked: string;
  balance: number;
  availableBalance: number;
  heldBalance: number;
}

export interface Customer360View {
  source: "CUSTOMER" | "AGENT";
  customer: {
    id: string;
    name: string;
    emailMasked: string;
    email?: string;
    phoneMasked: string;
    phone?: string;
    country: "NG" | "NE";
    preferredLanguage: "en" | "ha" | "fr";
    kycTier: string;
    accountStatus: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    registrationDate?: string;
  };
  accounts: Customer360AccountView[];
  stats: {
    totalTransactions: number;
    failedTransactions: number;
    activeTickets: number;
    openDisputes: number;
  };
  recentTransactions: {
    reference: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
    counterparty?: string;
  }[];
  activeTickets: {
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    updatedAt: string;
  }[];
  openDisputes: {
    id: string;
    disputeNumber: string;
    category: string;
    status: string;
    createdAt: string;
  }[];
  securityEvents: { event: string; device: string; ipMasked: string; timestamp: string }[];
}

const XOF_FIRST = (a: { currency: string }, b: { currency: string }) =>
  a.currency === "XOF" ? -1 : b.currency === "XOF" ? 1 : 0;

async function ticketsAndDisputesFor(customerId: string) {
  const [{ rows: ticketRows }, disputeRows] = await Promise.all([
    listTicketRows({ customerId, openOnly: true, limit: 20 }),
    listDisputeRows({ limit: 300 }),
  ]);
  const activeTickets = await Promise.all(ticketRows.map((t) => ticketRowToTicket(t)));
  const openDisputes = disputeRows.filter(
    (d) => d.customer_id === customerId && d.status !== "RESOLVED" && d.status !== "CLOSED",
  );
  return { activeTickets, openDisputes };
}

/**
 * Resolves Customer 360 from the REAL customers/wallets/customer_transactions
 * tables (retail customers) or agents/agent_float_accounts/agency_transactions
 * (agents/merchants operating under the agency banking rail). No synthetic
 * data — an id that matches neither table returns null.
 */
export async function resolveCustomer360(
  customerId: string,
  opts: { unmaskPii?: boolean } = {},
): Promise<Customer360View | null> {
  const admin = getSupabaseAdminClient();
  const unmask = !!opts.unmaskPii;

  // 1) Retail customer (Customer Portal — customers/wallets/customer_transactions)
  const { data: customerRow } = await admin
    .from("customers")
    .select("id, first_name, last_name, email, phone, country, preferred_language, kyc_tier, status, created_at")
    .eq("id", customerId)
    .maybeSingle();

  if (customerRow) {
    const [{ data: wallets }, { data: txRows }, { activeTickets, openDisputes }] = await Promise.all([
      admin
        .from("wallets")
        .select("id, currency, status, balance, locked_balance")
        .eq("customer_id", customerId),
      admin
        .from("customer_transactions")
        .select("reference, transaction_type, status, amount, currency, created_at, recipient_name")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(10),
      ticketsAndDisputesFor(customerId),
    ]);

    const { count: totalTxCount } = await admin
      .from("customer_transactions")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId);
    const { count: failedTxCount } = await admin
      .from("customer_transactions")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("status", "FAILED");

    const accounts: Customer360AccountView[] = ((wallets || []) as { id: string; currency: string; status: string; balance: string | number; locked_balance: string | number }[])
      .filter((w) => w.currency === "XOF" || w.currency === "NGN")
      .sort(XOF_FIRST)
      .map((w) => {
        const balance = Number(w.balance);
        const held = Number(w.locked_balance);
        return {
          currency: w.currency as "XOF" | "NGN",
          accountNumberMasked: "•••• wallet",
          accountNumber: undefined,
          assignedBankName: w.currency === "XOF" ? "Coris Bank Niger" : "Providus Bank Nigeria",
          status: w.status,
          isPrimary: true,
          balanceMasked: balanceMasked(balance, w.currency),
          balance: unmask ? balance : 0,
          availableBalance: unmask ? balance - held : 0,
          heldBalance: unmask ? held : 0,
        };
      });

    const fullName = `${customerRow.first_name} ${customerRow.last_name}`.trim();
    return {
      source: "CUSTOMER",
      customer: {
        id: customerRow.id,
        name: fullName,
        emailMasked: maskEmail(customerRow.email),
        email: unmask ? customerRow.email : undefined,
        phoneMasked: maskPhone(customerRow.phone),
        phone: unmask ? customerRow.phone : undefined,
        country: customerRow.country,
        preferredLanguage: customerRow.preferred_language,
        kycTier: customerRow.kyc_tier,
        accountStatus: customerRow.status,
        riskLevel: "LOW",
        registrationDate: customerRow.created_at,
      },
      accounts,
      stats: {
        totalTransactions: totalTxCount ?? 0,
        failedTransactions: failedTxCount ?? 0,
        activeTickets: activeTickets.length,
        openDisputes: openDisputes.length,
      },
      recentTransactions: (txRows || []).map((t) => ({
        reference: t.reference,
        type: t.transaction_type,
        status: t.status,
        amount: Number(t.amount),
        currency: t.currency,
        createdAt: t.created_at,
        counterparty: t.recipient_name || undefined,
      })),
      activeTickets: activeTickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        updatedAt: t.updatedAt,
      })),
      openDisputes: openDisputes.map((d) => ({
        id: d.id,
        disputeNumber: d.dispute_number,
        category: d.category,
        status: d.status,
        createdAt: d.created_at,
      })),
      securityEvents: [],
    };
  }

  // 2) Agent / merchant (Agency Banking — agents/agent_float_accounts/agency_transactions)
  const { data: agentRow } = await admin
    .from("agents")
    .select("id, agent_name, business_name, email, phone, country, tier, status, kyc_status, created_at")
    .eq("id", customerId)
    .maybeSingle();

  if (agentRow) {
    const [{ data: floats }, { data: txRows }, { activeTickets, openDisputes }] = await Promise.all([
      admin.from("agent_float_accounts").select("currency, account_kind, ledger_account_id").eq("agent_id", customerId),
      admin
        .from("agency_transactions")
        .select("reference, transaction_type, status, amount, currency, created_at, recipient_name")
        .eq("agent_id", customerId)
        .order("created_at", { ascending: false })
        .limit(10),
      ticketsAndDisputesFor(customerId),
    ]);

    const { count: totalTxCount } = await admin
      .from("agency_transactions")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", customerId);
    const { count: failedTxCount } = await admin
      .from("agency_transactions")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", customerId)
      .eq("status", "FAILED");

    let ledgerBalances: Record<string, number> = {};
    const ledgerIds = (floats || []).map((f: { ledger_account_id: string }) => f.ledger_account_id).filter(Boolean);
    if (unmask && ledgerIds.length) {
      const { data: ledgerRows } = await admin.from("ledger_accounts").select("id, balance").in("id", ledgerIds);
      ledgerBalances = Object.fromEntries((ledgerRows || []).map((l: { id: string; balance: string | number }) => [l.id, Number(l.balance)]));
    }

    const accounts: Customer360AccountView[] = ((floats || []) as { currency: string; account_kind: string; ledger_account_id: string }[])
      .filter((f) => f.currency === "XOF" || f.currency === "NGN")
      .sort(XOF_FIRST)
      .map((f) => {
        const balance = ledgerBalances[f.ledger_account_id] ?? 0;
        return {
          currency: f.currency as "XOF" | "NGN",
          accountNumberMasked: `•••• ${f.account_kind.toLowerCase()}`,
          assignedBankName: f.currency === "XOF" ? "Coris Bank Niger" : "Providus Bank Nigeria",
          status: "ACTIVE",
          isPrimary: f.account_kind === "WALLET_FLOAT",
          balanceMasked: balanceMasked(balance, f.currency),
          balance: unmask ? balance : 0,
          availableBalance: unmask ? balance : 0,
          heldBalance: 0,
        };
      });

    return {
      source: "AGENT",
      customer: {
        id: agentRow.id,
        name: agentRow.business_name || agentRow.agent_name,
        emailMasked: maskEmail(agentRow.email),
        email: unmask ? agentRow.email : undefined,
        phoneMasked: maskPhone(agentRow.phone),
        phone: unmask ? agentRow.phone : undefined,
        country: agentRow.country,
        preferredLanguage: "en",
        kycTier: agentRow.tier,
        accountStatus: agentRow.status,
        riskLevel: agentRow.kyc_status === "REJECTED" ? "HIGH" : "LOW",
        registrationDate: agentRow.created_at,
      },
      accounts,
      stats: {
        totalTransactions: totalTxCount ?? 0,
        failedTransactions: failedTxCount ?? 0,
        activeTickets: activeTickets.length,
        openDisputes: openDisputes.length,
      },
      recentTransactions: (txRows || []).map((t) => ({
        reference: t.reference,
        type: t.transaction_type,
        status: t.status,
        amount: Number(t.amount),
        currency: t.currency,
        createdAt: t.created_at,
        counterparty: t.recipient_name || undefined,
      })),
      activeTickets: activeTickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        updatedAt: t.updatedAt,
      })),
      openDisputes: openDisputes.map((d) => ({
        id: d.id,
        disputeNumber: d.dispute_number,
        category: d.category,
        status: d.status,
        createdAt: d.created_at,
      })),
      securityEvents: [],
    };
  }

  return null;
}

/** Lightweight search across real customers + agents for the support search box. */
export async function searchCustomersAndAgents(q: string, limit = 25) {
  const admin = getSupabaseAdminClient();
  const like = `%${q.replace(/[%,()]/g, "")}%`;
  const [{ data: customers }, { data: agents }] = await Promise.all([
    admin
      .from("customers")
      .select("id, first_name, last_name, country, status, kyc_tier, email, phone")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(limit),
    admin
      .from("agents")
      .select("id, agent_name, business_name, country, status, tier, email, phone")
      .or(`agent_name.ilike.${like},business_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(limit),
  ]);

  const customerRows = (customers || []).map((c: any) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`.trim(),
    country: c.country,
    status: c.status,
    kycTier: c.kyc_tier,
    riskLevel: "LOW" as const,
    source: "CUSTOMER" as const,
    emailMasked: maskEmail(c.email),
    phoneMasked: maskPhone(c.phone),
  }));
  const agentRows = (agents || []).map((a: any) => ({
    id: a.id,
    name: a.business_name || a.agent_name,
    country: a.country,
    status: a.status,
    kycTier: a.tier,
    riskLevel: "LOW" as const,
    source: "AGENT" as const,
    emailMasked: maskEmail(a.email),
    phoneMasked: maskPhone(a.phone),
  }));
  return [...customerRows, ...agentRows];
}

/* -------------------------------------- Transaction investigation (§24–§27) */

export interface TransactionInvestigationView {
  source: "CUSTOMER_TRANSACTION" | "AGENCY_TRANSACTION";
  transactionId: string;
  reference: string;
  amount: number;
  currency: string;
  fee?: number;
  timestamp: string;
  status: string;
  statusExplanationKey: string;
  channel: string;
  originEntity: string;
  destinationEntity: string;
  provider: { node: string; reference: string; status: string } | null;
  ledgerStatus: string;
  failureReason?: string;
  timeline: { stage: string; timestamp: string; status: "PASS" | "WARN" | "FAIL"; details: string }[];
  relatedTickets: { id: string; ticketNumber: string; subject: string; status: string }[];
  relatedDisputes: { id: string; disputeNumber: string; category: string; status: string }[];
}

const STATUS_EXPLANATION_KEY: Record<string, string> = {
  INITIATED: "initiated",
  PROCESSING: "processing",
  PENDING_PROVIDER_INTEGRATION: "pending",
  SUCCESSFUL: "successful",
  FAILED: "failed",
  REVERSED: "reversed",
};

/** Builds a minimal, honest timeline from the row's own timestamps — no fabricated provider stages. */
function timelineFromRow(row: {
  status: string;
  created_at: string;
  completed_at: string | null;
  failure_reason: string | null;
  provider_status: string | null;
}): TransactionInvestigationView["timeline"] {
  const timeline: TransactionInvestigationView["timeline"] = [
    { stage: "Transaction initiated", timestamp: row.created_at, status: "PASS", details: "Recorded in customer_transactions / agency_transactions." },
  ];
  if (row.provider_status) {
    timeline.push({
      stage: "External provider leg",
      timestamp: row.created_at,
      status: row.provider_status === "UNSENT" ? "WARN" : "PASS",
      details: `Provider status: ${row.provider_status}.`,
    });
  }
  if (row.status === "FAILED" && row.failure_reason) {
    timeline.push({ stage: "Transaction failed", timestamp: row.completed_at || row.created_at, status: "FAIL", details: row.failure_reason });
  } else if (row.status === "SUCCESSFUL" && row.completed_at) {
    timeline.push({ stage: "Transaction completed", timestamp: row.completed_at, status: "PASS", details: "Marked SUCCESSFUL." });
  } else if (row.status === "REVERSED" && row.completed_at) {
    timeline.push({ stage: "Transaction reversed", timestamp: row.completed_at, status: "PASS", details: "Reversed to originating wallet/float." });
  }
  return timeline;
}

export async function resolveTransactionInvestigation(idOrReference: string): Promise<TransactionInvestigationView | null> {
  const admin = getSupabaseAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrReference);
  const col = isUuid ? "id" : "reference";

  const [{ data: custTx }, { data: agencyTx }] = await Promise.all([
    admin
      .from("customer_transactions")
      .select("id, reference, transaction_type, amount, fee, currency, status, failure_reason, recipient_name, recipient_bank, provider_name, provider_status, created_at, completed_at, customer_id")
      .eq(col, idOrReference)
      .maybeSingle(),
    admin
      .from("agency_transactions")
      .select("id, reference, transaction_type, amount, currency, status, failure_reason, recipient_name, recipient_bank, provider_name, provider_status, created_at, completed_at, agent_id, customer_fee, agent_commission")
      .eq(col, idOrReference)
      .maybeSingle(),
  ]);

  const row = custTx || agencyTx;
  if (!row) return null;

  const { rows: relatedTicketRows } = await listTicketRows({ search: row.reference, limit: 10 });
  const relatedTickets = (await Promise.all(relatedTicketRows.map((t) => ticketRowToTicket(t))))
    .filter((t) => t.relatedTransactionId === row.reference)
    .map((t) => ({ id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, status: t.status }));
  const disputeRows = await listDisputeRows({ limit: 300 });
  const relatedDisputes = disputeRows
    .filter((d) => d.transaction_reference === row.reference)
    .map((d) => ({ id: d.id, disputeNumber: d.dispute_number, category: d.category, status: d.status }));

  return {
    source: custTx ? "CUSTOMER_TRANSACTION" : "AGENCY_TRANSACTION",
    transactionId: row.id,
    reference: row.reference,
    amount: Number(row.amount),
    currency: row.currency,
    fee: custTx ? Number((custTx as any).fee) : Number((agencyTx as any)?.customer_fee ?? 0),
    timestamp: row.created_at,
    status: row.status,
    statusExplanationKey: STATUS_EXPLANATION_KEY[row.status] ?? "processing",
    channel: row.transaction_type,
    originEntity: custTx ? `Customer (${(custTx as any).customer_id})` : `Agent (${(agencyTx as any)?.agent_id})`,
    destinationEntity: row.recipient_name || row.recipient_bank || "—",
    provider:
      row.provider_name || row.provider_status
        ? { node: row.provider_name || "—", reference: row.reference, status: row.provider_status || "UNSENT" }
        : null,
    ledgerStatus: row.status === "SUCCESSFUL" ? "POSTED_BALANCED" : row.status === "FAILED" ? "REVERSED" : "PENDING",
    failureReason: row.failure_reason || undefined,
    timeline: timelineFromRow(row as never),
    relatedTickets,
    relatedDisputes,
  };
}

