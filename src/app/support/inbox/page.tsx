'use client';

import React, { useState } from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { TicketDetailWorkspace } from '@/components/support/TicketDetailWorkspace';
import { EscalationModal } from '@/components/support/EscalationModal';
import { CreateTicketModal } from '@/components/support/CreateTicketModal';
import { SupportTicket, TicketCategory, TicketPriority } from '@/types/support';
import {
  Inbox,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';

export default function SupportInboxPage() {
  const {
    tickets,
    selectedJurisdiction,
    currentOfficer,
    formatDate,
    calculateSlaRemaining,
  } = useSupport();

  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | TicketCategory>('ALL');
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);

  const filteredTickets = tickets.filter((t) => {
    if (selectedJurisdiction !== 'ALL' && t.jurisdiction !== selectedJurisdiction) return false;
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || filteredTickets[0] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Inbox className="w-4 h-4" />
            LIVE OMNICHANNEL INBOX
          </div>
          <h1 className="text-2xl font-extrabold text-white">Live Support Inbox</h1>
          <p className="text-xs text-slate-400">
            Real-time customer conversations with automatic classification and integrated 360° context.
          </p>
        </div>

        <button
          onClick={() => setIsCreateTicketOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-blue-900/30 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Inbound Case</span>
        </button>
      </div>

      {/* Main Inbox Workspace: Left Queue List + Right Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Ticket List (Cols 1-4) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter inbox by customer, subject, or ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
            <span>{filteredTickets.length} active tickets</span>
            <span>Region: {selectedJurisdiction}</span>
          </div>

          {/* Ticket List Items */}
          <div className="space-y-2 overflow-y-auto max-h-[650px] pr-1">
            {filteredTickets.map((t) => {
              const sla = calculateSlaRemaining(t.resolutionDueAt);
              const isSelected = selectedTicket?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-950/40 border-teal-500/60 ring-1 ring-teal-500/40 shadow-lg'
                      : 'bg-slate-950/70 hover:bg-slate-800/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-400">{t.ticketNumber}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        sla.isBreached ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {sla.text}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{t.subject}</h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{t.customerName}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                      {t.jurisdiction === 'NG' ? '🇳🇬' : '🇳🇪'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Ticket Full Workspace (Cols 5-12) */}
        <div className="lg:col-span-8">
          {selectedTicket ? (
            <TicketDetailWorkspace
              ticket={selectedTicket}
              onOpenEscalate={() => setIsEscalateModalOpen(true)}
            />
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Select a ticket from the inbox to open the investigation cockpit.
            </div>
          )}
        </div>
      </div>

      <CreateTicketModal isOpen={isCreateTicketOpen} onClose={() => setIsCreateTicketOpen(false)} />
      <EscalationModal
        ticket={selectedTicket}
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
      />
    </div>
  );
}
