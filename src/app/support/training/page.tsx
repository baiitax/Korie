'use client';

import React from 'react';
import { useSupport } from '@/components/support/SupportContext';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function TrainingAcademyPage() {
  const { trainingModules, completeTrainingModule } = useSupport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            WORKFORCE ONBOARDING & READINESS ACADEMY
          </div>
          <h1 className="text-2xl font-extrabold text-white">Junior Staff Training & Sandbox</h1>
          <p className="text-xs text-slate-400">
            Interactive curriculum, simulated troubleshooting scenarios, and production readiness certifications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainingModules.map((mod) => (
          <div
            key={mod.id}
            className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                  {mod.tier.replace(/_/g, ' ')}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                    mod.completed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {mod.completed ? 'CERTIFIED' : 'IN PROGRESS'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{mod.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{mod.description}</p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Certification:</span>
                  <span className="font-semibold text-teal-300">{mod.certificationName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Time:</span>
                  <span className="font-mono text-slate-200">{mod.estimatedMinutes} mins ({mod.modulesCount} lessons)</span>
                </div>
                {mod.score && (
                  <div className="flex justify-between text-slate-400">
                    <span>Assessment Score:</span>
                    <span className="font-bold text-emerald-400 font-mono">{mod.score}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              {mod.completed ? (
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 py-1.5 bg-emerald-950/40 rounded-lg border border-emerald-800/30">
                  <Award className="w-4 h-4" />
                  <span>Certified in Production</span>
                </div>
              ) : (
                <button
                  onClick={() => completeTrainingModule(mod.id)}
                  className="w-full py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Practice Sandbox Case</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
