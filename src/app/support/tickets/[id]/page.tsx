'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupport } from '@/components/support/SupportContext';
import { TicketDetailWorkspace } from '@/components/support/TicketDetailWorkspace';
import { EscalationModal } from '@/components/support/EscalationModal';
import { ArrowLeft, LifeBuoy } from 'lucide-react';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id as string;
  const { tickets } = useSupport();

  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);

  const currentTicket = tickets.find((t) => t.id === ticketId || t.ticketNumber === ticketId);

  if (!currentTicket) {
    return (
      <div className="text-center py-20 space-y-4">
        <LifeBuoy className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
        <p className="text-xs text-slate-400">
          The support ticket reference &quot;{ticketId}&quot; could not be retrieved from the active registry.
        </p>
        <Link
          href="/support/tickets"
          className="inline-block px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg"
        >
          Back to Ticket Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-teal-400">{currentTicket.ticketNumber}</span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono uppercase">
              {currentTicket.category.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white">{currentTicket.subject}</h1>
        </div>
      </div>

      <TicketDetailWorkspace
        ticket={currentTicket}
        onOpenEscalate={() => setIsEscalateModalOpen(true)}
      />

      <EscalationModal
        ticket={currentTicket}
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
      />
    </div>
  );
}
