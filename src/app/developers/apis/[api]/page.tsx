"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Database,
  ArrowLeft,
  Terminal,
  ShieldCheck,
  Zap,
  Key,
  Radio,
  Clock,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  GitPullRequest,
  CheckCircle2,
} from 'lucide-react';

export default function ApiProductDetailPage() {
  const params = useParams();
  const apiId = params.api as string;
  const { apiProductsList, environment } = useDeveloper();

  const product = apiProductsList.find(p => p.id === apiId);

  const [activeEndpointId, setActiveEndpointId] = useState<string>(product?.endpoints[0]?.id || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!product) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">API Product Not Found</h2>
        <Link href="/developers/apis" className="text-emerald-400 font-bold underline">
          ← Return to API Catalog
        </Link>
      </div>
    );
  }

  const activeEndpoint = product.endpoints.find(e => e.id === activeEndpointId) || product.endpoints[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <Link
        href="/developers/apis"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to API Marketplace</span>
      </Link>

      {/* Product Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0a1329] via-[#0b162f] to-[#070d1c] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {product.category}
              </span>
              <span className="text-[10px] font-mono text-slate-400">Version {product.version}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">{product.name}</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              {product.description}
            </p>
          </div>

          <Link
            href="/developers/explorer"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
          >
            <Terminal className="w-4 h-4" />
            <span>Interactive Explorer</span>
          </Link>
        </div>

        {/* Base URLs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs font-mono">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/5 flex items-center justify-between">
            <span className="text-slate-500">SANDBOX BASE URL:</span>
            <span className="text-emerald-400 font-bold truncate">{product.baseUrl.sandbox}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/5 flex items-center justify-between">
            <span className="text-slate-500">PRODUCTION BASE URL:</span>
            <span className="text-amber-400 font-bold truncate">{product.baseUrl.production}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Left Endpoints List, Right Endpoint Deep Spec */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Endpoints List */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-slate-400 px-1">Endpoints in this Product</div>
          {product.endpoints.map(ep => (
            <button
              key={ep.id}
              onClick={() => setActiveEndpointId(ep.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all space-y-1.5 ${
                ep.id === activeEndpoint.id
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                  : 'bg-[#0a1122] border-white/5 text-slate-400 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    ep.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {ep.method}
                </span>
                <span className="font-mono text-xs text-white font-bold truncate">{ep.path}</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{ep.title}</p>
            </button>
          ))}

          {/* Webhook Events for this Product */}
          <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/5 space-y-2 mt-4">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-teal-400" />
              <span>Associated Webhook Events</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.webhookEvents.map((ev, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300 border border-white/5">
                  {ev}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Selected Endpoint Deep Specification */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase ${
                    activeEndpoint.method === 'POST'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {activeEndpoint.method}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-white">{activeEndpoint.path}</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Scope: {activeEndpoint.requiredScope}</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{activeEndpoint.description}</p>

            {/* Request Headers */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400">Required Headers</h4>
              <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-400">
                    <tr>
                      <th className="p-3">Header</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Required</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeEndpoint.requestHeaders.map(h => (
                      <tr key={h.name} className="hover:bg-white/5">
                        <td className="p-3 font-bold text-emerald-400">{h.name}</td>
                        <td className="p-3 text-slate-400">{h.type}</td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/10 text-rose-300">YES</span>
                        </td>
                        <td className="p-3 text-slate-300">{h.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sample Request Body */}
            {activeEndpoint.sampleRequestBody && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase text-slate-400">Sample Request Payload (JSON)</h4>
                  <button
                    onClick={() => handleCopy(JSON.stringify(activeEndpoint.sampleRequestBody, null, 2), 'req_body')}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    {copiedKey === 'req_body' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'req_body' ? 'Copied' : 'Copy Payload'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto max-h-60 custom-scrollbar">
                  {JSON.stringify(activeEndpoint.sampleRequestBody, null, 2)}
                </pre>
              </div>
            )}

            {/* Success Response 200 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                    HTTP {activeEndpoint.responses[0]?.statusCode || 200} OK
                  </span>
                  <span className="text-xs text-slate-300">{activeEndpoint.responses[0]?.description}</span>
                </div>
                <button
                  onClick={() => handleCopy(JSON.stringify(activeEndpoint.responses[0]?.body || {}, null, 2), 'res_body')}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                >
                  {copiedKey === 'res_body' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'res_body' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto max-h-60 custom-scrollbar">
                {JSON.stringify(activeEndpoint.responses[0]?.body || {}, null, 2)}
              </pre>
            </div>

            {/* Error Codes & Remediation Guide */}
            {activeEndpoint.errorCodes.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h4 className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Specific Error Codes & Recommended Fixes</span>
                </h4>
                <div className="space-y-2">
                  {activeEndpoint.errorCodes.map(err => (
                    <div key={err.code} className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-rose-400">{err.code}</span>
                        <span className="text-slate-500">HTTP {err.httpStatus}</span>
                      </div>
                      <p className="text-slate-300">{err.message}</p>
                      <div className="text-[11px] text-emerald-400 font-medium">
                        <strong>Action:</strong> {err.recommendedAction}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
