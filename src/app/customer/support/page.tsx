"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import {
  ArrowLeft,
  LifeBuoy,
  MessageSquare,
  PhoneCall,
  Mail,
  Plus,
  Send,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  X,
} from "lucide-react";

export default function CustomerSupportPage() {
  const { customer, supportTickets, t } = useCustomer();
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("GENERAL");
  const [messageText, setMessageText] = useState("");
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How fast do cross-border transfers between Nigeria and Niger settle?",
      a: "Transfers via the KoriePay Bilateral Sahel corridor settle in sub-seconds (under 1 second) directly between Providus Bank (Nigeria) and Koris Bank (Niger Republic) clearing nodes 24/7.",
    },
    {
      q: "What should I do if my prepaid electricity token is delayed?",
      a: "If the DisCo gateway experiences a temporary network lag, you can locate your token in the Transaction Activity receipt or tap 'Report an Issue' for instant auto-querying.",
    },
    {
      q: "How do I upgrade to Tier 3 corporate limit?",
      a: "Navigate to KYC Verification from your profile, upload your CAC/RCCM registration filing, and our compliance desk will review it within 24 hours.",
    },
    {
      q: "Can I use my KoriePay USD virtual card on global sites?",
      a: "Yes, your virtual Visa/Mastercard works internationally for subscriptions, cloud services, and e-commerce transactions in USD, EUR, and GBP.",
    },
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
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {t("support.title")}
            </h1>
            <p className="text-xs text-slate-400">
              {t("support.subtitle")}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewTicketModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>{t("support.createNewTicket")}</span>
        </button>
      </div>

      {/* Direct Contact Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href="https://wa.me/2348000000000"
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-2xl bg-[#0b1b16] border border-emerald-500/30 hover:border-emerald-500 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white">{t("support.whatsappSupport")}</div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Online Now</div>
        </a>

        <a
          href="tel:+2348000000000"
          className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white">{t("support.callCenter")}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">+234 (0) 800-KORIE</div>
        </a>

        <a
          href="mailto:support@koriepay.com"
          className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Mail className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white">{t("support.emailSupport")}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">support@koriepay.com</div>
        </a>
      </div>

      {/* Active Support Tickets */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
          {t("support.myTickets")}
        </h2>

        <div className="space-y-3">
          {supportTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-emerald-400 font-bold">{ticket.ticketNumber}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                  ● {ticket.status}
                </span>
              </div>
              <div className="font-bold text-white">{ticket.subject}</div>
              <p className="text-[11px] text-slate-300">{ticket.description}</p>
              <div className="text-[10px] text-slate-500 font-mono pt-1">
                Last reply by {ticket.lastReplyBy}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
          {t("support.faqTitle")}
        </h2>

        <div className="space-y-2">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-white hover:text-emerald-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0b1222] border border-white/15 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">{t("support.createNewTicket")}</h3>
              <button onClick={handleCloseModal} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdTicketId ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Ticket Submitted</h4>
                <p className="text-xs text-slate-300">
                  {t("support.ticketCreated", { ticketNumber: createdTicketId })}
                </p>
                <button
                  onClick={handleCloseModal}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400"
                >
                  {t("common.done")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">{t("support.ticketCategory")}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="GENERAL">General Inquiries</option>
                    <option value="TRANSACTION_DISPUTE">Transaction Dispute</option>
                    <option value="BILL_PAYMENT">Bill & Token Issues</option>
                    <option value="ACCOUNT_ACCESS">Account Access & Security</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">{t("support.ticketSubject")}</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">{t("support.describeIssue")}</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide relevant details..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                >
                  {t("support.submitTicket")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
