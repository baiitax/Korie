"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { safeFetch, NormalizedCustomerError } from "@/lib/customer/customerApiError";
import CustomerProfileGate from "@/components/customer/ui/CustomerProfileGate";
import { DataEmptyState, DataErrorState, DataFreshnessBar } from "@/components/customer/ui/CustomerStateViews";
import { KpaySectionLoader } from "@/components/loading";
import {
  ArrowLeft,
  MessageSquare,
  PhoneCall,
  Mail,
  Plus,
  CheckCircle2,
  ChevronDown,
  X,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

/**
 * Support & Resolution Desk.
 *
 * What was wrong here: "Open Support Ticket" minted `KP-SUP-<random>` in the
 * browser and told the customer a case existed, and the list below it rendered
 * a hard-coded fixture (`supportTickets`) that looked like their real,
 * in-progress cases. Neither was true.
 *
 * Now: the form posts to `/api/customer/portal/disputes`, which creates a real
 * record in `ComplaintDisputeEngine` — the same queue the compliance desk
 * reads — and the number shown is that record's own `complaintReference`. The
 * list is the customer's own cases, read back from the server and scoped to the
 * session identity. Only categories the complaint engine actually accepts are
 * offered; there is no free-text "subject" field because the engine has no
 * subject column to store it in.
 *
 * Contact channels come from deployment config. If a channel is not
 * configured, it is not shown — a placeholder phone number on a banking portal
 * is worse than an empty slot.
 */

/** Customer-facing label → the real `ComplaintCategory` the engine accepts. */
const TICKET_CATEGORIES = [
  { value: "FAILED_TRANSFER", labelKey: "support.catFailedTransfer" },
  { value: "DUPLICATE_DEBIT", labelKey: "support.catDuplicateDebit" },
  { value: "UNAUTHORIZED_TRANSACTION", labelKey: "support.catUnauthorised" },
  { value: "FEE_DISPUTE", labelKey: "support.catFeeDispute" },
  { value: "ACCOUNT_RESTRICTION", labelKey: "support.catRestriction" },
] as const;

type CaseView = {
  id: string;
  ticketNumber: string;
  status: string;
  category: string;
  description: string;
  createdAt: string;
  resolvedAt?: string | null;
  transactionReference?: string;
};

export default function CustomerSupportPage() {
  return (
    <CustomerProfileGate>
      <SupportInner />
    </CustomerProfileGate>
  );
}

function SupportInner() {
  const { t, refreshNotifications, language } = useCustomer();
  const [cases, setCases] = useState<CaseView[]>([]);
  const [casesPhase, setCasesPhase] = useState<"loading" | "ready" | "error">("loading");
  const [casesError, setCasesError] = useState<NormalizedCustomerError | null>(null);
  const [casesAt, setCasesAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<string>(TICKET_CATEGORIES[0].value);
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const loadCases = useCallback(async () => {
    setRefreshing(true);
    setCasesPhase((prev) => (prev === "ready" ? "ready" : "loading"));
    const result = await safeFetch<any>(
      "/api/customer/portal/disputes",
      { method: "GET" },
      { timeoutMs: 15000, isOffline: typeof navigator !== "undefined" && !navigator.onLine },
    );
    setRefreshing(false);
    if (!result.ok) {
      setCasesError(result.error);
      setCasesPhase("error");
      return;
    }
    const items: CaseView[] = Array.isArray(result.data?.disputes) ? result.data.disputes : [];
    setCases(items);
    setCasesError(null);
    setCasesPhase("ready");
    setCasesAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  const channels = [
    {
      icon: <MessageSquare className="w-4 h-4" />,
      href: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP,
      labelKey: "support.whatsappSupport",
      tone: "brand" as const,
    },
    {
      icon: <PhoneCall className="w-4 h-4" />,
      href: process.env.NEXT_PUBLIC_SUPPORT_PHONE ? `tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE}` : undefined,
      labelKey: "support.callCenter",
      tone: "info" as const,
    },
    {
      icon: <Mail className="w-4 h-4" />,
      href: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ? `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}` : undefined,
      labelKey: "support.emailSupport",
      tone: "warning" as const,
    },
  ].filter((c) => !!c.href);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim().length < 10) {
      setFormError(t("support.descriptionTooShort"));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const result = await safeFetch<any>(
      "/api/customer/portal/disputes",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description: messageText.trim() }),
      },
      { timeoutMs: 15000, isOffline: typeof navigator !== "undefined" && !navigator.onLine },
    );
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }
    const ref = result.data?.dispute?.ticketNumber;
    if (!ref) {
      setFormError(t("support.noReference"));
      return;
    }
    setCreatedTicketId(ref);
    setMessageText("");
    await Promise.all([loadCases(), refreshNotifications?.()]);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCreatedTicketId(null);
    setMessageText("");
    setFormError(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("support.title")}</h1>
            <p className="text-xs text-[var(--foreground-muted)]">{t("support.subtitle")}</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] font-bold text-xs transition-colors shadow-[var(--shadow-md)]">
          <Plus className="w-4 h-4" /><span>{t("support.createNewTicket")}</span>
        </button>
      </div>

      {/* Direct contact channels — only those the deployment actually configures */}
      {channels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {channels.map((c) => (
            <ContactChannel key={c.labelKey} icon={c.icon} title={t(c.labelKey)} sub={c.href!} href={c.href!} tone={c.tone} />
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 text-[11px] text-[var(--foreground-muted)]">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{t("support.noChannelsConfigured")}</span>
        </div>
      )}

      {/* Real cases, scoped to this session */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">{t("support.myTickets")}</h2>
          <button
            type="button"
            onClick={() => void loadCases()}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground-muted)] hover:text-[var(--brand-primary)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {t("transactions.refresh")}
          </button>
        </div>

        {casesPhase === "loading" ? (
          <KpaySectionLoader message={t("support.casesLoading")} />
        ) : casesPhase === "error" && casesError ? (
          <DataErrorState error={casesError} retryLabel={t("common.tryAgain")} onRetry={() => void loadCases()} />
        ) : cases.length === 0 ? (
          <DataEmptyState title={t("support.casesEmpty")} hint={t("support.casesEmptyHint")} />
        ) : (
          <>
            <div className="space-y-3">
              {cases.map((ticket) => (
                <div key={ticket.id} className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[var(--brand-primary)] font-bold break-all">{ticket.ticketNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] shrink-0">
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)] whitespace-pre-line">{ticket.description}</p>
                  <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-[var(--foreground-muted)] font-mono">
                    <span>{ticket.category}</span>
                    <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <DataFreshnessBar
              updatedAt={casesAt}
              onRefresh={() => void loadCases()}
              isRefreshing={refreshing}
              updatedLabel={t("transactions.lastUpdated")}
              refreshLabel={t("transactions.refresh")}
              lang={language}
            />
          </>
        )}
      </div>

      {/* FAQ */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <h2 className="text-xs font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">{t("support.faqTitle")}</h2>
        <div className="space-y-2">
          {SUPPORT_FAQS.map((faq) => {
            const q = t(faq.qKey);
            const a = t(faq.aKey);
            const idx = SUPPORT_FAQS.indexOf(faq);
            const isOpen = openFaqIdx === idx;
            return (
              <div key={faq.qKey} className="rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] overflow-hidden transition-all">
                <button onClick={() => setOpenFaqIdx(isOpen ? null : idx)} className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-[var(--foreground)] hover:text-[var(--brand-primary)] transition-colors" aria-expanded={isOpen}>
                  <span>{q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-[var(--foreground-muted)] transition-transform ${isOpen ? "rotate-180 text-[var(--brand-primary)]" : ""}`} />
                </button>
                {isOpen && <div className="px-4 pb-4 text-xs text-[var(--foreground-muted)] leading-relaxed border-t border-[var(--border)] pt-2">{a}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* New case modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-label={t("support.createNewTicket")}
          onKeyDown={(e) => { if (e.key === "Escape") handleCloseModal(); }}>
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--foreground)]">{t("support.createNewTicket")}</h3>
              <button onClick={handleCloseModal} className="p-1 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)]" aria-label={t("common.cancel")}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdTicketId ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-[var(--success)] mx-auto" />
                <h4 className="text-base font-bold text-[var(--foreground)]">{t("support.caseOpenedTitle")}</h4>
                <p className="text-xs text-[var(--foreground-muted)]">{t("support.ticketCreated", { ticketNumber: createdTicketId })}</p>
                <button onClick={handleCloseModal} className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] font-bold text-xs hover:bg-[var(--brand-primary-hover)]">{t("common.done")}</button>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">{t("support.reportIntro")}</p>
                <Field label={t("support.ticketCategory")}>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]">
                    {TICKET_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("support.whatHappened")}>
                  <textarea rows={4} required placeholder={t("support.describeIssue")} value={messageText} onChange={(e) => setMessageText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]" />
                </Field>
                {formError && (
                  <p className="text-[11px] font-semibold text-[var(--danger)]" role="alert">{formError}</p>
                )}
                <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] font-bold text-xs hover:bg-[var(--brand-primary-hover)] disabled:opacity-60 shadow-[var(--shadow-md)]">
                  {submitting ? t("support.submitting") : t("support.submitTicket")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactChannel({ icon, title, sub, href, tone }: { icon: React.ReactNode; title: string; sub: string; href: string; tone: "brand" | "info" | "warning" }) {
  const tones: Record<string, string> = {
    brand: "bg-[var(--brand-soft)] text-[var(--brand-primary)]",
    info: "bg-[var(--info-soft)] text-[var(--info)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  };
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] text-left transition-all group">
      <div className={`w-9 h-9 rounded-xl ${tones[tone]} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>{icon}</div>
      <div className="text-xs font-bold text-[var(--foreground)]">{title}</div>
      <div className="text-[10px] text-[var(--foreground-muted)] font-mono mt-0.5 break-all">{sub}</div>
    </a>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-[var(--foreground)] font-semibold">{label}</label>{children}</div>;
}

/** Copy only — the answers must not promise features the portal marks COMING SOON. */
const SUPPORT_FAQS = [
  { qKey: "support.faq1q", aKey: "support.faq1a" },
  { qKey: "support.faq2q", aKey: "support.faq2a" },
  { qKey: "support.faq3q", aKey: "support.faq3a" },
];
