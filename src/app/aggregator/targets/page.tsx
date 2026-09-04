"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function AggregatorTargetsPage() {
  const { targets, formatCurrency, t } = useAggregator();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Targets & Milestones</h1>
        <p className="text-xs text-slate-400">
          Supervise quarterly financial targets, agent expansion milestones, and merchant acquiring goals
        </p>
      </div>

      {/* Targets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {targets.map((tgt) => {
          const progress = Math.min(100, Math.round((tgt.currentActual / tgt.targetValue) * 100));
          return (
            <div
              key={tgt.id}
              className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-white/5 text-slate-300">
                    {tgt.period}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base mt-3 leading-snug">{tgt.title}</h3>
                <div className="text-xs text-slate-400 font-mono mt-1">Deadline: {tgt.deadline}</div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Target:</span>
                  <span className="font-mono font-bold text-white">
                    {tgt.unit === "NGN" ? formatCurrency(tgt.targetValue) : `${tgt.targetValue} ${tgt.unit}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Achieved:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {tgt.unit === "NGN" ? formatCurrency(tgt.currentActual) : `${tgt.currentActual} ${tgt.unit}`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-teal-400 h-full rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-right text-[10px] font-mono text-teal-300 font-bold">{progress}% Completed</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
