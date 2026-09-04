"use client";

import React, { useState } from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  FileCode2,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Server,
  Filter,
  Eye,
  ShieldCheck,
} from 'lucide-react';

export default function RequestLogsPage() {
  const { requestLogs, environment } = useDeveloper();
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeLogs = requestLogs.filter(l => l.environment === environment);

  const filteredLogs = activeLogs.filter(l => {
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === '2XX' && l.statusCode >= 200 && l.statusCode < 300) ||
      (statusFilter === '4XX' && l.statusCode >= 400 && l.statusCode < 500) ||
      (statusFilter === '5XX' && l.statusCode >= 500);
    const matchesSearch = l.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.correlationId && l.correlationId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const selectedLog = activeLogs.find(l => l.id === selectedLogId) || activeLogs[0];

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
            OBSERVABILITY & REQUEST TRACING
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">API Request Stream & Logs</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time request/response inspector with masked sensitive parameters and Providus/Koris telemetry.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {['ALL', '2XX', '4XX', '5XX'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase transition-colors ${
                statusFilter === f
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by path or Request ID..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 2-Column Split: Logs List vs Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Logs Table / List */}
        <div className="p-4 rounded-3xl bg-[#0a1122] border border-white/10 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredLogs.map(log => {
            const isSelected = selectedLog?.id === log.id;
            return (
              <button
                key={log.id}
                onClick={() => setSelectedLogId(log.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all space-y-1.5 ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-slate-950/70 border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.statusCode >= 200 && log.statusCode < 300
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {log.statusCode}
                    </span>
                    <span className="font-bold text-white">{log.method}</span>
                    <span className="text-slate-300 truncate max-w-[180px]">{log.endpoint}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">{log.latencyMs}ms</span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="truncate">{log.requestId}</span>
                  <span>{log.timestamp.split('T')[1].slice(0, 8)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Request & Response Inspector */}
        {selectedLog && (
          <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedLog.statusCode >= 200 && selectedLog.statusCode < 300
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    HTTP {selectedLog.statusCode}
                  </span>
                  <span className="font-bold text-white">{selectedLog.method}</span>
                  <span className="text-slate-300">{selectedLog.endpoint}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Request ID: {selectedLog.requestId} • Latency: {selectedLog.latencyMs}ms
                </div>
              </div>
            </div>

            {/* Provider Node */}
            {selectedLog.providerNode && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">DOWNSTREAM SETTLEMENT NODE:</span>
                <span className="text-emerald-400 font-bold">{selectedLog.providerNode}</span>
              </div>
            )}

            {/* Request Headers */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Request Headers</div>
              <pre className="p-3 rounded-2xl bg-slate-950 border border-white/5 font-mono text-xs text-slate-300 overflow-x-auto">
                {JSON.stringify(selectedLog.requestHeadersMasked, null, 2)}
              </pre>
            </div>

            {/* Request Body (if any) */}
            {selectedLog.requestBodyMasked && (
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Request Payload</div>
                <pre className="p-3 rounded-2xl bg-slate-950 border border-white/5 font-mono text-xs text-emerald-300 overflow-x-auto">
                  {JSON.stringify(selectedLog.requestBodyMasked, null, 2)}
                </pre>
              </div>
            )}

            {/* Response Body */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Response Body</div>
              <pre className="p-3 rounded-2xl bg-slate-950 border border-white/5 font-mono text-xs text-slate-300 overflow-x-auto max-h-48 custom-scrollbar">
                {JSON.stringify(selectedLog.responseBodyMasked, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
