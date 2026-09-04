'use client';

import React from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { Award, CheckCircle2, ShieldCheck, UserCheck, Star } from 'lucide-react';

export default function QualityAssurancePage() {
  const { qaReviews, formatDate } = useSupport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            SUPERVISOR CONVERSATION SAMPLING
          </div>
          <h1 className="text-2xl font-extrabold text-white">Quality Assurance (QA) Evaluations</h1>
          <p className="text-xs text-slate-400">
            Rigorous evaluation of frontline accuracy, identity verification, playbook adherence, and customer communication.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {qaReviews.map((qa) => (
          <div
            key={qa.id}
            className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center">
                  <Award className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-400">{qa.id}</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                      Ticket {qa.ticketId}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-0.5">
                    Evaluation for <strong className="text-teal-300">{qa.officerName}</strong>
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-bold">Overall Score</div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {qa.score} / 100
                </div>
              </div>
            </div>

            {/* Criteria Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Identity Check</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {qa.criteriaRatings.identityVerification}%
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Accuracy</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {qa.criteriaRatings.accuracy}%
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Professionalism</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {qa.criteriaRatings.professionalism}%
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Playbook Adherence</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {qa.criteriaRatings.playbookAdherence}%
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Speed</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {qa.criteriaRatings.resolutionSpeed}%
                </span>
              </div>
            </div>

            {/* Feedback box */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-teal-300">Supervisor Evaluation Remarks:</span>
              <p className="text-slate-300 italic text-[11px] leading-relaxed">&quot;{qa.feedback}&quot;</p>
              <div className="text-[10px] text-slate-500 font-mono pt-1">
                Reviewed by {qa.reviewerName} on {formatDate(qa.reviewedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
