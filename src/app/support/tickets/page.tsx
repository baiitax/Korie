'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSupport } from '@/components/support/SupportContext';
import { CreateTicketModal } from '@/components/support/CreateTicketModal';
import { TicketDetailWorkspace } from '@/components/support/TicketDetailWorkspace';
import { EscalationModal } from '@/components/support/EscalationModal';
import { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '@/types/support';
import {
  ListFilter,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
} from 'lucide-react';

export default function AllTicketsPage() {
  const {
    tickets,
    selectedJurisdiction,
    currentOfficer,
    calculateSlaRemaining,
    assignTicket,
  } = useSupport();

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TicketPriority>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TicketCategory>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);

  const filtered = tickets.filter((t) => {
    if (selectedJurisdiction !== 'ALL' && t.jurisdiction !== selectedJurisdiction) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <ListFilter className="w-4 h-4" />
            OMNICHANNEL CASE REPOSITORY
          </div>
          <h1 className="text-2xl font-extrabold text-white">All Support Tickets</h1>
          <p className="text-xs text-slate-400">
            Enterprise case registry across customers, agency banking agents, and merchants.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-blue-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>New Inbound Ticket</span>
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by #, subject, or customer name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="TRIAGED">TRIAGED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Categories</option>
            <option value="PENDING_TRANSACTION">Pending Transfer</option>
            <option value="FAILED_TRANSACTION">Failed Transaction</option>
            <option value="AGENT_FLOAT">Agent POS Float</option>
            <option value="MERCHANT_SETTLEMENT">Merchant Settlement</option>
            <option value="CARD">Card / ATM</option>
            <option value="KYC_TIER">KYC Limits</option>
            <option value="LOGIN_ACCESS">Login & Access</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3.5">Ticket #</th>
                <th className="p-3.5">Subject & Context</th>
                <th className="p-3.5">Customer & Channel</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">SLA Status</th>
                <th className="p-3.5">Assignee</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((t) => {
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
                    <td className="p-3.5 text-slate-300">
                      {t.assignedOfficerName || (
                        <span className="text-amber-400 font-mono text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/support/tickets/${t.id}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded text-[11px] transition"
                        >
                          Full Screen
                        </Link>
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="px-3 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded text-[11px] transition shadow"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      <CreateTicketModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <EscalationModal
        ticket={selectedTicket}
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
      />
    </div>
  );
}
