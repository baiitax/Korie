"use client";

import React from "react";
import { Radio, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";

export default function WebhooksPage() {
  const webhooks = [
    {
      id: "whk-091",
      provider: "Providus Bank Nigeria",
      event: "transfer.inward.completed",
      status: "DELIVERED",
      attempts: 1,
      responseCode: 200,
      latency: "84ms",
      timestamp: "1 min ago",
    },
    {
      id: "whk-092",
      provider: "Coris Bank Niger Republic",
      event: "settlement.batch.confirmed",
      status: "DELIVERED",
      attempts: 1,
      responseCode: 200,
      latency: "112ms",
      timestamp: "3 mins ago",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
            EVENT STREAM & WEBHOOKS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Webhook Dispatcher & Ingest Monitor</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time delivery verification, exponential backoff retries, and provider payload signatures.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Webhook ID</th>
              <th className="p-4 font-semibold">Provider / Source</th>
              <th className="p-4 font-semibold">Event Type</th>
              <th className="p-4 font-semibold">HTTP Code</th>
              <th className="p-4 font-semibold">Latency</th>
              <th className="p-4 font-semibold">Attempts</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {webhooks.map((w) => (
              <tr key={w.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">{w.id}</td>
                <td className="p-4 text-emerald-400">{w.provider}</td>
                <td className="p-4 text-slate-200">{w.event}</td>
                <td className="p-4 text-emerald-400 font-bold">{w.responseCode}</td>
                <td className="p-4 text-slate-400">{w.latency}</td>
                <td className="p-4 text-slate-300">{w.attempts}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    ● {w.status}
                  </span>
                </td>
                <td className="p-4 text-right text-slate-500 text-[10px]">{w.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
