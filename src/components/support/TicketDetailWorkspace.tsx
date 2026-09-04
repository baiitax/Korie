'use client';

import React, { useState } from 'react';
import { useSupport } from './SupportContext';
import { SupportTicket, SupportRole } from '@/types/support';
import {
  Send,
  Lock,
  MessageSquare,
  FileText,
  User,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  Layers,
  HelpCircle,
  Eye,
  Paperclip,
} from 'lucide-react';

interface WorkspaceProps {
  ticket: SupportTicket;
  onOpenEscalate?: () => void;
}

export const TicketDetailWorkspace: React.FC<WorkspaceProps> = ({ ticket, onOpenEscalate }) => {
  const {
    currentOfficer,
    sendTicketMessage,
    resolveTicket,
    assignTicket,
    customer360Map,
    transactionInvestigationMap,
    playbooks,
    knowledgeArticles,
    formatCurrency,
    formatDate,
    calculateSlaRemaining,
  } = useSupport();

  const [messageContent, setMessageContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState<string>('');
  const [rightTab, setRightTab] = useState<'playbook' | 'customer' | 'transaction' | 'knowledge'>('playbook');
  const [playbookChecklist, setPlaybookChecklist] = useState<Record<string, boolean>>({});

  const customerContext = customer360Map[ticket.customerId];
  const transactionContext = ticket.relatedTransactionId
    ? transactionInvestigationMap[ticket.relatedTransactionId]
    : null;

  const matchingPlaybook = playbooks.find((pb) => pb.category === ticket.category) || playbooks[0];
  const matchingArticles = knowledgeArticles.filter((kb) => kb.category === ticket.category);

  const sla = calculateSlaRemaining(ticket.resolutionDueAt);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    sendTicketMessage(ticket.id, messageContent, isInternalNote, selectedMacro || undefined);
    setMessageContent('');
    setSelectedMacro('');
  };

  const handleApplyMacro = (macroKey: string, text: string) => {
    setSelectedMacro(macroKey);
    setMessageContent(text);
    setIsInternalNote(false);
  };

  const toggleChecklistItem = (key: string) => {
    setPlaybookChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#070C18] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* =========================================================================
          LEFT/CENTER PANE (Cols 1-7): Ticket Info & Conversation Stream
      ========================================================================= */}
      <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Ticket Header Strip */}
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                {ticket.ticketNumber}
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold uppercase font-mono">
                {ticket.category.replace(/_/g, ' ')}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  ticket.priority === 'CRITICAL' || ticket.priority === 'URGENT'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {ticket.priority}
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                {ticket.jurisdiction === 'NG' ? '🇳🇬 NGN' : '🇳🇪 XOF'}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1 line-clamp-1">{ticket.subject}</h2>
          </div>

          <div className="flex items-center gap-2">
            {!ticket.assignedOfficerId ? (
              <button
                onClick={() => assignTicket(ticket.id, currentOfficer.id)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition whitespace-nowrap"
              >
                Claim Ticket
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                Assigned: <strong className="text-slate-200">{ticket.assignedOfficerName}</strong>
              </span>
            )}
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <button
                onClick={() => resolveTicket(ticket.id, 'Issue explained and resolved with customer')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center gap-1 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolve</span>
              </button>
            )}
            {onOpenEscalate && (
              <button
                onClick={onOpenEscalate}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 text-slate-300 border border-slate-700 hover:border-amber-600 font-bold text-xs rounded-lg transition"
                title="Escalate to Senior/Specialist"
              >
                Escalate
              </button>
            )}
          </div>
        </div>

        {/* SLA & Sentiment Warning Strip */}
        <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className={`w-3.5 h-3.5 ${sla.isBreached ? 'text-rose-400' : sla.isWarning ? 'text-amber-400' : 'text-teal-400'}`} />
            <span className="text-slate-400">Resolution SLA:</span>
            <span
              className={`font-mono font-bold ${
                sla.isBreached ? 'text-rose-400' : sla.isWarning ? 'text-amber-400' : 'text-teal-300'
              }`}
            >
              {sla.text}
            </span>
          </div>
          <div className="text-slate-400 text-[11px] font-mono">
            Sentiment: <strong className="text-slate-200">{ticket.sentiment}</strong> • Channel: {ticket.channel}
          </div>
        </div>

        {/* Messages & Internal Notes Conversation Feed */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px] bg-[#050812]/50">
          {ticket.messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                msg.isInternalNote
                  ? 'bg-amber-950/20 border-amber-900/40 text-amber-100 ml-4'
                  : msg.senderType === 'CUSTOMER'
                  ? 'bg-slate-900/70 border-slate-800 text-slate-200 mr-4'
                  : msg.senderType === 'AUTOMATION'
                  ? 'bg-teal-950/30 border-teal-800/50 text-teal-200 font-mono text-[11px]'
                  : 'bg-blue-950/30 border-blue-800/40 text-blue-100 ml-4'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold flex items-center gap-1 text-slate-200">
                    {msg.senderType === 'CUSTOMER' && <User className="w-3.5 h-3.5 text-slate-400" />}
                    {msg.senderType === 'AGENT' && <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                    {msg.senderType === 'AUTOMATION' && <Zap className="w-3.5 h-3.5 text-teal-400" />}
                    {msg.senderName}
                  </span>
                  {msg.isInternalNote && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono uppercase font-bold">
                      INTERNAL NOTE (RESTRICTED)
                    </span>
                  )}
                  {msg.macroUsed && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                      MACRO: {msg.macroUsed}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{formatDate(msg.timestamp)}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          ))}
        </div>

        {/* Reply Formulation Console */}
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3">
          {/* Internal Note vs Customer Reply Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsInternalNote(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  !isInternalNote
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Customer Reply (Public)
              </button>
              <button
                type="button"
                onClick={() => setIsInternalNote(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  isInternalNote
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3 h-3" />
                Internal Note (Staff Only)
              </button>
            </div>

            {/* Quick Macro Pills */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Macros:</span>
              <button
                type="button"
                onClick={() =>
                  handleApplyMacro(
                    'MACRO_NIP_PENDING',
                    `Hello ${ticket.customerName}, your transfer reference ${ticket.relatedTransactionId || 'KP-NIP-99201'} is currently processing through the interbank switch. If the beneficiary bank does not confirm receipt within 1 hour, the full amount will be automatically reversed back to your wallet.`
                  )
                }
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-[10px] font-semibold rounded border border-slate-700"
              >
                + Pending Transfer
              </button>
              <button
                type="button"
                onClick={() =>
                  handleApplyMacro(
                    'MACRO_KYC_REQUEST',
                    `Hello ${ticket.customerName}, to upgrade your daily transaction limit, please upload a clear NIN slip or utility bill via the in-app KYC verification section.`
                  )
                }
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-[10px] font-semibold rounded border border-slate-700"
              >
                + KYC Request
              </button>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            rows={3}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder={
              isInternalNote
                ? 'Record internal findings, investigation steps, or escalation notes (never visible to customer)...'
                : 'Type your message to the customer using approved guidelines...'
            }
            className={`w-full bg-slate-950 border rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
              isInternalNote
                ? 'border-amber-700/60 focus:border-amber-500'
                : 'border-slate-700 focus:border-blue-500'
            }`}
            required
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono">
              {isInternalNote ? '🔒 Confidential Staff Note' : '💬 Will be delivered to customer in-app/email'}
            </span>
            <button
              type="submit"
              className={`px-4 py-2 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 ${
                isInternalNote
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                  : 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isInternalNote ? 'Save Internal Note' : 'Send Customer Reply'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================================
          RIGHT PANE (Cols 8-12): Customer 360°, Playbook, & Transaction Trace
      ========================================================================= */}
      <div className="lg:col-span-5 flex flex-col bg-slate-950/40 p-4 space-y-4">
        {/* Context Tabs Header */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-xl p-1 gap-1">
          <button
            onClick={() => setRightTab('playbook')}
            className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition uppercase ${
              rightTab === 'playbook'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Playbook
          </button>
          <button
            onClick={() => setRightTab('customer')}
            className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition uppercase ${
              rightTab === 'customer'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Customer 360°
          </button>
          <button
            onClick={() => setRightTab('transaction')}
            className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition uppercase ${
              rightTab === 'transaction'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tx Trace
          </button>
          <button
            onClick={() => setRightTab('knowledge')}
            className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition uppercase ${
              rightTab === 'knowledge'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Articles
          </button>
        </div>

        {/* Tab 1: Recommended Step-by-Step Playbook */}
        {rightTab === 'playbook' && matchingPlaybook && (
          <div className="space-y-3 flex-1 overflow-y-auto">
            <div className="p-3 bg-teal-950/30 border border-teal-800/40 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-teal-400 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Guided Step-by-Step Resolution
                </span>
                <span className="text-[10px] font-mono font-semibold bg-teal-900/60 px-1.5 py-0.5 rounded">
                  ~{matchingPlaybook.estimatedMinutes} mins
                </span>
              </div>
              <h3 className="text-xs font-bold text-white">{matchingPlaybook.title}</h3>
            </div>

            <div className="space-y-3">
              {matchingPlaybook.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      Step {step.stepNumber}: {step.title}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">{step.instructions}</p>

                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    {step.checklistItems.map((item, idx) => {
                      const checkKey = `${matchingPlaybook.id}-${step.stepNumber}-${idx}`;
                      return (
                        <label
                          key={idx}
                          className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(playbookChecklist[checkKey])}
                            onChange={() => toggleChecklistItem(checkKey)}
                            className="rounded border-slate-700 text-teal-600 focus:ring-teal-500"
                          />
                          <span>{item}</span>
                        </label>
                      );
                    })}
                  </div>

                  {step.recommendedAction && (
                    <div className="text-[10px] text-teal-300 bg-teal-950/40 p-2 rounded border border-teal-800/40 font-semibold">
                      Action: {step.recommendedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Customer 360° Profile */}
        {rightTab === 'customer' && customerContext && (
          <div className="space-y-3 flex-1 overflow-y-auto text-xs">
            <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{customerContext.fullName}</h3>
                  <div className="text-[11px] text-slate-400 font-mono">{customerContext.customerId}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-500/20 text-emerald-300 font-mono">
                  {customerContext.kycTier}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Email (Masked)</span>
                  <div className="font-mono text-slate-300">{customerContext.emailMasked}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Phone (Masked)</span>
                  <div className="font-mono text-slate-300">{customerContext.phoneMasked}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Wallet Balance</span>
                  <div className="font-mono font-bold text-emerald-400">
                    {customerContext.walletBalanceMasked}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Account State</span>
                  <div className="font-bold text-teal-300">{customerContext.accountStatus}</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-300 text-xs">Security & Activity Log</div>
              {customerContext.securityEvents.map((sec, idx) => (
                <div key={idx} className="p-2 bg-slate-950/70 rounded border border-slate-800 text-[11px] space-y-0.5">
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span>{sec.event}</span>
                    <span className="font-mono text-slate-500 text-[10px]">{sec.timestamp}</span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    Device: {sec.device} • IP: {sec.ipMasked}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Transaction Investigation Trace */}
        {rightTab === 'transaction' && (
          <div className="space-y-3 flex-1 overflow-y-auto text-xs">
            {transactionContext ? (
              <>
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Transaction Value</div>
                      <div className="text-base font-bold text-emerald-400 font-mono">
                        {formatCurrency(transactionContext.amount, transactionContext.currency)}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                        transactionContext.status === 'SUCCESSFUL'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : transactionContext.status === 'FAILED'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {transactionContext.status}
                    </span>
                  </div>

                  <div className="text-[11px] space-y-1 pt-2 border-t border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reference:</span>
                      <span className="font-mono text-slate-300">{transactionContext.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Provider Node:</span>
                      <span className="text-slate-300 font-semibold">{transactionContext.providerNode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ledger Status:</span>
                      <span className="text-emerald-400 font-mono">{transactionContext.ledgerPostingStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline stages */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-slate-300 text-xs">Lifecycle Telemetry Trace</div>
                  <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {transactionContext.timeline.map((item, idx) => (
                      <div key={idx} className="relative group">
                        <div
                          className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full border-2 border-[#090E1A] ${
                            item.status === 'PASS' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-200">{item.stage}</span>
                          <span className="font-mono text-slate-500 text-[10px]">{item.timestamp}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                No direct transaction reference attached to this ticket.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Knowledge Base Articles */}
        {rightTab === 'knowledge' && (
          <div className="space-y-3 flex-1 overflow-y-auto text-xs">
            {matchingArticles.map((kb) => (
              <div key={kb.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-400 text-xs">{kb.title}</span>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">
                    {kb.language.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap">{kb.resolution}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
