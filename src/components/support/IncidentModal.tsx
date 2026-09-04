'use client';

import React, { useState } from 'react';
import { useSupport } from './SupportContext';
import { SupportJurisdiction } from '@/types/support';
import { X, AlertTriangle, Radio } from 'lucide-react';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({ isOpen, onClose }) => {
  const { createIncident } = useSupport();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [affectedServices, setAffectedServices] = useState('NIP Bank Transfers, Card Cashout');
  const [affectedProviders, setAffectedProviders] = useState('NIBSS, Providus Bank Core NG');
  const [jurisdiction, setJurisdiction] = useState<SupportJurisdiction>('NG');
  const [severity, setSeverity] = useState<'MINOR' | 'MAJOR' | 'CRITICAL'>('MAJOR');
  const [customerNotice, setCustomerNotice] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerNotice.trim()) return;

    createIncident({
      title,
      description,
      affectedServices: affectedServices.split(',').map((s) => s.trim()),
      affectedProviders: affectedProviders.split(',').map((p) => p.trim()),
      jurisdiction,
      severity,
      customerNotice,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#090E1A] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-amber-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SYSTEM INCIDENT DECLARATION
              </span>
              <h2 className="text-base font-bold text-white">Declare Technical / Provider Incident</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Incident Headline</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Providus Bank NIP Outbound Transfer Latency"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Severity Tier</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="MINOR">Minor (Localized Disruption)</option>
                <option value="MAJOR">Major (Core Banking Rail Latency)</option>
                <option value="CRITICAL">Critical (Total Gateway / Switch Down)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Region</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="NG">Nigeria 🇳🇬 (NGN Rails)</option>
                <option value="NE">Niger Republic 🇳🇪 (XOF Rails)</option>
                <option value="CROSS_BORDER">Cross-Border 🌍</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Affected Services (Comma separated)</label>
            <input
              type="text"
              value={affectedServices}
              onChange={(e) => setAffectedServices(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Customer-Visible Advisory Banner</label>
            <textarea
              rows={3}
              value={customerNotice}
              onChange={(e) => setCustomerNotice(e.target.value)}
              placeholder="e.g. We are currently experiencing delays with interbank transfers to selected banks. Funds are protected and automated reversals remain active."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-lg text-xs shadow-lg transition"
            >
              Declare Active Incident
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
