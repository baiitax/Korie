"use client";

import React, { useState } from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Radio,
  Plus,
  Send,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import WebhookModal from '@/components/developer/WebhookModal';

export default function WebhooksPage() {
  const {
    webhooks,
    webhookLogs,
    deleteWebhook,
    rotateWebhookSecret,
    sendTestWebhook,
    replayWebhookEvent,
    environment,
    t,
  } = useDeveloper();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLogPayload, setSelectedLogPayload] = useState<any>(null);
  const [testSendingId, setTestSendingId] = useState<string | null>(null);
  const [replayingLogId, setReplayingLogId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeWebhooks = webhooks.filter(w => w.environment === environment);
  const activeLogs = webhookLogs.filter(l => l.environment === environment);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestPing = async (webhookId: string) => {
    setTestSendingId(webhookId);
    try {
      await sendTestWebhook(webhookId, 'payment.successful');
    } catch (err) {
      console.error(err);
    } finally {
      setTestSendingId(null);
    }
  };

  const handleReplay = async (logId: string) => {
    setReplayingLogId(logId);
    try {
      await replayWebhookEvent(logId);
    } catch (err) {
      console.error(err);
    } finally {
      setReplayingLogId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
            EVENT-DRIVEN ARCHITECTURE
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">{t.webhooks.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.webhooks.subtitle}</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Webhook Endpoint</span>
        </button>
      </div>

      {/* Endpoints Subscribed */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase text-slate-400 px-1">Active Webhook Endpoints</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeWebhooks.map(whk => (
            <div
              key={whk.id}
              className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-300 truncate max-w-[280px]">
                      {whk.url}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                      ● {whk.status}
                    </span>
                  </div>
                </div>

                {/* Signing Secret */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-white/5 space-y-1 text-xs font-mono">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">HMAC Signature Secret</span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 truncate">{whk.signingSecretMasked}</span>
                    <button
                      onClick={() => handleCopy(whk.signingSecretMasked, whk.id)}
                      className="p-1 rounded bg-white/5 text-slate-400 hover:text-white"
                    >
                      {copiedKey === whk.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Subscribed Events */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Subscribed Events:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {whk.events.map((ev, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300 border border-white/5">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => handleTestPing(whk.id)}
                  disabled={testSendingId === whk.id}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${testSendingId === whk.id ? 'animate-bounce' : ''}`} />
                  <span>{testSendingId === whk.id ? 'Dispatching Ping...' : 'Send Test Ping'}</span>
                </button>

                <button
                  onClick={() => deleteWebhook(whk.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Delivery Logs Table */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h3 className="font-bold text-white text-sm">Real-Time Webhook Delivery Logs</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{activeLogs.length} Deliveries Recorded</span>
        </div>

        <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-400 border-b border-white/5">
              <tr>
                <th className="p-3.5 font-bold">Event Type</th>
                <th className="p-3.5 font-bold">HTTP Code</th>
                <th className="p-3.5 font-bold">Latency</th>
                <th className="p-3.5 font-bold">Attempts</th>
                <th className="p-3.5 font-bold">Timestamp</th>
                <th className="p-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3.5 text-teal-300 font-bold">{log.event}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.httpStatus >= 200 && log.httpStatus < 300
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      HTTP {log.httpStatus}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-400">{log.latencyMs}ms</td>
                  <td className="p-3.5 text-slate-300">{log.attemptNumber} / {log.maxAttempts}</td>
                  <td className="p-3.5 text-slate-500 text-[11px]">{log.timestamp.split('T')[1].slice(0, 8)}</td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => setSelectedLogPayload(log)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 hover:text-white text-[11px]"
                    >
                      Payload
                    </button>
                    <button
                      onClick={() => handleReplay(log.id)}
                      disabled={replayingLogId === log.id}
                      className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-[11px] font-bold"
                    >
                      {replayingLogId === log.id ? 'Replaying...' : 'Replay'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedLogPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[#0b1222] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-mono text-xs font-bold text-white">Event Payload: {selectedLogPayload.event}</span>
              <button onClick={() => setSelectedLogPayload(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-teal-300 overflow-x-auto max-h-72 custom-scrollbar">
              {JSON.stringify(selectedLogPayload.payload, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedLogPayload(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <WebhookModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
