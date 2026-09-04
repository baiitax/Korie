"use client";

import React, { useState } from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Key,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Lock,
} from 'lucide-react';
import CredentialModal from '@/components/developer/CredentialModal';

export default function CredentialsPage() {
  const {
    credentials,
    rotateCredential,
    revokeCredential,
    environment,
    activeApplication,
    t,
  } = useDeveloper();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  const activeCreds = credentials.filter(c => c.environment === environment);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRotate = (id: string) => {
    if (confirm('Rotate this API key? A 7-day grace period will be initiated on the old key so your servers experience zero downtime.')) {
      setRotatingId(id);
      setTimeout(() => {
        rotateCredential(id);
        setRotatingId(null);
      }, 500);
    }
  };

  const handleRevoke = (id: string) => {
    if (confirm('Are you sure you want to REVOKE this credential? Requests using this key will immediately fail with HTTP 401 Unauthorized.')) {
      revokeCredential(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SECURITY & AUTHENTICATION VAULT
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">{t.credentials.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.credentials.subtitle}</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Generate API Key</span>
        </button>
      </div>

      {/* Security Best Practices Banner */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/10 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-white font-bold">Cryptographic Key Storage & Masking</strong>
          <p className="text-slate-400 leading-relaxed">
            Raw secret keys are never stored in plaintext on our databases. If you misplace a secret key, use our zero-downtime rotation workflow to issue a replacement without interrupting production traffic.
          </p>
        </div>
      </div>

      {/* Credentials List */}
      <div className="space-y-4">
        {activeCreds.map(cred => (
          <div
            key={cred.id}
            className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{cred.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      cred.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : cred.status === 'ROTATING'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    ● {cred.status}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Created by {cred.createdByName} on {cred.createdAt.split('T')[0]} • Last used {cred.lastUsedAt}
                </div>
              </div>

              {cred.status !== 'REVOKED' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRotate(cred.id)}
                    disabled={rotatingId === cred.id}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${rotatingId === cred.id ? 'animate-spin' : ''}`} />
                    <span>Rotate Key</span>
                  </button>
                  <button
                    onClick={() => handleRevoke(cred.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold text-rose-400 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </button>
                </div>
              )}
            </div>

            {/* Grace Period Warning if Rotating */}
            {cred.status === 'ROTATING' && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Rotation Grace Period Active — Key will remain valid until{' '}
                  <strong className="text-white">{cred.gracePeriodExpiresAt?.split('T')[0]}</strong>. Update your servers now.
                </span>
              </div>
            )}

            {/* Keys fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Public Key (Client Safe)</label>
                <div className="p-3 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-300 truncate">{cred.publicKey}</span>
                  <button
                    onClick={() => handleCopy(cred.publicKey, `${cred.id}_pub`)}
                    className="p-1 rounded bg-white/5 text-slate-400 hover:text-white ml-2"
                  >
                    {copiedKey === `${cred.id}_pub` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Secret Key (Server Only)</label>
                <div className="p-3 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between">
                  <span className="text-emerald-400 truncate font-bold">{cred.secretKeyMasked}</span>
                  <button
                    onClick={() => handleCopy(cred.secretKeyMasked, `${cred.id}_sec`)}
                    className="p-1 rounded bg-white/5 text-slate-400 hover:text-white ml-2"
                  >
                    {copiedKey === `${cred.id}_sec` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Scopes */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-mono text-slate-500 mr-2">SCOPES:</span>
              {cred.scopes.map((s, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300 border border-white/5">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <CredentialModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
