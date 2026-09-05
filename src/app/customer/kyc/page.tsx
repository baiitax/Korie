"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { safeFetch, NormalizedCustomerError } from "@/lib/customer/customerApiError";
import CustomerProfileGate from "@/components/customer/ui/CustomerProfileGate";
import DocumentUploader from "@/components/customer/ui/DocumentUploader";
import { DataErrorState } from "@/components/customer/ui/CustomerStateViews";
import { KpaySectionLoader } from "@/components/loading";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  FileCheck2,
  Phone,
  Mail,
  User,
  MapPin,
  CalendarDays,
  RefreshCw,
  Lock,
} from "lucide-react";
import { documentStatusKeyFor, documentTypeKeyFor, verificationStateKeyFor,
  verificationStepStatusKeyFor } from "@/lib/customer/verificationLabels";

/**
 * Verification Center — §18–§28.
 *
 * What this page used to be: a tier brochure plus a document form whose submit
 * handler was `setTimeout(1200ms)` → `setUploadSuccess(true)`. Nothing was
 * uploaded, nothing was reviewed, and the customer saw a success card. This
 * rebuild keeps the same architecture (KoriePay KYC = customer master +
 * identity record + document vault) and replaces the fiction with reads and
 * writes against those engines.
 *
 * Design rules honoured:
 *   • progressive steps, current/remaining/why — not one long intimidating form;
 *   • counts of real steps, never an invented percentage;
 *   • "under review" blocks resubmission because the API says so (409), not
 *     because the UI guessed;
 *   • rejection shows a plain reason and a retry path, never compliance internals;
 *   • capability gates are *reported* here but *enforced* server-side.
 */

interface VerificationSummary {
  state: string;
  tier: string;
  steps: {
    id: string;
    status: "COMPLETED" | "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "ACTION_REQUIRED" | "UNAVAILABLE";
    reasonKey: string;
    required: boolean;
    blocked?: boolean;
  }[];
  completedCount: number;
  requiredCount: number;
  remainingCount: number;
  actionKey: string | null;
  documents: { documentType: string; status: string; uploadedAt: string; expiresAt?: string; numberMasked?: string }[];
  canSubmitDocument: boolean;
  generatedAt: string;
}

const STEP_META: Record<string, { labelKey: string; icon: React.ComponentType<{ className?: string }> }> = {
  phone: { labelKey: "verification.step.phone", icon: Phone },
  email: { labelKey: "verification.step.email", icon: Mail },
  personal_information: { labelKey: "verification.step.personal", icon: User },
  date_of_birth: { labelKey: "verification.step.dob", icon: CalendarDays },
  address: { labelKey: "verification.step.address", icon: MapPin },
  identity_document: { labelKey: "verification.step.document", icon: FileCheck2 },
  final_review: { labelKey: "verification.step.review", icon: ShieldCheck },
};

export default function CustomerVerificationPage() {
  const { customer, t, language } = useCustomer();
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("loading");
  const [error, setError] = useState<NormalizedCustomerError | null>(null);

  const load = useCallback(async () => {
    setPhase((p) => (p === "ready" ? "ready" : "loading"));
    const res = await safeFetch<any>("/api/customer/portal/verification", {}, { timeoutMs: 15000 });
    if (!res.ok) {
      setError(res.error);
      setPhase("error");
      return;
    }
    setSummary(res.data?.verification ?? null);
    setError(null);
    setPhase("ready");
  }, []);

  useEffect(() => {
    if (customer) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  if (!customer) return <CustomerProfileGate labelKey="kyc.title"><span /></CustomerProfileGate>;

  const state = summary?.state;
  const underReview = state === "UNDER_REVIEW" || state === "SUBMITTED";
  const blocked = state === "REJECTED" || state === "EXPIRED" || state === "RETRY_REQUIRED" || state === "ACTION_REQUIRED";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pb-1 border-b border-[var(--border)]">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors shrink-0"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight truncate">
            {t("verification.title")}
          </h1>
          <p className="text-xs text-[var(--foreground-muted)] truncate">{t("verification.subtitle")}</p>
        </div>
      </div>

      {phase === "error" && error ? (
        <DataErrorState error={error} onRetry={() => void load()} retryLabel={t("common.tryAgain")} surface="verification" />
      ) : phase === "loading" && !summary ? (
        <KpaySectionLoader message={t("common.loading")} />
      ) : summary ? (
        <>
          {/* Status hero — plain sentence first, badge second. */}
          <section
            className={`rounded-3xl border p-5 space-y-3 shadow-[var(--shadow-card)] ${
              state === "VERIFIED"
                ? "border-[var(--brand-border)] bg-[var(--brand-soft)]/60"
                : blocked
                  ? "border-[var(--danger-soft)] bg-[var(--danger-soft)]/40"
                  : "border-[var(--border)] bg-[var(--surface)]"
            }`}
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
                  {t("verification.identityVerification")}
                </span>
                <p className="text-lg font-extrabold text-[var(--foreground)] leading-snug mt-1">
                  {t(verificationStateKeyFor(summary.state))}
                </p>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[10px] font-mono font-bold text-[var(--brand-primary)]">
                {summary.tier}
              </span>
            </div>

            {state !== "VERIFIED" && (
              <p className="text-xs text-[var(--foreground-muted)]">
                {summary.remainingCount === 0
                  ? t("verification.awaitingReview")
                  : t("verification.stepsAway", { count: summary.remainingCount })}
              </p>
            )}

            {/* Counts, never a fabricated percentage. */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: summary.requiredCount }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < summary.completedCount ? "bg-[var(--brand-primary)]" : "bg-[var(--border-strong)]"}`}
                />
              ))}
            </div>
            <p className="text-[10px] font-mono text-[var(--foreground-muted)]">
              {t("verification.stepCounter", { done: summary.completedCount, total: summary.requiredCount })}
            </p>
          </section>

          {/* Action centre — surfaced here, not buried in Settings (§22). */}
          {summary.actionKey && (
            <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)]/50 p-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-[var(--brand-primary)] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--foreground)]">{t("verification.actionRequired")}</p>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{t(summary.actionKey)}</p>
              </div>
            </div>
          )}

          {underReview && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 flex items-start gap-3">
              <Clock className="h-4 w-4 text-[var(--foreground-muted)] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--foreground)]">{t("verification.underReviewTitle")}</p>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{t("verification.underReviewBody")}</p>
              </div>
            </div>
          )}

          {/* Checklist from backend requirements only */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">
                {t("verification.checklist")}
              </h2>
              <button
                type="button"
                onClick={() => void load()}
                disabled={phase === "loading"}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--brand-primary)] disabled:opacity-60 min-h-[28px]"
                aria-label={t("transactions.refresh")}
              >
                {phase === "loading" ? <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
                {t("transactions.refresh")}
              </button>
            </div>

            <ul className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden">
              {summary.steps
                .filter((s) => s.required || s.status === "COMPLETED")
                .map((step) => {
                  const meta = STEP_META[step.id] ?? STEP_META.personal_information;
                  const Icon = meta.icon;
                  const done = step.status === "COMPLETED";
                  const pending = step.status === "SUBMITTED" || step.status === "IN_PROGRESS";
                  const unavailable = step.status === "UNAVAILABLE";
                  return (
                    <li key={step.id} className="flex items-center gap-3 px-3.5 py-3 min-h-[56px]">
                      <span className="shrink-0" aria-hidden="true">
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                        ) : pending ? (
                          <Clock className="h-5 w-5 text-[var(--brand-primary)]" />
                        ) : (
                          <Circle className="h-5 w-5 text-[var(--border-strong)]" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3 text-[var(--foreground-muted)]" aria-hidden="true" />
                          <span className="text-xs font-bold text-[var(--foreground)]">{t(meta.labelKey)}</span>
                        </span>
                        <span className="block text-[11px] text-[var(--foreground-muted)] mt-0.5">
                          {unavailable
                            ? t("verification.unavailableNote")
                            : done
                              ? t("verification.completed")
                              : t(step.reasonKey)}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md border ${
                          done
                            ? "text-[var(--success)] border-[var(--brand-border)]"
                            : unavailable
                              ? "text-[var(--foreground-muted)] border-[var(--border)]"
                              : "text-[var(--brand-primary)] border-[var(--brand-border)]"
                        }`}
                      >
                        {unavailable ? t("verification.na") : t(verificationStepStatusKeyFor(step.status))}
                      </span>
                    </li>
                  );
                })}
            </ul>
            <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">{t("verification.availabilityNote")}</p>
          </section>

          {/* Document upload / existing documents */}
          <section className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-xs">
              <FileCheck2 className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden="true" />
              <span>{t("verification.documents")}</span>
            </div>

            {summary.documents.length > 0 && (
              <ul className="space-y-1.5">
                {summary.documents.map((d, i) => (
                  <li
                    key={`${d.documentType}-${d.uploadedAt}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] px-3 py-2 text-[11px]"
                  >
                    <span className="min-w-0 truncate font-semibold text-[var(--foreground)]">
                      {t(documentTypeKeyFor(d.documentType))}
                      {d.numberMasked ? ` · ${d.numberMasked}` : ""}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-[var(--foreground-muted)]">
                      {new Date(d.uploadedAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB")}
                    </span>
                    <span
                      className={`shrink-0 font-mono text-[9px] font-bold uppercase ${
                        d.status === "VERIFIED" ? "text-[var(--success)]" : d.status === "REJECTED" ? "text-[var(--danger)]" : "text-[var(--brand-primary)]"
                      }`}
                    >
                      {t(documentStatusKeyFor(d.status))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {summary.canSubmitDocument ? (
              <div className="space-y-3">
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">{t("verification.uploadIntro")}</p>
                <DocumentUploader
                  documentType="NATIONAL_ID"
                  t={t}
                  onUploaded={() => void load()}
                />
              </div>
            ) : (
              <p className="text-[11px] text-[var(--foreground-muted)] flex items-center gap-1.5">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {t("verification.resubmitLocked")}
              </p>
            )}
          </section>

          <p className="text-[10px] text-[var(--foreground-muted)] text-center leading-relaxed pb-2">
            {t("verification.securityNote")}
          </p>
        </>
      ) : (
        <DataEmptyVerification onRetry={load} t={t} />
      )}
    </div>
  );
}

const DataEmptyVerification: React.FC<{ onRetry: () => void; t: (k: string) => string }> = ({ onRetry, t }) => (
  <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center space-y-2">
    <p className="text-sm font-bold text-[var(--foreground)]">{t("verification.noData")}</p>
    <p className="text-[11px] text-[var(--foreground-muted)]">{t("verification.noDataHint")}</p>
    <button type="button" onClick={onRetry} className="text-xs font-bold text-[var(--brand-primary)] hover:underline">
      {t("common.tryAgain")}
    </button>
  </div>
);
