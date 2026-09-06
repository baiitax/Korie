"use client";

// =============================================================================
// File: src/app/support/customers/[id]/page.tsx
// Description: Customer 360 (spec §22/§23/§55).
// Identity + KYC + risk from the customer engine, accounts XOF-first from
// the account engine (never USD), live transactions, open tickets &
// disputes. PII masked by default; unmasking requires a capability and is
// audited server-side.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, ShieldCheck, Wallet } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import {
  EmptyState,
  ErrorState,
  LoadingPanel,
  OfflineBanner,
  RiskBadge,
  SectionCard,
  StatusBadge,
  PriorityBadge,
  fmtMoney,
  relTime,
} from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, Customer360Dto, supportErrorCode } from "@/services/supportOpsClient";

export default function Customer360Page() {
  const { id } = useParams<{ id: string }>();
  const { t, activeOfficer, isOnline, toast } = useSupportOps();
  const [view, setView] = useState<Customer360Dto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unmasked, setUnmasked] = useState(false);

  const canUnmask = activeOfficer?.capabilities?.includes("unmask_pii") ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.customer360(id, activeOfficer?.id, unmasked);
    if (isSupportApiError(res)) {
      const code = supportErrorCode(res);
      if (code === "FORBIDDEN_UNMASK") {
        toast(t("supportOps.errors.forbidden"), "error");
        setUnmasked(false);
        const fallback = await supportOps.customer360(id, activeOfficer?.id, false);
        if (isSupportApiError(fallback)) {
          setError(fallback.message);
          setLoading(false);
          return;
        }
        setView(fallback);
        setLoading(false);
        return;
      }
      setError(res.message);
      setLoading(false);
      return;
    }
    setView(res);
    setLoading(false);
  }, [id, activeOfficer?.id, unmasked, t, toast]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  if (loading && !view) return <div className="mx-auto max-w-6xl"><LoadingPanel rows={8} /></div>;
  if (error && !view) return <div className="mx-auto max-w-6xl"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (!view) return null;

  const c = view.customer;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div>
        <button onClick={() => history.back()} className="mb-2 flex items-center gap-1 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("supportOps.common.back")}
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{c.name}</h1>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {c.id} · {t(`supportOps.jurisdictions.${c.country}`)} · {t(`supportOps.customers.kyc`)}: {c.kycTier}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge level={c.riskLevel} t={t} />
            <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--foreground-muted)]">{c.accountStatus}</span>
          </div>
        </div>
      </div>

      {/* Identity strip */}
      <SectionCard>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label={t("supportOps.customers.kyc")} value={c.kycTier} icon={<ShieldCheck className="h-4 w-4" />} />
          <Info label={t("supportOps.customers.lastLogin")} value={c.lastLoginAt ? relTime(c.lastLoginAt, t) : "—"} />
          <Info label={t("supportOps.customers.registered")} value={c.registrationDate ? new Date(c.registrationDate).toLocaleDateString() : "—"} />
          <Info label={t("supportOps.customers.risk" as never) ?? "Risk"} value={c.riskScore != null ? `${c.riskScore} / 100` : "—"} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--foreground-muted)]">
          <span className="font-bold">
            {t("supportOps.common.officer")}: {unmasked && c.email ? c.email : c.emailMasked}
          </span>
          <span className="font-bold">{unmasked && c.phone ? c.phone : c.phoneMasked}</span>
          {!unmasked && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <Eye className="h-3.5 w-3.5" /> {t("supportOps.customers.maskedPii")}
            </span>
          )}
          {canUnmask && (
            <button
              onClick={() => setUnmasked((v) => !v)}
              className={`rounded-[var(--support-radius-input)] border px-3 py-1.5 text-[11px] font-extrabold transition-colors ${
                unmasked
                  ? "border-[var(--state-warning)]/50 bg-[var(--state-warning-soft)] text-[var(--state-warning)]"
                  : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-3)]"
              }`}
            >
              {unmasked ? t("supportOps.customers.maskedPii") : t("supportOps.customers.unmask")}
            </button>
          )}
          {unmasked && <p className="w-full text-[11px] font-semibold text-[var(--state-warning)]">{t("supportOps.customers.unmaskWarning")}</p>}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Accounts — XOF first, never USD (§88) */}
        <SectionCard title={t("supportOps.customers.accounts")}>
          {view.accounts.length === 0 ? (
            <EmptyState title={t("supportOps.common.noData")} />
          ) : (
            <div className="space-y-2">
              {view.accounts.map((a) => (
                <div key={a.currency} className="flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-[var(--foreground)]">
                      {a.currency === "XOF" ? "XOF — CFA" : "NGN"}
                      {a.isPrimary && <span className="ml-2 rounded-full bg-[var(--brand-soft-strong)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--brand-primary)]">{t("supportOps.customers.primary")}</span>}
                    </p>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {a.accountNumberMasked} · {a.assignedBankName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold tabular-nums text-[var(--foreground)]">{unmasked && a.balance > 0 ? fmtMoney(a.balance, a.currency) : a.balanceMasked}</p>
                    {a.heldBalance > 0 && <p className="text-[10px] text-[var(--muted)]">{t("supportOps.customers.held")}: {fmtMoney(a.heldBalance, a.currency)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent transactions (live from the engine) */}
        <SectionCard title={t("supportOps.customers.recentTransactions")}>
          {view.recentTransactions.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
          ) : (
            <div className="space-y-1.5">
              {view.recentTransactions.map((tx) => (
                <Link
                  key={tx.reference}
                  href={`/support/transactions/${tx.reference}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--surface-2)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[var(--foreground)]">{tx.reference}</p>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {tx.type} · {relTime(tx.createdAt, t)} {tx.counterparty ? `· ${tx.counterparty}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-extrabold tabular-nums">{fmtMoney(tx.amount, tx.currency)}</span>
                    <ToneTx status={tx.status} t={t} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Active tickets */}
        <SectionCard title={t("supportOps.customers.activeTickets")}>
          {view.activeTickets.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
          ) : (
            <div className="space-y-1.5">
              {view.activeTickets.map((tk) => (
                <Link key={tk.id} href={`/support/tickets/${tk.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--surface-2)]">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[var(--foreground)]">{tk.ticketNumber}</p>
                    <p className="truncate text-[11px] text-[var(--muted)]">{tk.subject}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <PriorityBadge priority={tk.priority} t={t} />
                    <StatusBadge status={tk.status} t={t} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Open disputes + security events */}
        <div className="space-y-4">
          <SectionCard title={t("supportOps.customers.openDisputes")}>
            {view.openDisputes.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
            ) : (
              <div className="space-y-1.5">
                {view.openDisputes.map((d) => (
                  <Link key={d.id} href={`/support/disputes/${d.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--surface-2)]">
                    <p className="font-bold text-[var(--foreground)]">{d.disputeNumber}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {t(`supportOps.disputes.categoryLabels.${d.category}`) ?? d.category} · {t(`supportOps.disputes.statusLabels.${d.status}`) ?? d.status}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title={t("supportOps.customers.securityEvents")}>
            {view.securityEvents.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--muted)]">{t("supportOps.customers.noSecurityEvents")}</p>
            ) : (
              <div className="space-y-1.5">
                {view.securityEvents.map((e, i) => (
                  <div key={i} className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs">
                    <p className="font-bold text-[var(--foreground)]">{e.event}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {e.device} · {e.ipMasked} · {relTime(e.timestamp, t)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-[var(--surface-2)] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        {icon} {label}
      </p>
      <p className="mt-1 text-[13px] font-extrabold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function ToneTx({ status, t }: { status: string; t: (k: string) => string }) {
  const cls =
    status === "SUCCESSFUL" || status === "COMPLETED" || status === "POSTED"
      ? "bg-[var(--state-success-soft)] text-[var(--state-success)]"
      : status === "FAILED"
        ? "bg-[var(--state-danger-soft)] text-[var(--state-danger)]"
        : "bg-[var(--state-info-soft)] text-[var(--state-info)]";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${cls}`}>{status}</span>;
}
