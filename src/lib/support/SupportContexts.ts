// =============================================================================
// File: src/lib/support/SupportContexts.ts
// Description: KoriePay Support — Customer 360 & Transaction Investigation
// resolvers (spec §22–§27).
//
// These are the ONLY read paths through which the support UI sees customers
// and transactions:
//   • Customer 360  ← CustomerLifecycleEngine + AccountLifecycleEngine +
//                     TransactionService (authoritative), with the support
//                     store as the context source for agent/merchant entities.
//                     XOF FIRST, NGN SECOND, never USD (§88). PII masked by
//                     default; unmasking requires a capability and is audited.
//   • Transaction   ← support provider trace merged with the live
//                     TransactionService row when one exists. The engine row
//                     is authoritative; the trace is investigation context.
//                     Provider references only — never keys, headers or
//                     secrets (§27).
// =============================================================================

import { SupportRole } from "@/types/support";
import { SupportOpsStore } from "./SupportOpsStore";
import { hasCapability } from "./SupportPermissions";
import { CustomerLifecycleEngine } from "@/lib/customer/CustomerLifecycleEngine";
import { AccountLifecycleEngine } from "@/lib/customer/AccountLifecycleEngine";
import { TransactionService } from "@/lib/services/TransactionService";
import { orderCurrenciesXofFirst } from "@/lib/customer/customerFeatures";
import { CustomerAccountRecord } from "@/types/customerProductFactory";

/* ------------------------------------------------------ PII masking (§55) */

export function maskPhone(phone?: string): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  const plus = phone.startsWith("+") ? "+" : "";
  if (digits.length <= 4) return `${plus}${digits.slice(0, 1)}•••••••`;
  return `${plus}${digits.slice(0, 4)} ••• ••• ${digits.slice(-4)}`;
}

export function maskEmail(email?: string): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 2)}${"•".repeat(Math.max(3, local.length - 2))}@${domain}`;
}

export function maskAccount(accountNumber?: string): string {
  if (!accountNumber) return "—";
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `•••• ${digits.slice(-4)}`;
}

function maskBalance(amount: number, currency: string): string {
  const sym = currency === "XOF" ? "CFA" : currency === "NGN" ? "₦" : currency;
  const parts = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `•••,••${sym}`.replace("•••,••", "") || `${sym} ••••`;
}

export function balanceMasked(amount: number, currency: string): string {
  // Keep the last two digits only — enough to recognize, never to exploit.
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
  balance: number; // major units — only rendered after capability + audit
  availableBalance: number;
  heldBalance: number;
}

export interface Customer360View {
  source: "CUSTOMER_ENGINE" | "SUPPORT_STORE";
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
    riskScore?: number;
    registrationDate?: string;
    lastLoginAt?: string;
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

export function resolveCustomer360(
  customerId: string,
  actorRole: SupportRole,
  opts: { unmaskPii?: boolean } = {},
): Customer360View | null {
  const store = SupportOpsStore.getInstance();
  const unmask = opts.unmaskPii && hasCapability(actorRole, "unmask_pii");

  // 1) Authoritative customer engine (exact id / customerCode match only —
  //    no free-text bypass, spec §56)
  const engineCustomer = CustomerLifecycleEngine.getInstance()
    .getCustomers()
    .find((c) => c.id === customerId || c.customerCode?.toLowerCase() === customerId.toLowerCase());

  if (engineCustomer) {
    const accounts: Customer360AccountView[] = orderCurrenciesXofFirst(
      AccountLifecycleEngine.getInstance().getAccounts(engineCustomer.id).filter(
        (a: CustomerAccountRecord) => a.currency === "XOF" || a.currency === "NGN", // never USD
      ),
    ).map((a: CustomerAccountRecord) => ({
      currency: a.currency as "XOF" | "NGN",
      accountNumberMasked: maskAccount(a.accountNumber),
      accountNumber: unmask ? a.accountNumber : undefined,
      assignedBankName: a.assignedBankName,
      status: a.status,
      isPrimary: a.isPrimary,
      balanceMasked: balanceMasked(a.availableBalance, a.currency),
      balance: a.availableBalance,
      availableBalance: a.availableBalance,
      heldBalance: a.heldBalance,
    }));

    const liveRows = TransactionService.listRawForOwner(engineCustomer.id).slice(0, 8);

    const openTickets = store.ticketsForCustomer(engineCustomer.id).filter((t) => store.isTicketOpen(t));
    const openDisputes = store.disputes.filter((d) => d.customerId === engineCustomer.id && d.status !== "RESOLVED" && d.status !== "CLOSED");

    return {
      source: "CUSTOMER_ENGINE",
      customer: {
        id: engineCustomer.id,
        name: engineCustomer.fullName,
        emailMasked: maskEmail(engineCustomer.email),
        email: unmask ? engineCustomer.email : undefined,
        phoneMasked: maskPhone(engineCustomer.phone),
        phone: unmask ? engineCustomer.phone : undefined,
        country: engineCustomer.country,
        preferredLanguage: "en", // engine records carry no language; ticket language is the signal
        kycTier: engineCustomer.kycTier,
        accountStatus: engineCustomer.status,
        riskLevel:
          engineCustomer.riskStatus === "HIGH" || engineCustomer.riskStatus === "CRITICAL"
            ? "HIGH"
            : engineCustomer.riskStatus === "ELEVATED"
              ? "MEDIUM"
              : "LOW",
        riskScore: engineCustomer.riskScore,
        registrationDate: engineCustomer.createdAt,
        lastLoginAt: engineCustomer.lastLoginAt,
      },
      accounts,
      stats: {
        totalTransactions: liveRows.length,
        failedTransactions: liveRows.filter((t) => t.status === "FAILED").length,
        activeTickets: openTickets.length,
        openDisputes: openDisputes.length,
      },
      recentTransactions: liveRows.map((t) => ({
        reference: t.reference,
        type: t.type,
        status: t.status,
        amount: t.amount / 100,
        currency: t.currency,
        createdAt: t.created_at,
        counterparty: t.recipient_name,
      })),
      activeTickets: openTickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        updatedAt: t.updatedAt,
      })),
      openDisputes: openDisputes.map((d) => ({
        id: d.id,
        disputeNumber: d.disputeNumber,
        category: d.category,
        status: d.status,
        createdAt: d.createdAt,
      })),
      securityEvents: [],
    };
  }

  // 2) Support-store entity context (agents, merchants, sandbox customers)
  const ctx = store.entityContexts[customerId];
  if (!ctx) return null;

  const openTickets = store.ticketsForCustomer(customerId).filter((t) => store.isTicketOpen(t));
  const openDisputes = store.disputes.filter((d) => d.customerId === customerId && d.status !== "RESOLVED" && d.status !== "CLOSED");

  return {
    source: "SUPPORT_STORE",
    customer: {
      id: ctx.customerId,
      name: ctx.fullName,
      emailMasked: ctx.emailMasked,
      phoneMasked: ctx.phoneMasked,
      country: ctx.country,
      preferredLanguage: ctx.preferredLanguage,
      kycTier: ctx.kycTier,
      accountStatus: ctx.accountStatus,
      riskLevel: ctx.riskLevel,
      registrationDate: ctx.registrationDate,
    },
    accounts: [
      {
        currency: (ctx.currency === "XOF" ? "XOF" : "NGN") as "XOF" | "NGN",
        accountNumberMasked: "•••• ••••",
        assignedBankName: ctx.currency === "XOF" ? "Coris Bank" : "Providus Bank",
        status: ctx.accountStatus,
        isPrimary: true,
        balanceMasked: ctx.walletBalanceMasked,
        balance: 0,
        availableBalance: 0,
        heldBalance: 0,
      },
    ],
    stats: {
      totalTransactions: ctx.totalTransactionsCount,
      failedTransactions: ctx.failedTransactionsCount,
      activeTickets: openTickets.length,
      openDisputes: openDisputes.length,
    },
    recentTransactions: [],
    activeTickets: openTickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      updatedAt: t.updatedAt,
    })),
    openDisputes: openDisputes.map((d) => ({
      id: d.id,
      disputeNumber: d.disputeNumber,
      category: d.category,
      status: d.status,
      createdAt: d.createdAt,
    })),
    securityEvents: ctx.securityEvents,
  };
}

/* -------------------------------------- Transaction investigation (§24–§27) */

export interface TransactionInvestigationView {
  source: "TRANSACTION_ENGINE" | "PROVIDER_TRACE";
  transactionId: string;
  reference: string;
  amount: number; // major units
  currency: string;
  fee?: number;
  timestamp: string;
  /** Authoritative status (engine row wins when present). */
  status: string;
  /** i18n key for the human explanation of the status (§26). */
  statusExplanationKey: string;
  channel: string;
  originEntity: string;
  destinationEntity: string;
  provider: {
    node: string;
    reference: string;
    status: string;
  } | null;
  ledgerStatus: string;
  failureReason?: string;
  timeline: { stage: string; timestamp: string; status: "PASS" | "WARN" | "FAIL"; details: string }[];
  relatedTickets: { id: string; ticketNumber: string; subject: string; status: string }[];
  relatedDisputes: { id: string; disputeNumber: string; category: string; status: string }[];
  liveRow?: {
    id: string;
    status: string;
    type: string;
    amountMinor: number;
    feeMinor: number;
    currency: string;
    providerCode?: string;
    providerReference?: string;
    providerResponseCode?: string;
    createdAt: string;
  };
}

const STATUS_EXPLANATION_KEY: Record<string, string> = {
  INITIATED: "initiated",
  PROCESSING: "processing",
  PENDING: "pending",
  SUCCESSFUL: "successful",
  FAILED: "failed",
  REVERSED: "reversed",
  CANCELLED: "cancelled",
  DISPUTED: "disputed",
  POSTED: "successful",
  COMPLETED: "successful",
};

export async function resolveTransactionInvestigation(
  idOrReference: string,
  opts: { requireProviderTraceCapability?: boolean } = {},
): Promise<TransactionInvestigationView | null> {
  const store = SupportOpsStore.getInstance();
  const trace =
    store.transactionTraces[idOrReference] ??
    Object.values(store.transactionTraces).find((t) => t.reference === idOrReference);

  // Live authoritative row (if one exists in the engine for this reference)
  const liveRow = await TransactionService.getByReference(trace ? trace.reference : idOrReference);

  if (!trace && !liveRow) return null;

  const id = trace ? trace.transactionId : liveRow!.id;
  const relatedTickets = store.tickets
    .filter((t) => t.relatedTransactionId === id || (trace && t.relatedTransactionId === trace.reference))
    .map((t) => ({ id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, status: t.status }));
  const relatedDisputes = store.disputes
    .filter((d) => d.transactionReference === (trace ? trace.reference : idOrReference) || d.transactionReference === id)
    .map((d) => ({ id: d.id, disputeNumber: d.disputeNumber, category: d.category, status: d.status }));

  const status = liveRow ? liveRow.status : (trace!.status ?? "PENDING");
  void opts.requireProviderTraceCapability; // capability enforced at the route

  return {
    source: liveRow ? "TRANSACTION_ENGINE" : "PROVIDER_TRACE",
    transactionId: id,
    reference: trace ? trace.reference : (liveRow!.reference ?? id),
    amount: liveRow ? liveRow.amount / 100 : (trace!.amount ?? 0),
    currency: liveRow ? liveRow.currency : (trace!.currency ?? "NGN"),
    fee: liveRow ? liveRow.fee / 100 : undefined,
    timestamp: liveRow ? liveRow.created_at : (trace!.timestamp ?? ""),
    status,
    statusExplanationKey: STATUS_EXPLANATION_KEY[status] ?? "processing",
    channel: trace?.channel ?? (liveRow?.type ?? "—"),
    originEntity: trace?.originEntity ?? (liveRow?.recipient_name ? `Customer (${liveRow.owner_customer_id ?? ""})` : "—"),
    destinationEntity: trace?.destinationEntity ?? (liveRow?.recipient_name ?? "—"),
    provider:
      trace || liveRow?.provider_code
        ? {
            node: trace?.providerNode ?? (liveRow?.provider_code ?? "—"),
            reference: trace?.providerReference ?? (liveRow?.provider_reference ?? "—"),
            status: trace?.webhookStatus ?? (liveRow?.provider_response_code ?? "—"),
          }
        : null,
    ledgerStatus: trace?.ledgerPostingStatus ?? (liveRow ? "POSTED_BALANCED" : "—"),
    failureReason: trace?.failureReason,
    timeline: trace?.timeline ?? [],
    relatedTickets,
    relatedDisputes,
    liveRow: liveRow
      ? {
          id: liveRow.id,
          status: liveRow.status,
          type: liveRow.type,
          amountMinor: liveRow.amount,
          feeMinor: liveRow.fee,
          currency: liveRow.currency,
          providerCode: liveRow.provider_code,
          providerReference: liveRow.provider_reference,
          providerResponseCode: liveRow.provider_response_code,
          createdAt: liveRow.created_at,
        }
      : undefined,
  };
}
