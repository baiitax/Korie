"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import { merchantApiFetch } from "@/lib/merchant/merchantSession";
import {
  Code2,
  Key,
  Copy,
  Check,
  Radio,
  Send,
  Sparkles,
  ShieldCheck,
  Terminal,
  Plus,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: string;
  successRate: number | null;
  lastDeliveryAt: string | null;
}

const AVAILABLE_EVENTS = ['payment.successful', 'payment.failed', 'payment.refunded', 'invoice.paid', 'settlement.completed', 'dispute.opened'];

export default function MerchantDevelopersPage() {
  const { apiKeys, rotateApiKey, merchant, t } = useMerchant();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(true);
  const [isAddingWebhook, setIsAddingWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/webhooks");
      const json = await res.json();
      if (res.ok && json.status === "success") setWebhooks(json.data.webhooks);
    } catch {
    } finally {
      setIsLoadingWebhooks(false);
    }
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleIssueSandboxKey = async () => {
    setIsCreatingKey(true);
    setNewKeySecret(null);
    const result = await rotateApiKey("");
    if (result) setNewKeySecret(result.secretKey);
    setIsCreatingKey(false);
  };

  const handleCreateWebhook = async () => {
    setCreateError(null);
    if (!/^https:\/\//.test(newWebhookUrl)) {
      setCreateError("Enter a valid HTTPS URL.");
      return;
    }
    if (newWebhookEvents.length === 0) {
      setCreateError("Select at least one event.");
      return;
    }
    try {
      const res = await merchantApiFetch("/api/v1/merchant/webhooks", {
        method: "POST",
        body: JSON.stringify({ url: newWebhookUrl, events: newWebhookEvents }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        setCreateError(json?.error?.message || "Could not create webhook.");
        return;
      }
      setNewWebhookSecret(json.data.secret);
      setNewWebhookUrl("");
      setNewWebhookEvents([]);
      await loadWebhooks();
    } catch {
      setCreateError("Network error creating webhook.");
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestingWebhookId(id);
    setTestResult(null);
    try {
      const res = await merchantApiFetch(`/api/v1/merchant/webhooks/${id}/test`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setTestResult({ id, ok: true, message: json.message || `HTTP ${json.data.responseCode} received.` });
      } else {
        setTestResult({ id, ok: false, message: json?.error?.message || "Delivery failed." });
      }
      await loadWebhooks();
    } catch {
      setTestResult({ id, ok: false, message: "Network error dispatching test event." });
    } finally {
      setTestingWebhookId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Developer API Gateway & Webhooks</h1>
          <p className="text-xs text-slate-400">
            Real REST API keys and webhook endpoints backed by your own account — no sample data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono text-xs font-bold">
            v1 REST API Live
          </span>
        </div>
      </div>

      {/* API Keys Card */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">API Authentication Keys</h3>
              <p className="text-xs text-slate-400">Never share your secret key — it is shown only once, at creation.</p>
            </div>
          </div>
          <button
            onClick={handleIssueSandboxKey}
            disabled={isCreatingKey}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isCreatingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Issue Sandbox Key</span>
          </button>
        </div>

        {newKeySecret && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
            <div className="font-bold">Store this secret key now — it will not be shown again.</div>
            <div className="font-mono bg-slate-950 p-2 rounded-lg break-all">{newKeySecret}</div>
          </div>
        )}

        <div className="space-y-3">
          {apiKeys.length === 0 ? (
            <p className="text-xs text-slate-500">No API keys yet. Issue a sandbox key to start integrating.</p>
          ) : (
            apiKeys.map((key) => (
              <div key={key.id} className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{key.keyName}</span>
                  <span className="text-[10px] font-mono text-slate-400">Last used: {key.lastUsedAt || "Never"}</span>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Public Key (Client-Safe)</label>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-white/5 mt-1">
                    <span className="font-mono text-xs text-slate-300 truncate">{key.publicKey}</span>
                    <button onClick={() => handleCopy(key.id + "-pub", key.publicKey)} className="p-1 rounded bg-white/5 text-slate-400 hover:text-white">
                      {copiedKey === key.id + "-pub" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Secret Key (Server Only)</label>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-white/5 mt-1">
                    <span className="font-mono text-xs text-teal-300 truncate">{key.secretKeyMasked}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Only shown once at creation</span>
                  </div>
                </div>
              </div>
            ))
          )}
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
              <p className="text-xs text-slate-400">Receive a real signed HTTP POST whenever a payment succeeds, fails, or settles.</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingWebhook(true)}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-teal-300 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Endpoint</span>
          </button>
        </div>

        {isAddingWebhook && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">New Webhook Endpoint</span>
              <button onClick={() => { setIsAddingWebhook(false); setCreateError(null); setNewWebhookSecret(null); }} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {newWebhookSecret ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="font-bold">Store this signing secret now — it will not be shown again.</div>
                <div className="font-mono bg-slate-950 p-2 rounded-lg break-all">{newWebhookSecret}</div>
                <button onClick={() => { setIsAddingWebhook(false); setNewWebhookSecret(null); }} className="w-full py-2 rounded-lg bg-teal-500 text-slate-950 font-bold text-xs mt-1">Done</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="https://yourapp.com/webhooks/koriepay"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_EVENTS.map((ev) => (
                    <button
                      key={ev}
                      onClick={() => setNewWebhookEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]))}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                        newWebhookEvents.includes(ev) ? "bg-teal-500/20 border-teal-500 text-teal-300" : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                    >
                      {ev}
                    </button>
                  ))}
                </div>
                {createError && (
                  <div className="text-[11px] text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> {createError}
                  </div>
                )}
                <button onClick={handleCreateWebhook} className="w-full py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs">
                  Create Endpoint
                </button>
              </>
            )}
          </div>
        )}

        <div className="space-y-3">
          {isLoadingWebhooks ? (
            <p className="text-xs text-slate-500">Loading webhooks...</p>
          ) : webhooks.length === 0 ? (
            <p className="text-xs text-slate-500">No webhook endpoints yet.</p>
          ) : (
            webhooks.map((wh) => (
              <div key={wh.id} className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono text-xs text-teal-300 font-bold break-all">{wh.url}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${wh.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                      {wh.status}
                    </span>
                    <button
                      onClick={() => handleTestWebhook(wh.id)}
                      disabled={testingWebhookId === wh.id}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-teal-300 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      {testingWebhookId === wh.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      <span>Send Test</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {wh.events.map((ev, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-slate-400">
                      {ev}
                    </span>
                  ))}
                </div>
                {testResult?.id === wh.id && (
                  <div className={`text-[11px] font-mono ${testResult.ok ? "text-emerald-400" : "text-red-400"}`}>{testResult.message}</div>
                )}
              </div>
            ))
          )}
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
