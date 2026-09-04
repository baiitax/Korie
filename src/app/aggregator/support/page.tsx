"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  LifeBuoy,
  Phone,
  Mail,
  Send,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function AggregatorSupportPage() {
  const { t } = useAggregator();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSubject("");
      setMessage("");
    }, 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Support & Technical Escalation</h1>
        <p className="text-xs text-slate-400">
          Direct Tier-1 relationship management, POS hardware dispatch desk, and settlement engineers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Contact info & open tickets */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Phone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Dedicated Aggregator Hotline</h3>
              <p className="text-xs text-slate-400">Priority direct line to KoriePay Core Treasury.</p>
              <div className="text-sm font-mono font-bold text-teal-400 pt-1">+234 64 881 920</div>
            </div>

            <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Treasury Email Desk</h3>
              <p className="text-xs text-slate-400">Guaranteed 15-minute response SLA on all operational tickets.</p>
              <div className="text-sm font-mono font-bold text-teal-400 pt-1">aggregator-desk@koriepay.com</div>
            </div>
          </div>
        </div>

        {/* Right Col: Submit Ticket */}
        <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
          <h3 className="font-bold text-white text-base">Submit Escalation Ticket</h3>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="font-bold text-white text-sm">Ticket Dispatched!</div>
              <p className="text-xs text-slate-300">A settlement engineer will contact you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Issue Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Providus NIP Batch Delay"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide transaction IDs or affected agent codes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Ticket</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
