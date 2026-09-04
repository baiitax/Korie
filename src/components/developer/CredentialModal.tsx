"use client";

import React, { useState } from 'react';
import { useDeveloper } from './DeveloperContext';
import { Key, X, Check, Copy, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';

export const CredentialModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { createCredential, activeApplication, environment } = useDeveloper();

  const [keyName, setKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'payments:read',
    'payments:write',
    'wallets:read',
  ]);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const availableScopes = [
    { scope: 'payments:read', desc: 'Read payment statuses and transactions' },
    { scope: 'payments:write', desc: 'Initiate payments and checkout sessions' },
    { scope: 'transfers:write', desc: 'Execute cross-border and outward NIP transfers' },
    { scope: 'wallets:read', desc: 'View balances and sub-account statements' },
    { scope: 'wallets:write', desc: 'Create wallets and fund ledger accounts' },
    { scope: 'kyc:verify', desc: 'Perform BVN, NIN, and NIF identity verifications' },
    { scope: 'agency:write', desc: 'Process POS cash-in and cash-out transactions' },
  ];

  const handleToggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    const { rawSecret } = createCredential(activeApplication.id, keyName, selectedScopes);
    setGeneratedSecret(rawSecret);
  };

  const handleCopy = () => {
    if (generatedSecret) {
      navigator.clipboard?.writeText(generatedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    setGeneratedSecret(null);
    setKeyName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0b1222] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Generate API Credential</h3>
              <p className="text-xs text-slate-400">Application: {activeApplication.name}</p>
            </div>
          </div>
          <button onClick={handleFinish} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {generatedSecret ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="block text-white font-bold">Copy Your Secret Key Now</strong>
                For security reasons, this secret key will NEVER be displayed again in the dashboard. Store it in a secure environment variable.
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Generated Secret Key</label>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 mt-1">
                <span className="font-mono text-xs text-emerald-400 font-bold truncate select-all">{generatedSecret}</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 ml-2 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Done & Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Key Label / Identifier *</label>
              <input
                type="text"
                required
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                placeholder="e.g. Backend Production Microservice"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Scoped Permissions (Least Privilege)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {availableScopes.map(s => (
                  <label
                    key={s.scope}
                    onClick={() => handleToggleScope(s.scope)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedScopes.includes(s.scope)
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                        : 'bg-slate-900 border-white/5 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(s.scope)}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <div>
                      <div className="font-mono font-bold text-emerald-300">{s.scope}</div>
                      <div className="text-[11px] text-slate-400">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
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
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                Generate API Key
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CredentialModal;
