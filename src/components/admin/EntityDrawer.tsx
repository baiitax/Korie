"use client";

import React, { useState } from "react";
import { X, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useAdmin } from "./AdminContext";
import { StatusChip } from "./ResourceTable";
import { mutateAdminRecord } from "@/lib/admin/useAdminResource";
import { fmtMoney, fmtDate } from "./AdminPageUI";

/**
 * EntityDrawer — record inspector for the admin portal.
 *
 * It renders whatever the database actually holds: pages open it with the
 * REAL row they loaded (snake_case database columns). Status-changing
 * actions go through the audited registry PATCH — no fake "approved"
 * confirmations. Fields that don't exist in the record simply don't
 * render, never invented values.
 */

function Field({ label, value, mono = true }: { label: string; value: unknown; mono?: boolean }) {
  const s = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="min-w-0">
      <span className="text-[var(--foreground-muted)] block text-[10px] uppercase font-mono">{label}</span>
      <span className={`${mono ? "font-mono" : ""} text-[var(--foreground)] text-xs break-words`}>{s}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--background)]/60 border border-[var(--border)]/60 space-y-3">
      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">{title}</p>
      {children}
    </div>
  );
}

/** Audited status flip with confirmation — the only kind of action here. */
function StatusAction({
  resource,
  recordId,
  currentStatus,
  allowed,
  onDone,
}: {
  resource: string;
  recordId: string;
  currentStatus: unknown;
  allowed: string[];
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const cur = currentStatus ? String(currentStatus) : "";

  const run = async (next: string) => {
    if (!confirm(`Set ${resource} ${recordId.slice(0, 8)}… status to ${next}? This action is audited.`)) return;
    setBusy(next);
    const res = await mutateAdminRecord(resource, recordId, { status: next });
    setBusy(null);
    setResult(res.ok ? { ok: true, message: `Status set to ${next} (audited).` } : { ok: false, message: res.message });
    if (res.ok) onDone();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowed
        .filter((s) => s !== cur)
        .map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            disabled={busy !== null}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors disabled:opacity-40 bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] hover:border-[var(--brand-primary)]"
          >
            {busy === s ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
            Set {s.replaceAll("_", " ")}
          </button>
        ))}
      {result && (
        <span className={`text-[11px] font-mono ${result.ok ? "text-emerald-400" : "text-rose-400"}`}>{result.message}</span>
      )}
    </div>
  );
}

/** Resources the drawer may mutate (must match the registry's mutations). */
const MUTABLE_DRAWER_RESOURCES: Record<string, string> = {
  KYC_DOCUMENT: "kyc-documents",
  AGENT_KYC_DOCUMENT: "agent-kyc-documents",
  AGENT_APPLICATION: "agent-applications",
  DISPUTE: "customer-disputes",
  DISPUTE_CASE: "dispute-cases",
  CHARGEBACK: "chargebacks",
  RISK_CASE: "risk-cases",
  AML_ALERT: "aml-alerts",
  AML_CASE: "aml-cases",
  RECONCILIATION: "reconciliation-exceptions",
  SUSPENSE: "suspense-items",
  SUPPORT_TICKET: "support-tickets",
  SUPPORT_ESCALATION: "support-escalations",
  SECURITY_INCIDENT: "security-incidents",
  SECURITY_ALERT: "security-alerts",
  PAM_REQUEST: "pam-requests",
  REGULATORY_REPORT: "regulatory-reports",
  INCIDENT: "incidents",
  EARLY_WARNING: "early-warnings",
  REFUND: "payment-refunds",
  VARIANCE: "cash-variances",
  CIT_SHIPMENT: "cit-shipments",
  TREASURY_DEAL: "treasury-deals",
  ADASHI_EXCEPTION: "adashi-exceptions",
  ADASHI_DISPUTE: "adashi-disputes",
  PRODUCT: "products",
  API_CLIENT: "api-clients",
  API_CREDENTIAL: "api-credentials",
  DECISION: "decision-recommendations",
};

/** Status choices offered per resource (subset flips admins actually use). */
const STATUS_CHOICES: Record<string, string[]> = {
  "kyc-documents": ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  "agent-kyc-documents": ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  "agent-applications": ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  "customer-disputes": ["OPEN", "INVESTIGATING", "RESOLVED", "ESCALATED", "CLOSED"],
  "dispute-cases": ["OPEN", "UNDER_REVIEW", "WAITING_BANK", "RESOLVED", "CLOSED"],
  "chargebacks": ["OPEN", "REPRESENTMENT_FILED", "WON", "LOST", "CLOSED"],
  "risk-cases": ["OPEN", "INVESTIGATING", "ESCALATED", "RESOLVED", "FALSE_POSITIVE", "CLOSED"],
  "aml-alerts": ["OPEN", "INVESTIGATING", "ESCALATED", "CLOSED", "FALSE_POSITIVE"],
  "aml-cases": ["OPEN", "INVESTIGATING", "PENDING_DECISION", "CLOSED"],
  "reconciliation-exceptions": ["OPEN", "INVESTIGATING", "RESOLVED", "WRITTEN_OFF"],
  "suspense-items": ["OPEN", "INVESTIGATING", "RESOLVED", "WRITTEN_OFF"],
  "support-tickets": ["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"],
  "support-escalations": ["OPEN", "ACKNOWLEDGED", "RESOLVED", "CANCELLED"],
  "security-incidents": ["OPEN", "CONTAINED", "RESOLVED", "CLOSED"],
  "security-alerts": ["OPEN", "ACKNOWLEDGED", "RESOLVED"],
  "pam-requests": ["APPROVED", "REJECTED", "REVOKED"],
  "regulatory-reports": ["DRAFT", "READY_FOR_REVIEW", "UNDER_REVIEW", "APPROVED", "SUBMITTED"],
  incidents: ["OPEN", "CONTAINED", "MITIGATED", "RESOLVED", "CLOSED"],
  "early-warnings": ["OPEN", "ACKNOWLEDGED", "RESOLVED"],
  "payment-refunds": ["PENDING", "APPROVED", "PROCESSED", "REJECTED"],
  "cash-variances": ["OPEN", "INVESTIGATING", "RESOLVED", "WRITTEN_OFF"],
  "cit-shipments": ["SCHEDULED", "IN_TRANSIT", "DELIVERED", "RECONCILED", "DISPUTED"],
  "treasury-deals": ["DRAFT", "PENDING_APPROVAL", "APPROVED", "EXECUTED", "SETTLED", "REJECTED"],
  "adashi-exceptions": ["OPEN", "ACKNOWLEDGED", "RESOLVED"],
  "adashi-disputes": ["OPEN", "UNDER_REVIEW", "RESOLVED", "ESCALATED"],
  products: ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "RETIRED"],
  "api-clients": ["ACTIVE", "SUSPENDED", "REVOKED"],
  "api-credentials": ["ACTIVE", "ROTATION_REQUIRED", "REVOKED"],
  "decision-recommendations": ["PENDING", "APPROVED", "REJECTED", "EXECUTED"],
};

const WHITELIST_HINT: Record<string, string> = {
  "kyc-documents": "status, reviewed_by, rejection_reason",
  "agent-kyc-documents": "status, reviewed_by, rejection_reason",
  "agent-applications": "status, reviewed_by, rejection_reason",
  "customer-disputes": "status, assigned_to, resolution_notes",
  "risk-cases": "status, assigned_officer, resolution_notes",
  "reconciliation-exceptions": "status, resolved_by",
  "support-tickets": "status, assigned_officer_id",
};

export const EntityDrawer: React.FC = () => {
  const { activeDrawer, closeDrawer } = useAdmin();
  const [copied, setCopied] = useState(false);

  if (!activeDrawer) return null;
  const row = (activeDrawer.data ?? {}) as Record<string, any>;
  const id = row.id ? String(row.id) : "";

  const copyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Known keys that get dedicated rendering per type; everything else is
  // shown generically below.
  const summaryFields = (exclude: string[]) =>
    Object.entries(row)
      .filter(([k, v]) => !exclude.includes(k) && !["id"].includes(k) && v !== null && v !== undefined && typeof v !== "object")
      .slice(0, 24);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
      <aside className="relative w-full max-w-md h-full bg-[var(--surface)] border-l border-[var(--border)] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] p-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">
                {activeDrawer.type}
              </span>
              {row.status && <StatusChip value={row.status} />}
            </div>
            <h3 className="mt-1.5 text-sm font-extrabold text-[var(--foreground)] truncate">
              {row.reference ?? row.ticket_number ?? row.agent_code ?? row.full_name ?? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() ?? "Record"}
            </h3>
            <button onClick={copyId} className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
              {id ? `${id.slice(0, 18)}…` : "no id"}
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <button onClick={closeDrawer} className="p-2 rounded-xl border border-[var(--border)] hover:border-[var(--brand-primary)] text-[var(--foreground-muted)]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Transaction-specific hero */}
          {activeDrawer.type === "TRANSACTION" && (
            <>
              <div className="p-5 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">Amount</div>
                  <div className="text-2xl font-bold font-mono text-[var(--foreground)] mt-0.5">{fmtMoney(row.amount, row.currency)}</div>
                  {row.destination_amount ? (
                    <div className="text-xs font-mono text-amber-400 mt-0.5">
                      ≈ {fmtMoney(row.destination_amount, row.destination_currency)} @ {row.exchange_rate ?? "—"}
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <StatusChip value={row.status} />
                  <div className="text-[10px] font-mono text-[var(--foreground-muted)] mt-1">Fee: {fmtMoney(row.fee, row.currency)}</div>
                </div>
              </div>
              {row.failure_reason && (
                <div className="flex gap-2 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-[11px] text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    <span className="font-bold">Failure reason:</span> {row.failure_reason}
                  </span>
                </div>
              )}
              <Section title="Execution">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type" value={row.transaction_type} />
                  <Field label="Provider" value={row.provider_name} />
                  <Field label="Provider status" value={row.provider_status} />
                  <Field label="Customer ID" value={row.customer_id} />
                  <Field label="Created" value={fmtDate(row.created_at)} />
                  <Field label="Completed" value={fmtDate(row.completed_at)} />
                </div>
              </Section>
              <Section title="Recipient">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" value={row.recipient_name} />
                  <Field label="Account" value={row.recipient_account} />
                  <Field label="Bank" value={row.recipient_bank} />
                  <Field label="Bank code" value={row.recipient_bank_code} />
                </div>
              </Section>
              {row.narration && <Section title="Narration"><p className="text-xs text-[var(--foreground)]/90">{row.narration}</p></Section>}
            </>
          )}

          {/* Customer-specific */}
          {activeDrawer.type === "CUSTOMER" && (
            <>
              <Section title="Profile">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" value={`${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "—"} />
                  <Field label="Email" value={row.email} />
                  <Field label="Phone" value={row.phone} />
                  <Field label="Country" value={row.country} />
                  <Field label="KYC tier" value={row.kyc_tier} />
                  <Field label="Preferred language" value={row.preferred_language} />
                  <Field label="Joined" value={fmtDate(row.created_at)} />
                </div>
              </Section>
              <Section title="Account actions (audited)">
                <StatusAction resource="customers" recordId={id} currentStatus={row.status} allowed={["ACTIVE", "SUSPENDED", "FROZEN", "CLOSED"]} onDone={() => { row.status = undefined; }} />
              </Section>
            </>
          )}

          {/* Agent-specific */}
          {activeDrawer.type === "AGENT" && (
            <>
              <Section title="Profile">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Agent code" value={row.agent_code} />
                  <Field label="Trading name" value={row.trading_name} />
                  <Field label="Legal name" value={row.legal_name} />
                  <Field label="Country" value={row.country} />
                  <Field label="Tier" value={row.tier} />
                  <Field label="Risk tier" value={row.risk_tier} />
                  <Field label="Quality score" value={row.quality_score} />
                  <Field label="Phone" value={row.phone} />
                  <Field label="Email" value={row.email} />
                  <Field label="State / region" value={row.state_or_province} />
                  <Field label="Single txn limit" value={fmtMoney(row.single_transaction_limit, row.currency)} />
                  <Field label="Max cash holding" value={fmtMoney(row.max_cash_holding, row.currency)} />
                  <Field label="Activated" value={fmtDate(row.activated_at)} />
                  <Field label="Last active" value={fmtDate(row.last_active_at)} />
                </div>
              </Section>
              <Section title="Agent actions (audited)">
                <StatusAction resource="agents" recordId={id} currentStatus={row.status} allowed={["ACTIVE", "SUSPENDED", "FROZEN", "TERMINATED"]} onDone={() => {}} />
              </Section>
            </>
          )}

          {/* Generic: every other record type shows its real fields */}
          {(activeDrawer.type === "TRANSACTION" || activeDrawer.type === "CUSTOMER" || activeDrawer.type === "AGENT") ? null : (
            <>
              <Section title="Record fields (live from database)">
                <div className="grid grid-cols-2 gap-3">
                  {summaryFields([]).map(([k, v]) => (
                    <Field key={k} label={k.replaceAll("_", " ")} value={typeof v === "boolean" ? (v ? "Yes" : "No") : k.endsWith("_at") || k === "created_at" ? fmtDate(v) : v} />
                  ))}
                </div>
              </Section>
              {MUTABLE_DRAWER_RESOURCES[activeDrawer.type] && id && (
                <Section title="Actions (audited)">
                  <StatusAction
                    resource={MUTABLE_DRAWER_RESOURCES[activeDrawer.type]}
                    recordId={id}
                    currentStatus={row.status}
                    allowed={STATUS_CHOICES[MUTABLE_DRAWER_RESOURCES[activeDrawer.type]] ?? []}
                    onDone={() => {}}
                  />
                  {!(STATUS_CHOICES[MUTABLE_DRAWER_RESOURCES[activeDrawer.type]] ?? []).length && (
                    <p className="text-[11px] text-[var(--foreground-muted)]">
                      Whitelisted fields: {WHITELIST_HINT[MUTABLE_DRAWER_RESOURCES[activeDrawer.type]] ?? "status"} — actions apply via the audited PATCH endpoint.
                    </p>
                  )}
                </Section>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

export default EntityDrawer;
