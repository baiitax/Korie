"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Code2,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Radio,
  Send,
  Terminal,
} from "lucide-react";

export default function AggregatorDevelopersPage() {
  const { aggregator, t } = useAggregator();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator API Gateway & Webhooks</h1>
          <p className="text-xs text-slate-400">
            Enterprise REST endpoints for float dispatch automation, agent provisioning, and webhook transaction listeners
          </p>
        </div>
        <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold self-start sm:self-auto">
          Aggregator API v1.4
        </span>
      </div>

      {/* Keys Card */}
      <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">API Authentication Credentials</h3>
            <p className="text-xs text-slate-400">Never expose aggregator secret keys in client-side code.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs">Production Aggregator Key</span>
            <span className="text-[10px] font-mono text-slate-400">Last used: 2 mins ago</span>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase">Public Key</label>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-white/5 mt-1">
              <span className="font-mono text-xs text-slate-300 truncate">pk_live_agg_9948102938102938</span>
              <button
                onClick={() => handleCopy("pub", "pk_live_agg_9948102938102938")}
                className="p-1 rounded bg-white/5 text-slate-400 hover:text-white"
              >
                {copiedKey === "pub" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase">Secret Key</label>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-white/5 mt-1">
              <span className="font-mono text-xs text-teal-300 truncate">
                {showSecret ? "kp_live_agg_88201948102948102948" : "kp_live_agg_••••••••••••••••3910"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-1 rounded bg-white/5 text-slate-400 hover:text-white"
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleCopy("sec", showSecret ? "kp_live_agg_88201948102948102948" : "kp_live_agg_••••••••••••••••3910")}
                  className="p-1 rounded bg-white/5 text-slate-400 hover:text-white"
                >
                  {copiedKey === "sec" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* cURL Snippet */}
      <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-teal-400" />
          <h3 className="font-bold text-white text-base">cURL Quickstart: Dispatch Float to Agent</h3>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 font-mono text-xs text-slate-300 border border-white/5 overflow-x-auto space-y-1">
          <div className="text-slate-500"># Direct float injection from Aggregator Wallet to Agency Cash Point</div>
          <div className="text-teal-400">curl -X POST https://api.koriepay.com/v1/aggregator/liquidity/dispatch \</div>
          <div className="pl-4 text-slate-300">-H "Authorization: Bearer kp_live_agg_••••••••" \</div>
          <div className="pl-4 text-slate-300">-H "Content-Type: application/json" \</div>
          <div className="pl-4 text-slate-300">-d '&#123;</div>
          <div className="pl-8 text-amber-300">"agent_id": "agt-001",</div>
          <div className="pl-8 text-amber-300">"amount": 500000,</div>
          <div className="pl-8 text-amber-300">"currency": "NGN"</div>
          <div className="pl-4 text-slate-300">&#125;'</div>
        </div>
      </div>
    </div>
  );
}
