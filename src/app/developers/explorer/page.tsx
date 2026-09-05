"use client";

import React from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import InteractiveApiExplorer from '@/components/developer/InteractiveApiExplorer';
import { Terminal, ShieldCheck, Zap } from 'lucide-react';

export default function ExplorerPage() {
  const { t, environment } = useDeveloper();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            INTERACTIVE API WORKBENCH
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">{t.explorer.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.explorer.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-emerald-400 font-bold">
            Sandbox Node: Providus / Coris Active
          </span>
        </div>
      </div>

      {/* Main Interactive Tool */}
      <InteractiveApiExplorer />
    </div>
  );
}
