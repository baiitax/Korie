"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import { merchantApiFetch } from "@/lib/merchant/merchantSession";
import {
  ShieldAlert,
  Phone,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "SETTLEMENT_ISSUE", label: "Settlement Delay" },
  { value: "TECHNICAL", label: "POS Terminal / API / Webhook Error" },
  { value: "TRANSACTION_DISPUTE", label: "Customer Chargeback Evidence" },
  { value: "MERCHANT_ISSUE", label: "Account / KYB Issue" },
  { value: "OTHER", label: "Other" },
];

export default function MerchantSupportPage() {
  const { disputes, formatCurrency, formatDate, t } = useMerchant();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState<{ number: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/support/tickets");
      const json = await res.json();
      if (res.ok && json.status === "success") setTickets(json.data.tickets);
    } catch {
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await merchantApiFetch("/api/v1/merchant/support/tickets", {
        method: "POST",
        body: JSON.stringify({ category, subject: ticketSubject, description: ticketMessage }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setTicketSubmitted({ number: json.data.ticketNumber });
        setTicketSubject("");
        setTicketMessage("");
        await loadTickets();
        setTimeout(() => setTicketSubmitted(null), 4000);
      } else {
        setErrorMessage(json?.error?.message || "Could not submit ticket.");
      }
    } catch {
      setErrorMessage("Network error submitting ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Support & Dispute Escalation</h1>
        <p className="text-xs text-slate-400">
          Chargeback defense, POS terminal support, and real support tickets tracked end-to-end.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Disputes & Ticket History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-[#091020] border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0c1426]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Card & Transfer Chargeback Disputes</h2>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {disputes.filter((d) => d.status !== "RESOLVED" && d.status !== "CLOSED").length} Open Disputes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080d1a] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3">Dispute Case ID</th>
                    <th className="px-4 py-3">Customer / Reason</th>
                    <th className="px-4 py-3 text-right">Claim Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Resolved Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {disputes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No disputes on record.</td>
                    </tr>
                  ) : (
                    disputes.map((d) => (
                      <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-white">{d.id}</td>
                        <td className="px-4 py-3.5">
                          <div className="text-white font-bold">{d.customerName}</div>
                          <div className="text-[10px] text-slate-400">{d.reason}</div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-white">{formatCurrency(d.amount)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{d.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                          {d.resolvedAt ? formatDate(d.resolvedAt) : "Pending"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ticket History */}
          <div className="rounded-3xl bg-[#091020] border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0c1426]">
              <h2 className="text-base font-bold text-white">Your Support Tickets</h2>
            </div>
            <div className="overflow-x-auto">
              {isLoadingTickets ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No tickets submitted yet.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080d1a] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
                    <tr>
                      <th className="px-4 py-3">Ticket #</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3 text-center">Priority</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Opened</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {tickets.map((tk) => (
                      <tr key={tk.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-white">{tk.ticket_number}</td>
                        <td className="px-4 py-3.5 text-slate-200">{tk.subject}</td>
                        <td className="px-4 py-3.5 text-center text-slate-400">{tk.priority}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            {tk.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-400">{formatDate(tk.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SLA & Contact Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Phone className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-sm">Dedicated Merchant Hotline</h3>
              <p className="text-xs text-slate-400">Priority direct line to KoriePay Enterprise Desk.</p>
              <div className="text-sm font-mono font-bold text-teal-400 pt-1">+234 1 888 5674</div>
            </div>

            <div className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-sm">Email Relationship Manager</h3>
              <p className="text-xs text-slate-400">Tickets are tracked with a real SLA response window.</p>
              <div className="text-sm font-mono font-bold text-teal-400 pt-1">merchant-support@koriepay.com</div>
            </div>
          </div>
        </div>

        {/* Right Col: Open New Escalation Ticket */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
          <div>
            <h3 className="font-bold text-white text-base">Submit Escalation Ticket</h3>
            <p className="text-xs text-slate-400">Creates a real ticket tracked in our support desk.</p>
          </div>

          {ticketSubmitted ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-white text-sm">Ticket {ticketSubmitted.number} Created!</h4>
              <p className="text-xs text-slate-300">A support engineer will respond within your SLA window.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of the issue"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide transaction references, error messages, or terminal IDs..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                />
              </div>

              {errorMessage && (
                <div className="text-[11px] text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Submit Ticket</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
