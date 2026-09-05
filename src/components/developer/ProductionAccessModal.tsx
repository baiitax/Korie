"use client";

import React, { useState } from 'react';
import { useDeveloper } from './DeveloperContext';
import { ShieldCheck, X, CheckCircle2, Lock, Building, FileText, Send, ArrowRight } from 'lucide-react';

export const ProductionAccessModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { submitProductionRequest, integrationChecklist, organization } = useDeveloper();

  const [settlementBank, setSettlementBank] = useState('Providus Bank Nigeria');
  const [settlementNuban, setSettlementNuban] = useState('0098192039');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitProductionRequest(settlementBank, settlementNuban);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-[#0b1222] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Request Live Production Access</h3>
              <p className="text-xs text-slate-400">Organization: {organization.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-white text-lg">Production Request Submitted</h4>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Our Compliance & Technical Onboarding team has received your application. Because your organization is already verified (Tier 1), review typically concludes within 4 business hours.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Checklist items recap */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-2">
              <div className="text-xs font-bold text-white uppercase font-mono">Automated Readiness Checks</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                {integrationChecklist.map(chk => (
                  <div key={chk.id} className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{chk.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Settlement Bank Node *</label>
              <select
                value={settlementBank}
                onChange={e => setSettlementBank(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="Providus Bank Nigeria">🇳🇬 Providus Bank Nigeria (Commercial NUBAN)</option>
                <option value="Coris Bank Niger Republic">🇳🇪 Coris Bank Niger Republic (WAEMU Account)</option>
                <option value="Bilateral Clearing Pool">🌍 Bilateral Dual-Currency Clearing Pool</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Settlement Account NUBAN / IBAN *</label>
              <input
                type="text"
                required
                value={settlementNuban}
                onChange={e => setSettlementNuban(e.target.value)}
                placeholder="e.g. 0098192039"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Security & Maker-Checker Rule</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Production credentials require secondary approval from an authorized Organization Admin or MLRO before activation.
              </p>
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
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <span>Submit Production Application</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProductionAccessModal;
