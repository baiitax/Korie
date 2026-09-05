"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { ArrowLeft, MessageSquare, PhoneCall, Mail, Plus, CheckCircle2, ChevronDown, X, HelpCircle } from "lucide-react";

export default function CustomerSupportPage() {
  const { customer, supportTickets, t } = useCustomer();
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("GENERAL");
  const [messageText, setMessageText] = useState("");
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const faqs = [
    { q: t("support.faqTitle"), a: t("support.describeIssue") },
  ];

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !messageText) return;
    const newId = `KP-SUP-${Math.floor(10000 + Math.random() * 90000)}`;
    setCreatedTicketId(newId);
  };

  const handleCloseModal = () => {
    setIsNewTicketModalOpen(false);
    setCreatedTicketId(null);
    setSubject("");
    setMessageText("");
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
        <button onClick={() => setIsNewTicketModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]">
          <Plus className="w-4 h-4" /><span>{t("support.createNewTicket")}</span>
        </button>
      </div>

      {/* Direct Contact Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ContactChannel icon={<MessageSquare className="w-4 h-4" />} title={t("support.whatsappSupport")} sub={t("customer.supportPage.onlineNow")} href="https://wa.me/2348000000000" tone="brand" />
        <ContactChannel icon={<PhoneCall className="w-4 h-4" />} title={t("support.callCenter")} sub="+234 (0) 800-KORIE" href="tel:+2348000000000" tone="info" />
        <ContactChannel icon={<Mail className="w-4 h-4" />} title={t("support.emailSupport")} sub="support@koriepay.com" href="mailto:support@koriepay.com" tone="warning" />
      </div>

      {/* Active Support Tickets */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <h2 className="text-xs font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">{t("support.myTickets")}</h2>
        <div className="space-y-3">
          {supportTickets.map((ticket) => (
            <div key={ticket.id} className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[var(--brand-primary)] font-bold">{ticket.ticketNumber}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)]">● {ticket.status}</span>
              </div>
              <div className="font-bold text-[var(--foreground)]">{ticket.subject}</div>
              <p className="text-[11px] text-[var(--foreground-muted)]">{ticket.description}</p>
              <div className="text-[10px] text-[var(--foreground-muted)] font-mono pt-1">{t("customer.supportPage.lastReplyBy", { name: ticket.lastReplyBy })}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <h2 className="text-xs font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">{t("support.faqTitle")}</h2>
        <div className="space-y-2">
          {SUPPORT_FAQS.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={idx} className="rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] overflow-hidden transition-all">
                <button onClick={() => setOpenFaqIdx(isOpen ? null : idx)} className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-[var(--foreground)] hover:text-[var(--brand-primary)] transition-colors">
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[var(--foreground-muted)] transition-transform ${isOpen ? "rotate-180 text-[var(--brand-primary)]" : ""}`} />
                </button>
                {isOpen && <div className="px-4 pb-4 text-xs text-[var(--foreground-muted)] leading-relaxed border-t border-[var(--border)] pt-2">{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--foreground)]">{t("support.createNewTicket")}</h3>
              <button onClick={handleCloseModal} className="p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"><X className="w-4 h-4" /></button>
            </div>

            {createdTicketId ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-[var(--success)] mx-auto" />
                <h4 className="text-base font-bold text-[var(--foreground)]">{t("customer.supportPage.ticketSubmitted")}</h4>
                <p className="text-xs text-[var(--foreground-muted)]">{t("support.ticketCreated", { ticketNumber: createdTicketId })}</p>
                <button onClick={handleCloseModal} className="w-full py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-bold text-xs hover:bg-[var(--brand-primary-hover)]">{t("common.done")}</button>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                <Field label={t("support.ticketCategory")}>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none">
                    <option value="GENERAL">{t("customer.supportPage.generalInquiries")}</option>
                    <option value="TRANSACTION_DISPUTE">{t("customer.supportPage.txDispute")}</option>
                    <option value="BILL_PAYMENT">{t("customer.supportPage.billIssues")}</option>
                    <option value="ACCOUNT_ACCESS">{t("customer.supportPage.accessSecurity")}</option>
                  </select>
                </Field>
                <Field label={t("support.ticketSubject")}>
                  <input type="text" required placeholder={t("customer.supportPage.subjectPlaceholder")} value={subject} onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none" />
                </Field>
                <Field label={t("support.describeIssue")}>
                  <textarea rows={4} required placeholder={t("customer.supportPage.describePlaceholder")} value={messageText} onChange={(e) => setMessageText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] resize-none focus:outline-none" />
                </Field>
                <button type="submit" className="w-full py-3 rounded-xl bg-[var(--brand-primary)] text-white font-bold text-xs hover:bg-[var(--brand-primary-hover)] shadow-[var(--shadow-md)]">{t("support.submitTicket")}</button>
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
      <div className="text-[10px] text-[var(--foreground-muted)] font-mono mt-0.5">{sub}</div>
    </a>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-[var(--foreground)] font-semibold">{label}</label>{children}</div>;
}

const SUPPORT_FAQS = [
  { q: "How fast do cross-border transfers between Nigeria and Niger settle?", a: "Transfers via the KoriePay Bilateral Sahel corridor settle in sub-seconds between the clearing nodes 24/7." },
  { q: "What should I do if my prepaid electricity token is delayed?", a: "If the DisCo gateway experiences a temporary network lag, you can locate your token in the Transaction Activity receipt or tap Report an Issue to query it." },
  { q: "How do I upgrade to Tier 3 corporate limit?", a: "Navigate to KYC Verification from your profile, upload your CAC/RCCM registration filing, and our compliance desk will review it." },
  { q: "When will KoriePay Cards be available?", a: "KoriePay Cards are coming soon. We're building a secure card experience for everyday payments and financial access." },
];
