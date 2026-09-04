"use client";

import React, { useState } from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  FileCode2,
  Copy,
  Check,
  ExternalLink,
  Download,
  Terminal,
  ShieldCheck,
} from 'lucide-react';

export default function SdksPage() {
  const { sdks } = useDeveloper();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            OFFICIAL CLIENT LIBRARIES
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">Official KoriePay SDKs</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Production-ready client libraries with built-in idempotency management, webhook signature verification, and TypeScript typings.
          </p>
        </div>
      </div>

      {/* SDKs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sdks.map(sdk => (
          <div
            key={sdk.id}
            className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4 flex flex-col justify-between group hover:border-emerald-500/30 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {sdk.language}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  v{sdk.version} • {sdk.status}
                </span>
              </div>

              <div className="font-mono text-xs text-slate-300 font-bold">{sdk.name}</div>

              {/* Install Command */}
              <div className="relative">
                <pre className="p-3 rounded-2xl bg-slate-950 border border-white/5 font-mono text-xs text-emerald-300 overflow-x-auto">
                  {sdk.installCommand}
                </pre>
                <button
                  onClick={() => handleCopy(sdk.installCommand, sdk.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                >
                  {copiedKey === sdk.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Features */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Features:</span>
                <ul className="space-y-1 text-xs text-slate-400 font-mono">
                  {sdk.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-emerald-400">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 text-[10px]">Released {sdk.releaseDate}</span>
              <a
                href={sdk.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
