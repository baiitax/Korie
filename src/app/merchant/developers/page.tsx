"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  Code2,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Radio,
  Send,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Terminal,
} from "lucide-react";

export default function MerchantDevelopersPage() {
  const { apiKeys, webhooks, rotateApiKey, merchant, t } = useMerchant();
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const simulateWebhookTest = () => {
    setTestWebhookStatus("SENDING");
    setTimeout(() => {
      setTestWebhookStatus("SUCCESS");
      setTimeout(() => setTestWebhookStatus(null), 3000);
    }, 1200);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Developer API Gateway & Webhooks</h1>
          <p className="text-xs text-slate-400">
            Enterprise REST APIs for dynamic checkout generation, virtual accounts provisioning, and real-time webhook listeners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono text-xs font-bold">
            v1.4 REST API Live
          </span>
        </div>
      </div>

      {/* API Keys Card */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">API Authentication Keys</h3>
              <p className="text-xs text-slate-400">Never share your secret key or commit it to client-side code.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div key={key.id} className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{key.keyName}</span>
                <span className="text-[10px] font-mono text-slate-400">
                  Last used: {key.lastUsedAt || "Never"}
                </span>
              </div>

              {/* Public Key */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Public Key (Client-Safe)</label>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-white/5 mt-1">
                  <span className="font-mono text-xs text-slate-300 truncate">{key.publicKey}</span>
                  <button
                    onClick={() => handleCopy(key.id + "-pub", key.publicKey)}
                    className="p-1 rounded bg-white/5 text-slate-400 hover:text-white"
                  >
                    {copiedKey === key.id + "-pub" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Secret Key */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Secret Key (Server Only)</label>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-white/5 mt-1">
                  <span className="font-mono text-xs text-teal-300 truncate">
                    {showSecret ? "kp_live_992817a02b1c3d4e5f6a7b8c9d0e1f2a" : key.secretKeyMasked}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="p-1 rounded bg-white/5 text-slate-400 hover:text-white"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() =>
                        handleCopy(
                          key.id + "-sec",
                          showSecret ? "kp_live_992817a02b1c3d4e5f6a7b8c9d0e1f2a" : key.secretKeyMasked
                        )
                      }
                      className="p-1 rounded bg-white/5 text-slate-400 hover:text-white"
                    >
                      {copiedKey === key.id + "-sec" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Endpoints */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Webhook Subscriptions</h3>
              <p className="text-xs text-slate-400">Receive HTTP POST payloads whenever a payment succeeds or fails.</p>
            </div>
          </div>
          <button
            onClick={simulateWebhookTest}
            disabled={testWebhookStatus === "SENDING"}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-teal-300 flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {testWebhookStatus === "SENDING"
                ? "Dispatching Test Ping..."
                : testWebhookStatus === "SUCCESS"
                ? "HTTP 200 Received!"
                : "Send Test Webhook"}
            </span>
          </button>
        </div>

        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-teal-300 font-bold">{wh.url}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {wh.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {wh.events.map((ev, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-slate-400">
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quickstart Code Snippet */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-teal-400" />
          <h3 className="font-bold text-white text-base">cURL Quickstart: Initialize Checkout</h3>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 font-mono text-xs text-slate-300 border border-white/5 overflow-x-auto space-y-1">
          <div className="text-slate-500"># Charge a customer via Providus Dynamic Virtual NUBAN</div>
          <div className="text-teal-400">curl -X POST https://api.koriepay.com/v1/merchant/checkout \</div>
          <div className="pl-4 text-slate-300">-H "Authorization: Bearer kp_live_••••••••" \</div>
          <div className="pl-4 text-slate-300">-H "Content-Type: application/json" \</div>
          <div className="pl-4 text-slate-300">-d '&#123;</div>
          <div className="pl-8 text-amber-300">"amount": 2500000,</div>
          <div className="pl-8 text-amber-300">"currency": "NGN",</div>
          <div className="pl-8 text-amber-300">"customer_email": "buyer@example.ng",</div>
          <div className="pl-8 text-amber-300">"callback_url": "https://merchant.ng/order/success"</div>
          <div className="pl-4 text-slate-300">&#125;'</div>
        </div>
      </div>
    </div>
  );
}
