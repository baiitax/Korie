"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  AlertTriangle,
  Clock,
  Key,
  Radio,
  FileCode,
} from 'lucide-react';
import ProductionAccessModal from '@/components/developer/ProductionAccessModal';

export default function TestingReadinessPage() {
  const { integrationChecklist, productionRequest, organization } = useDeveloper();
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);

  const completedCount = integrationChecklist.filter(c => c.status === 'COMPLETED').length;
  const score = Math.round((completedCount / integrationChecklist.length) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            QUALITY ASSURANCE & COMPLIANCE GATEWAY
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">Production Readiness Scorecard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automated verification checklist required before issuing live financial settlement credentials.
          </p>
        </div>

        <button
          onClick={() => setIsProdModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Apply for Production Access</span>
        </button>
      </div>

      {/* Score Meter Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0a1829] via-[#091524] to-[#060e1a] border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            INTEGRATION VERIFIED
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Overall Readiness: <span className="text-emerald-400">{score}%</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            {completedCount} of {integrationChecklist.length} architectural validation gates passed. Your system is ready for Providus Bank & Coris Bank production settlement routing.
          </p>
        </div>

        <div className="w-32 h-32 rounded-full border-4 border-emerald-500/30 flex items-center justify-center bg-slate-950/80 shrink-0 mx-auto md:mx-0">
          <div className="text-center">
            <span className="text-2xl font-black text-emerald-400">{score}%</span>
            <span className="block text-[9px] font-mono text-slate-400 uppercase">Passed</span>
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase text-slate-400 px-1">Architectural Verification Gates</h3>
        <div className="space-y-3">
          {integrationChecklist.map((item, idx) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{item.title}</h4>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{item.category}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold uppercase self-start sm:self-auto">
                  ● {item.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pl-11">{item.description}</p>

              {item.verificationEvidence && (
                <div className="ml-11 p-3 rounded-2xl bg-slate-950 border border-white/5 text-xs font-mono text-emerald-400">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Verification Evidence:</span>
                  {item.verificationEvidence}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ProductionAccessModal isOpen={isProdModalOpen} onClose={() => setIsProdModalOpen(false)} />
    </div>
  );
}
