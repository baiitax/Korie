"use client";

import React, { useState } from 'react';
import { useDeveloper } from './DeveloperContext';
import { Radio, X, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const WebhookModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { createWebhook, activeApplication, eventCatalog } = useDeveloper();

  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'payment.successful',
    'transfer.successful',
  ]);

  if (!isOpen) return null;

  const handleToggleEvent = (event: string) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter(e => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === eventCatalog.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(eventCatalog.map(e => e.event));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('https://')) {
      alert('Webhook URL must use secure HTTPS protocol.');
      return;
    }
    createWebhook(activeApplication.id, url, selectedEvents);
    setUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0b1222] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Register Webhook Endpoint</h3>
              <p className="text-xs text-slate-400">App: {activeApplication.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">HTTPS Endpoint URL *</label>
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.yourdomain.com/v1/webhooks/koriepay"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Must accept HTTP POST requests with JSON payload and return HTTP 200 within 5 seconds.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300">Subscribed Event Types</label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[10px] font-mono text-teal-400 hover:underline font-bold"
              >
                {selectedEvents.length === eventCatalog.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {eventCatalog.map(ev => (
                <label
                  key={ev.event}
                  onClick={() => handleToggleEvent(ev.event)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedEvents.includes(ev.event)
                      ? 'bg-teal-500/10 border-teal-500/30 text-white'
                      : 'bg-slate-900 border-white/5 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev.event)}
                    onChange={() => {}}
                    className="mt-0.5 rounded border-slate-700 text-teal-500 focus:ring-0"
                  />
                  <div>
                    <div className="font-mono font-bold text-teal-300">{ev.event}</div>
                    <div className="text-[11px] text-slate-400">{ev.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>KoriePay generates a unique HMAC secret to sign every dispatched event header.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20"
            >
              Create Subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WebhookModal;
