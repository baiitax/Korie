"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { agencyApiFetch } from "@/lib/agency/agentSession";
import {
  ArrowLeft,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

const CATEGORIES = [
  { id: "TRANSACTION_DISPUTE", label: "Transaction Dispute" },
  { id: "FLOAT_ISSUE", label: "Float / Liquidity Issue" },
  { id: "TERMINAL_ISSUE", label: "Terminal / Device Issue" },
  { id: "KYC_ISSUE", label: "KYC / Verification Issue" },
  { id: "OTHER", label: "Other" },
];

interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
}

export default function AgentSupportPage() {
  const { t } = useAgent();
  const [category, setCategory] = useState("TRANSACTION_DISPUTE");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const res = await agencyApiFetch("/api/v1/agency/support/tickets");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setTickets(json.data.tickets || []);
      }
    } catch {
      /* silent — ticket history is supplementary, not blocking */
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !subject) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await agencyApiFetch("/api/v1/agency/support/tickets", {
        method: "POST",
        body: JSON.stringify({ category, subject, description }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setIsSent(true);
        setSubject("");
        setDescription("");
        loadTickets();
      } else {
        setSubmitError(json.error?.message || "Could not open ticket.");
      }
    } catch {
      setSubmitError("Could not reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "OPEN") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3" /> OPEN
        </span>
      );
    }
    if (s === "RESOLVED" || s === "CLOSED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
        {s || "IN PROGRESS"}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/agent"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("common.support")}
          </h1>
          <p className="text-xs text-slate-400">
            Agency Help Desk and transaction dispute tickets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-[#0b1b16] border border-emerald-500/30 space-y-1">
          <div className="flex items-center gap-2 font-bold text-white">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Kano Regional Agent WhatsApp Desk</span>
          </div>
          <p className="text-slate-400 text-[11px]">+234 (0) 802-KORIE-AGENT</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center gap-2 font-bold text-white">
            <Mail className="w-4 h-4 text-amber-400" />
            <span>Agent Operations Email</span>
          </div>
          <p className="text-slate-400 text-[11px]">agent.support@koriepay.com</p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white">Open Dispute / Incident Ticket</h2>

        {isSent ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="font-bold text-white text-sm">Ticket Logged</div>
            <p className="text-xs text-slate-400">
              Your ticket has been recorded and Agency Operations will follow up.
            </p>
            <button
              onClick={() => setIsSent(false)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300"
            >
              Open another ticket
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Incident Subject</label>
              <input
                type="text"
                required
                placeholder="e.g. Cash-out debit reversal request"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Incident Details</label>
              <textarea
                rows={3}
                required
                placeholder="Include customer phone, reference and terminal ID..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white resize-none"
              />
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        )}
      </div>

      {/* Ticket History */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Your Tickets</h2>
          <button
            onClick={loadTickets}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 text-center py-4">Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No tickets opened yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {tickets.map((tk) => (
              <div key={tk.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate">{tk.subject}</span>
                  {statusBadge(tk.status)}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{tk.description}</p>
                <div className="text-[10px] text-slate-500 font-mono">
                  {tk.category.replace(/_/g, " ")} • {new Date(tk.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
