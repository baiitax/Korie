'use client';

import React, { useState } from 'react';
import { useSupport } from '@/components/support/SupportContext';
import { AutomationRuleModal } from '@/components/support/AutomationRuleModal';
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  ShieldCheck,
} from 'lucide-react';

export default function AutomationRulesPage() {
  const { automationRules, automationLogs, toggleAutomationRule, formatDate } = useSupport();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4" />
            TIER-0 RULE-BASED AUTOMATION ENGINE
          </div>
          <h1 className="text-2xl font-extrabold text-white">Support Automation & Rules</h1>
          <p className="text-xs text-slate-400">
            Self-service resolution rules, auto-routing triggers, and human-in-the-loop safety controls.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-teal-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>New Automation Rule</span>
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {automationRules.map((rule) => (
          <div
            key={rule.id}
            className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                  {rule.id}
                </span>
                <button
                  onClick={() => toggleAutomationRule(rule.id, !rule.enabled)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                    rule.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{rule.ruleName}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{rule.description}</p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Trigger Event:</span>
                  <span className="font-mono text-teal-300 font-semibold">{rule.triggerEvent}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Category Target:</span>
                  <span className="font-semibold text-slate-200">{rule.category.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Execution Success:</span>
                  <span className="font-bold text-emerald-400 font-mono">{rule.successRate}% ({rule.executionCount} runs)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[11px]">
                {rule.requiresHumanApproval ? 'Approval Required' : 'Fully Automated'}
              </span>
              <button className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold rounded text-[11px] transition flex items-center gap-1">
                <Play className="w-3 h-3" />
                Dry Run
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Execution Logs Feed */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <History className="w-4 h-4 text-teal-400" />
            <span>Recent Automation Execution Telemetry</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live Event Stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3.5">Execution Ref</th>
                <th className="p-3.5">Rule Name</th>
                <th className="p-3.5">Target Ticket</th>
                <th className="p-3.5">Action Result</th>
                <th className="p-3.5">Time Saved</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {automationLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 text-slate-300 font-bold">{log.id}</td>
                  <td className="p-3.5 font-sans font-semibold text-white">{log.ruleName}</td>
                  <td className="p-3.5 text-teal-400">{log.ticketId}</td>
                  <td className="p-3.5 font-sans text-slate-300 max-w-xs">{log.actionTaken}</td>
                  <td className="p-3.5 text-emerald-400 font-bold">+{log.timeSavedMinutes} mins</td>
                  <td className="p-3.5 text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase font-mono">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AutomationRuleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
