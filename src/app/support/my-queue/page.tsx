'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSupport } from '@/components/support/SupportContext';
import { TicketDetailWorkspace } from '@/components/support/TicketDetailWorkspace';
import { EscalationModal } from '@/components/support/EscalationModal';
import { SupportTicket } from '@/types/support';
import {
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Inbox,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function MyQueuePage() {
  const {
    tickets,
    currentOfficer,
    selectedJurisdiction,
    calculateSlaRemaining,
    resolveTicket,
  } = useSupport();

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);

  // Filter only tickets assigned to the currently active officer
  const myTickets = tickets.filter((t) => {
    if (selectedJurisdiction !== 'ALL' && t.jurisdiction !== selectedJurisdiction) return false;
    if (t.assignedOfficerId !== currentOfficer.id) return false;
    if (t.status === 'RESOLVED' || t.status === 'CLOSED') return false;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4" />
            PERSONAL WORKSPACE QUEUE
          </div>
          <h1 className="text-2xl font-extrabold text-white">My Active Work Queue</h1>
          <p className="text-xs text-slate-400">
            Cases assigned directly to <strong className="text-white">{currentOfficer.fullName}</strong> ({currentOfficer.tier.replace(/_/g, ' ')}).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono">
          <span className="text-slate-400">Workload Capacity:</span>
          <span className="font-bold text-teal-300">
            {myTickets.length} / {currentOfficer.maxCapacity} Max Active
          </span>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within my active queue..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Ticket List Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3.5">Ticket # & Region</th>
                <th className="p-3.5">Issue Subject</th>
                <th className="p-3.5">Customer & Channel</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Priority & SLA</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {myTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    No active tickets assigned in your queue right now. Great job!
                  </td>
                </tr>
              ) : (
                myTickets.map((t) => {
                  const sla = calculateSlaRemaining(t.resolutionDueAt);
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <div className="font-mono text-teal-400 font-bold">{t.ticketNumber}</div>
                        <div className="text-[10px] text-slate-400">
                          {t.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm line-clamp-1">{t.subject}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{t.description}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">{t.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.channel}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {t.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div
                          className={`font-mono text-xs font-bold flex items-center gap-1 ${
                            sla.isBreached ? 'text-rose-400' : sla.isWarning ? 'text-amber-400' : 'text-teal-400'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {sla.text}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">{t.priority}</div>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="px-3 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-lg transition shadow"
                        >
                          Work Case
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicket && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Investigation Cockpit ({selectedTicket.ticketNumber})</h3>
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <TicketDetailWorkspace
            ticket={selectedTicket}
            onOpenEscalate={() => setIsEscalateModalOpen(true)}
          />
        </div>
      )}

      <EscalationModal
        ticket={selectedTicket}
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
      />
    </div>
  );
}
