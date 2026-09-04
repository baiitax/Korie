'use client';

import React from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { Layers, Clock, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export default function PlaybooksPage() {
  const { playbooks } = useSupport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            STANDARDIZED RESOLUTION RUNBOOKS
          </div>
          <h1 className="text-2xl font-extrabold text-white">Guided Support Playbooks</h1>
          <p className="text-xs text-slate-400">
            Step-by-step diagnostic workflows enabling junior officers to resolve routine cases with zero errors.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {playbooks.map((pb) => (
          <div
            key={pb.id}
            className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                      {pb.id}
                    </span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono font-bold">
                      {pb.targetTier.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-1">{pb.title}</h2>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-mono">
                Estimated Resolution: <strong className="text-teal-300">~{pb.estimatedMinutes} mins</strong>
              </div>
            </div>

            {/* Steps Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {pb.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-400">Step {step.stepNumber}</span>
                    </div>
                    <h3 className="font-bold text-white text-xs">{step.title}</h3>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{step.instructions}</p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-800/60">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Verification Items:</div>
                    {step.checklistItems.map((chk, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                        <span>{chk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
