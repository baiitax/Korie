"use client";

import React, { useState } from 'react';
import { useDeveloper } from './DeveloperContext';
import { ApiProduct, ApiEndpoint } from '@/types/developer';
import {
  Terminal,
  Play,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';

export const InteractiveApiExplorer: React.FC<{ initialEndpointPath?: string }> = ({ initialEndpointPath }) => {
  const { apiProductsList, environment, simulateApiCall, credentials, activeApplication } = useDeveloper();

  // Find default endpoint
  const allEndpoints: ApiEndpoint[] = apiProductsList.flatMap(p => p.endpoints);
  const defaultEp = allEndpoints.find(e => e.path === initialEndpointPath) || allEndpoints[0];

  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(defaultEp.id);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'typescript' | 'python' | 'go' | 'php'>('curl');
  const [requestBodyText, setRequestBodyText] = useState<string>(
    JSON.stringify(defaultEp.sampleRequestBody || {}, null, 2)
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    `idem_${Math.random().toString(36).substring(2, 10)}-${Date.now()}`
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseResult, setResponseResult] = useState<{
    status: number;
    latency: number;
    body: any;
    headers: any;
  } | null>(null);
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const selectedEndpoint = allEndpoints.find(e => e.id === selectedEndpointId) || allEndpoints[0];
  const activeCred = credentials.find(c => c.environment === environment) || credentials[0];

  const handleEndpointChange = (id: string) => {
    setSelectedEndpointId(id);
    const ep = allEndpoints.find(e => e.id === id);
    if (ep) {
      setRequestBodyText(JSON.stringify(ep.sampleRequestBody || {}, null, 2));
      setResponseResult(null);
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    let parsedBody = {};
    try {
      if (requestBodyText.trim()) {
        parsedBody = JSON.parse(requestBodyText);
      }
    } catch (err) {
      alert('Invalid JSON in request body');
      setIsLoading(false);
      return;
    }

    const res = await simulateApiCall(
      selectedEndpoint.path,
      selectedEndpoint.method,
      parsedBody,
      {
        'Authorization': `Bearer ${activeCred.publicKey}`,
        'Idempotency-Key': idempotencyKey,
      }
    );
    setResponseResult(res);
    setIsLoading(false);
  };

  const handleCopy = (text: string, type: 'response' | 'code') => {
    navigator.clipboard?.writeText(text);
    if (type === 'response') {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const generateCodeSnippet = () => {
    const baseUrl = environment === 'PRODUCTION' ? 'https://api.koriepay.com' : 'https://sandbox.koriepay.com';
    const authHeader = `Bearer ${environment === 'PRODUCTION' ? 'kp_live_••••••••' : 'kp_test_••••••••'}`;

    if (selectedLanguage === 'curl') {
      return `curl -X ${selectedEndpoint.method} "${baseUrl}${selectedEndpoint.path}" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: ${idempotencyKey}" \\
  -d '${requestBodyText.replace(/\n/g, '')}'`;
    }

    if (selectedLanguage === 'typescript') {
      return `import { KoriePayClient } from '@koriepay/node-sdk';

const koriepay = new KoriePayClient({
  secretKey: process.env.KORIEPAY_SECRET_KEY,
  environment: '${environment.toLowerCase()}',
});

async function run() {
  const response = await koriepay.request({
    method: '${selectedEndpoint.method}',
    path: '${selectedEndpoint.path}',
    idempotencyKey: '${idempotencyKey}',
    body: ${requestBodyText},
  });

  console.log(response);
}

run();`;
    }

    if (selectedLanguage === 'python') {
      return `import koriepay

client = koriepay.Client(
    api_key="kp_test_••••••••",
    environment="${environment.toLowerCase()}"
)

response = client.request(
    method="${selectedEndpoint.method}",
    path="${selectedEndpoint.path}",
    headers={"Idempotency-Key": "${idempotencyKey}"},
    json_data=${requestBodyText}
)

print(response)`;
    }

    if (selectedLanguage === 'go') {
      return `package main

import (
  "fmt"
  "github.com/koriepay/koriepay-go"
)

func main() {
  client := koriepay.NewClient("kp_test_••••••••", koriepay.Env${environment === 'PRODUCTION' ? 'Production' : 'Sandbox'})
  resp, err := client.Do("${selectedEndpoint.method}", "${selectedEndpoint.path}", map[string]interface{}{})
  if err != nil {
    panic(err)
  }
  fmt.Println(resp)
}`;
    }

    if (selectedLanguage === 'php') {
      return `<?php
require_once 'vendor/autoload.php';

$client = new \\KoriePay\\Client('kp_test_••••••••', [
    'environment' => '${environment.toLowerCase()}'
]);

$response = $client->send('${selectedEndpoint.method}', '${selectedEndpoint.path}', ${requestBodyText});
print_r($response);`;
    }

    return '';
  };

  return (
    <div className="space-y-6">
      {/* Endpoint Selector Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black uppercase ${
                selectedEndpoint.method === 'POST'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              {selectedEndpoint.method}
            </span>
            <select
              value={selectedEndpointId}
              onChange={e => handleEndpointChange(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              {allEndpoints.map(ep => (
                <option key={ep.id} value={ep.id}>
                  {ep.method} {ep.path} — {ep.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIdempotencyKey(`idem_${Math.random().toString(36).substring(2, 10)}-${Date.now()}`)}
              className="p-1.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1"
              title="Generate new Idempotency-Key"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Regen Key</span>
            </button>
            <button
              onClick={handleExecute}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Send Request</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300">{selectedEndpoint.description}</p>
      </div>

      {/* 2-Column Split: Request Config vs Live Response */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Request Parameters & Body */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Request Headers & Parameters</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Environment: {environment}</span>
            </div>

            {/* Header parameters */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Authorization</span>
                <span className="text-emerald-400 truncate max-w-[200px]">Bearer {activeCred.secretKeyMasked}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Idempotency-Key</span>
                <span className="text-indigo-300 truncate max-w-[200px]">{idempotencyKey}</span>
              </div>
            </div>

            {/* Request Body JSON */}
            {selectedEndpoint.method !== 'GET' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Request Body (JSON)</label>
                <textarea
                  rows={8}
                  value={requestBodyText}
                  onChange={e => setRequestBodyText(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 custom-scrollbar"
                />
              </div>
            )}
          </div>

          {/* Generated Code Snippet */}
          <div className="p-5 rounded-3xl bg-[#0b1324] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">Client Code Snippet</span>
              </div>
              <div className="flex items-center gap-1">
                {(['curl', 'typescript', 'python', 'go', 'php'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-colors ${
                      selectedLanguage === lang ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 font-mono text-xs text-slate-300 overflow-x-auto max-h-48 custom-scrollbar">
                {generateCodeSnippet()}
              </pre>
              <button
                onClick={() => handleCopy(generateCodeSnippet(), 'code')}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white text-xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Response Output */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4 min-h-[420px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Response Inspector</span>
                </h3>

                {responseResult && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        responseResult.status >= 200 && responseResult.status < 300
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      HTTP {responseResult.status}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {responseResult.latency}ms
                    </span>
                  </div>
                )}
              </div>

              {responseResult ? (
                <div className="space-y-3 pt-3">
                  <div className="relative">
                    <pre className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto max-h-80 custom-scrollbar">
                      {JSON.stringify(responseResult.body, null, 2)}
                    </pre>
                    <button
                      onClick={() => handleCopy(JSON.stringify(responseResult.body, null, 2), 'response')}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white text-xs"
                    >
                      {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Response Headers */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-white/5 space-y-1 text-[11px] font-mono text-slate-400">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Response Headers</div>
                    {Object.entries(responseResult.headers).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500">{k}:</span>
                        <span className="text-slate-300 truncate max-w-[250px]">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-500">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <div className="text-xs text-slate-400 font-mono">No request sent yet.</div>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Click <strong>Send Request</strong> above to execute this endpoint against the sandbox ledger node.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Isolated Sandbox Switch — No real currency transferred.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveApiExplorer;
