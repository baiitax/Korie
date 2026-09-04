'use client';

import React from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function ComplianceCalendarPage() {
  const { calendarEvents, acknowledgeCalendarEvent, formatDate } = useCompliance();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            REGULATORY OBLIGATIONS & CALENDAR
          </div>
          <h1 className="text-2xl font-extrabold text-white">Compliance Obligation Calendar</h1>
          <p className="text-xs text-slate-400">
            Filing deadlines for Central Bank of Nigeria (CBN), NFIU, BCEAO, and CENTIF statutory returns.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {calendarEvents.map((ev) => (
          <div
            key={ev.id}
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
              ev.status === 'OVERDUE'
                ? 'bg-rose-950/20 border-rose-900/60'
                : ev.status === 'COMPLETED'
                ? 'bg-slate-900/40 border-slate-800/60 opacity-80'
                : 'bg-slate-900/60 border-slate-800/80'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {ev.regulator} • {ev.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                    ev.status === 'OVERDUE'
                      ? 'bg-rose-500/20 text-rose-300 font-bold'
                      : ev.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {ev.status}
                </span>
                <h3 className="text-sm font-bold text-white">{ev.title}</h3>
              </div>

              <p className="text-xs text-slate-300">{ev.description}</p>
              <div className="text-xs text-slate-400 font-mono">
                Due Date: <strong className="text-amber-400">{formatDate(ev.dueDate)}</strong>
              </div>
            </div>

            {ev.status !== 'COMPLETED' && (
              <button
                onClick={() => acknowledgeCalendarEvent(ev.id)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Completed
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
