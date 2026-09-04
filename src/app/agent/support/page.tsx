"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  LifeBuoy,
  MessageSquare,
  PhoneCall,
  Mail,
  Send,
  CheckCircle2,
} from "lucide-react";

export default function AgentSupportPage() {
  const { agent, t } = useAgent();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    setIsSent(true);
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
            Dedicated 24/7 Agency Help Desk and transaction dispute support.
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
            <div className="font-bold text-white text-sm">Dispute Ticket Logged</div>
            <p className="text-xs text-slate-400">
              Agency Operations supervisor has received your report and will contact you via WhatsApp.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
            >
              Submit Ticket
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
