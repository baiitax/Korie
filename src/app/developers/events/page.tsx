"use client";

import React, { useState } from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Zap,
  Copy,
  Check,
  Radio,
  Globe2,
  ShieldCheck,
  Code2,
} from 'lucide-react';

export default function EventsCatalogPage() {
  const { eventCatalog } = useDeveloper();
  const [selectedEventName, setSelectedEventName] = useState<string>(eventCatalog[0]?.event || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedEvent = eventCatalog.find(e => e.event === selectedEventName) || eventCatalog[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
            EVENT DEFINITION SCHEMAS
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">Webhook Event Registry</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative payload schemas for real-time notifications across Nigeria and Niger Republic.
          </p>
        </div>
      </div>

      {/* 2-Column Split: Event list vs Payload viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event List */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase text-slate-400 px-1 font-bold">Standard Events</div>
          {eventCatalog.map(ev => (
            <button
              key={ev.event}
              onClick={() => setSelectedEventName(ev.event)}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all space-y-1 ${
                selectedEventName === ev.event
                  ? 'bg-teal-500/10 border-teal-500/40 text-white font-bold'
                  : 'bg-[#0a1122] border-white/5 text-slate-400 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-teal-300 font-bold">{ev.event}</span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                  {ev.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{ev.description}</p>
            </button>
          ))}
        </div>

        {/* Selected Event Payload Schema */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-mono text-sm sm:text-base font-bold text-white">{selectedEvent.event}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedEvent.description}</p>
              </div>
              <button
                onClick={() => handleCopy(JSON.stringify(selectedEvent.samplePayload, null, 2), 'evt_copy')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-teal-300 font-mono flex items-center gap-1.5 hover:bg-slate-800"
              >
                {copiedKey === 'evt_copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'evt_copy' ? 'Copied' : 'Copy Payload'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-teal-300 overflow-x-auto max-h-96 custom-scrollbar">
              {JSON.stringify(selectedEvent.samplePayload, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
