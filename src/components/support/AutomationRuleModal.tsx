'use client';

import React, { useState } from 'react';
import { useSupport } from './SupportContext';
import { TicketCategory } from '@/types/support';
import { X, Zap, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutomationRuleModal: React.FC<AutomationModalProps> = ({ isOpen, onClose }) => {
  const { automationRules } = useSupport();

  const [ruleName, setRuleName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('PENDING_TRANSACTION');
  const [triggerEvent, setTriggerEvent] = useState('ticket.created');
  const [actionType, setActionType] = useState('AUTO_RESPOND');
  const [isDryRun, setIsDryRun] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    // Simulate saving rule into the active rules list
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#090E1A] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-teal-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-500/40 flex items-center justify-center">
              <Zap className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40">
                NO-CODE AUTOMATION ENGINE
              </span>
              <h2 className="text-base font-bold text-white">Create Support Automation Rule</h2>
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
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Rule Name</label>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Auto-Reassure Pending NIP Transfers with Session Ref"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Trigger Event</label>
              <select
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="ticket.created">Ticket Created</option>
                <option value="transaction.failed">Transaction Failed Event</option>
                <option value="transaction.pending_timeout">Transaction Pending Timeout (&gt;15m)</option>
                <option value="kyc.submitted">KYC Verification Submitted</option>
                <option value="agent.float_low">Agent POS Float Low Threshold</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="PENDING_TRANSACTION">Pending Transfer</option>
                <option value="FAILED_TRANSACTION">Failed Transaction</option>
                <option value="CARD">Card / ATM Error</option>
                <option value="AGENT_FLOAT">Agent Float Sync</option>
                <option value="MERCHANT_SETTLEMENT">Merchant Payout</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Automated Action Execution</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="AUTO_RESPOND">Send Approved Response Template & NIBSS Ref</option>
              <option value="AUTO_ROUTE">Route to Junior Queue with Guided Playbook</option>
              <option value="AUTO_RESOLVE">Auto-Resolve & Close Ticket (Simple FAQs)</option>
              <option value="ESCALATE">Escalate to Tier-3 Finance / Tech Ops</option>
            </select>
          </div>

          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="rounded border-slate-700 text-teal-600 focus:ring-teal-500"
              />
              <span className="font-semibold text-white">Enable Test / Dry-Run Mode</span>
            </label>
            <p className="text-[11px] text-slate-400 pl-6">
              When enabled, the rule evaluates against live events and logs matches without sending live messages to customers.
            </p>
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
              className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-lg text-xs shadow-lg transition"
            >
              Save Automation Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
