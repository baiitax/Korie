'use client';

// =============================================================================
// Honest states for an engine-backed ticket book.
//
// GAP-3: the console used to open with five fabricated tickets, so it never had
// to answer "what does an empty desk look like?" — and it never had to admit
// which panels were still fixtures. Both are answered here, in one place, so a
// page cannot show a plausible desk without showing the provenance too.
// =============================================================================

import React from 'react';
import { AlertTriangle, CheckCircle2, Database, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { useSupport } from './SupportContext';

export const SupportBookBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { tickets, ticketsPhase, ticketsError, ticketsSyncedAt, refreshTickets, simulationLayer } = useSupport();

  const fixtureKeys = simulationLayer.map((s) => s.key).join(' · ');

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-3.5 py-2.5 text-[11px] ${
          ticketsPhase === 'error'
            ? 'border-rose-500/30 bg-rose-500/5 text-rose-200'
            : 'border-teal-500/20 bg-teal-500/5 text-slate-300'
        }`}
      >
        {ticketsPhase === 'loading' ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-300" />
            <span>Reading the complaint book…</span>
          </>
        ) : ticketsPhase === 'error' ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">
              The complaint engine could not be read ({ticketsError}). Nothing is shown rather than showing a sample queue.
            </span>
            <button
              type="button"
              onClick={() => void refreshTickets()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 px-2 py-1 font-bold text-rose-100 hover:bg-rose-500/10"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
            <span className="font-mono">
              {tickets.length} case{tickets.length === 1 ? '' : 's'} read from ComplaintDisputeEngine
              {ticketsSyncedAt ? ` · ${new Date(ticketsSyncedAt).toLocaleTimeString()}` : ''}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">triage, notes and redress on this desk write to that engine</span>
            <button
              type="button"
              onClick={() => void refreshTickets()}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-slate-300 hover:bg-white/5"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </>
        )}
      </div>

      <p
        className="flex items-start gap-1.5 px-1 text-[10px] leading-snug text-slate-500"
        title={simulationLayer.map((s) => `${s.key}: ${s.why}`).join('\n')}
      >
        <Database className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          <strong className="font-semibold text-slate-400">Simulation layer on this console:</strong> {fixtureKeys} — no engine
          backs them, so they are fixtures and are labelled as such. The ticket book itself is not a fixture.
        </span>
      </p>
    </div>
  );
};

export const SupportBookEmpty: React.FC<{ filtered?: boolean }> = ({ filtered = false }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/40 px-6 py-10 text-center">
    <Inbox className="h-6 w-6 text-slate-600" />
    <p className="text-sm font-bold text-slate-300">
      {filtered ? 'No case matches these filters' : 'The complaint book is empty'}
    </p>
    <p className="max-w-md text-[11px] leading-snug text-slate-500">
      {filtered
        ? 'Clear a filter to see the cases the engine holds.'
        : 'No customer case has been recorded yet. A desk with nothing in it is the honest state of a book nobody has written to.'}
    </p>
  </div>
);
