'use client';

import React, { useState } from 'react';
import { useSupport } from './SupportContext';
import { SupportRole, SupportTicket } from '@/types/support';
import { X, ArrowUpRight, ShieldAlert, AlertTriangle } from 'lucide-react';

interface EscalationModalProps {
  ticket: SupportTicket | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EscalationModal: React.FC<EscalationModalProps> = ({ ticket, isOpen, onClose }) => {
  const { escalateTicket, currentOfficer } = useSupport();

  const [targetRole, setTargetRole] = useState<SupportRole>('TIER_2_SENIOR');
  const [rationale, setRationale] = useState('');

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rationale.trim()) return;

    escalateTicket(ticket.id, targetRole, rationale);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#090E1A] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-amber-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                HIERARCHICAL ESCALATION
              </span>
              <h2 className="text-base font-bold text-white">Escalate Case {ticket.ticketNumber}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
            <div className="font-bold text-white">Subject: {ticket.subject}</div>
            <div className="text-slate-400 mt-0.5">
              Customer: {ticket.customerName} ({ticket.customerId})
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Specialist Queue</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as SupportRole)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="TIER_2_SENIOR">Tier-2 Senior Support (Complex Inquiries & VIPs)</option>
              <option value="TIER_3_FINANCE">Tier-3 Finance Operations (Reversals & Settlement Discrepancy)</option>
              <option value="TIER_3_FRAUD">Tier-3 Fraud / Risk (Account Takeover & Chargeback)</option>
              <option value="TIER_3_COMPLIANCE">Tier-3 Compliance / MLRO (AML & Restriction Inquiries)</option>
              <option value="TIER_3_TECH_OPS">Tier-3 Technical Operations (API & Switch Outages)</option>
              <option value="SUPPORT_SUPERVISOR">Support Supervisor (Quality & SLA Breach)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Investigation Findings & Escalation Rationale</label>
            <textarea
              rows={4}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="State what troubleshooting steps have already been completed, NIBSS/switch references, and reason for escalation..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-lg text-xs shadow-lg transition"
            >
              Confirm Escalation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
