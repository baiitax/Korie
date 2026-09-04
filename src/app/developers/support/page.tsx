"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  LifeBuoy,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  FileCode,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function DeveloperSupportPage() {
  const {
    supportCases,
    createSupportTicket,
    activeApplication,
    environment,
    requestLogs,
    errorAnalytics,
  } = useDeveloper();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<any>('API_ERROR');
  const [priority, setPriority] = useState<any>('MEDIUM');
  const [description, setDescription] = useState('');
  const [selectedReqId, setSelectedReqId] = useState('');
  const [selectedErrCode, setSelectedErrCode] = useState('');

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    createSupportTicket({
      subject,
      category,
      priority,
      description,
      requestId: selectedReqId || undefined,
      errorCode: selectedErrCode || undefined,
    });
    setSubject('');
    setDescription('');
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ENGINEERING ESCALATION & SUPPORT
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">Developer Support Desk</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Direct communication with KoriePay Tier-2 Integration Specialists and API Platform Engineers.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Open Technical Case</span>
        </button>
      </div>

      {/* Auto-Context Banner */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-white/10 text-xs text-slate-300 flex items-start gap-3">
        <Terminal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white font-bold">Automated Technical Context Attachment</strong>
          <p className="text-slate-400 leading-relaxed mt-0.5">
            Support cases automatically link your active application ID (<code className="text-emerald-400 font-mono">{activeApplication.id}</code>), environment (<code className="text-amber-400 font-mono">{environment}</code>), and selected request telemetry to eliminate round-trip investigation delays.
          </p>
        </div>
      </div>

      {/* Cases List */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <h3 className="font-bold text-white text-base">Your Active Support Tickets ({supportCases.length})</h3>

        <div className="space-y-3">
          {supportCases.map(c => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-slate-950 border border-white/5 space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="font-bold text-white">{c.ticketNumber}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 text-slate-400">
                    {c.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      c.status === 'RESOLVED'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    ● {c.status}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-slate-500">
                  Updated {c.updatedAt.split('T')[0]} • {c.messagesCount} Messages
                </span>
              </div>

              <h4 className="font-bold text-white text-sm">{c.subject}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{c.description}</p>

              {c.requestId && (
                <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-emerald-400">
                  <span className="text-slate-500">LINKED REQUEST ID:</span>
                  <span>{c.requestId}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Open Case Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0b1222] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <LifeBuoy className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Open Technical Support Ticket</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject / Issue Summary *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Intermittent 504 on Providus NIP Outward gateway"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none"
                  >
                    <option value="API_ERROR">API Error (4xx/5xx)</option>
                    <option value="WEBHOOK_FAILURE">Webhook Failure</option>
                    <option value="CREDENTIAL_ISSUE">Credential / Auth</option>
                    <option value="INTEGRATION_GUIDANCE">Integration Help</option>
                    <option value="PRODUCTION_ACCESS">Production Request</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none"
                  >
                    <option value="LOW">Low (Guidance)</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High (Blocking QA)</option>
                    <option value="CRITICAL">Critical (Production)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Link Request ID (Optional)</label>
                <input
                  type="text"
                  value={selectedReqId}
                  onChange={e => setSelectedReqId(e.target.value)}
                  placeholder="e.g. KP-REQ-992810a1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Include steps to reproduce, expected vs actual behavior..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <span>Submit Case</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
