'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSupport } from '@/components/support/SupportContext';
import { SupportCommandHero } from '@/components/support/SupportCommandHero';
import { TicketDetailWorkspace } from '@/components/support/TicketDetailWorkspace';
import { CreateTicketModal } from '@/components/support/CreateTicketModal';
import { IncidentModal } from '@/components/support/IncidentModal';
import { EscalationModal } from '@/components/support/EscalationModal';
import { SupportTicket } from '@/types/support';
import {
  LifeBuoy,
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  User,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function SupportCommandCenterPage() {
  const {
    tickets,
    incidents,
    playbooks,
    automationLogs,
    selectedJurisdiction,
    currentOfficer,
    formatDate,
    calculateSlaRemaining,
  } = useSupport();

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);

  const filteredTickets = selectedJurisdiction === 'ALL'
    ? tickets
    : tickets.filter((t) => t.jurisdiction === selectedJurisdiction);

  return (
    <div className="space-y-6">
      {/* Command Hero */}
      <SupportCommandHero
        onOpenCreateTicket={() => setIsCreateTicketOpen(true)}
        onOpenDeclareIncident={() => setIsIncidentModalOpen(true)}
      />

      {/* Main Grid: Live Queue + Guided Playbooks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Priority Queue (Cols 1-2) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-950 text-blue-400 rounded-lg border border-blue-800/40">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Live Priority Triage Queue</h2>
                  <p className="text-xs text-slate-400">Incoming omnichannel tickets ranked by SLA urgency</p>
                </div>
              </div>
              <Link
                href="/support/tickets"
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                All Tickets <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {filteredTickets.slice(0, 4).map((ticket) => {
                const sla = calculateSlaRemaining(ticket.resolutionDueAt);
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="p-4 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-400 group-hover:underline">
                          {ticket.ticketNumber}
                        </span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                          {ticket.category.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            ticket.priority === 'CRITICAL' || ticket.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                          {ticket.jurisdiction === 'NG' ? '🇳🇬' : '🇳🇪'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-200 line-clamp-1">{ticket.subject}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Customer: <strong className="text-slate-300">{ticket.customerName}</strong></span>
                        <span>•</span>
                        <span>Officer: <strong className="text-slate-300">{ticket.assignedOfficerName || 'Unassigned'}</strong></span>
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div
                        className={`text-xs font-mono font-bold flex items-center gap-1 ${
                          sla.isBreached ? 'text-rose-400' : sla.isWarning ? 'text-amber-400' : 'text-teal-400'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {sla.text}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-1">
                        {ticket.messages.length} message(s)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Guided Playbooks & Quick Automation Strip */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-950 text-teal-400 rounded-lg border border-teal-800/40">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Junior Guided Playbooks</h2>
                  <p className="text-xs text-slate-400">Step-by-step resolution guides</p>
                </div>
              </div>
              <Link
                href="/support/playbooks"
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                All Playbooks <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {playbooks.map((pb) => (
                <Link
                  key={pb.id}
                  href={`/support/playbooks`}
                  className="p-3 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800 rounded-xl block space-y-1 transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 px-1.5 py-0.5 rounded font-bold">
                      {pb.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">~{pb.estimatedMinutes} mins</span>
                  </div>
                  <h3 className="text-xs font-bold text-white group-hover:text-teal-300 transition">
                    {pb.title}
                  </h3>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span>{pb.steps.length} guided steps</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{pb.targetTier.replace(/_/g, ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-400">
              <Zap className="w-4 h-4" />
              <span className="font-bold">Automation Efficiency:</span>
            </div>
            <span className="font-mono font-bold text-white">55% Auto-Handled</span>
          </div>
        </div>
      </div>

      {/* Full Dedicated Interactive Workspace when Ticket is Selected */}
      {selectedTicket && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Active Investigation Cockpit ({selectedTicket.ticketNumber})</span>
            </h3>
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Close Workspace
            </button>
          </div>
          <TicketDetailWorkspace
            ticket={selectedTicket}
            onOpenEscalate={() => setIsEscalateModalOpen(true)}
          />
        </div>
      )}

      {/* Modals */}
      <CreateTicketModal isOpen={isCreateTicketOpen} onClose={() => setIsCreateTicketOpen(false)} />
      <IncidentModal isOpen={isIncidentModalOpen} onClose={() => setIsIncidentModalOpen(false)} />
      <EscalationModal
        ticket={selectedTicket}
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
      />
    </div>
  );
}
