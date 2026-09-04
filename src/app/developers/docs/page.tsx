"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  BookOpen,
  Key,
  ShieldCheck,
  Zap,
  Radio,
  AlertTriangle,
  Copy,
  Check,
  Terminal,
  FileCode,
  Globe2,
  Lock,
} from 'lucide-react';

export default function DocumentationPage() {
  const { environment } = useDeveloper();
  const [activeSection, setActiveSection] = useState('auth');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sections = [
    { id: 'auth', title: '1. Authentication & API Keys', icon: Key },
    { id: 'corridor', title: '2. Bilateral Cross-Border Rails', icon: Globe2 },
    { id: 'idempotency', title: '3. Idempotency & Financial Safety', icon: ShieldCheck },
    { id: 'webhooks', title: '4. Webhook HMAC Signatures', icon: Radio },
    { id: 'errors', title: '5. Error Handling & Formats', icon: AlertTriangle },
    { id: 'security', title: '6. Production Security & IP Whitelisting', icon: Lock },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ENGINEERING GUIDES & ARCHITECTURE
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">KoriePay API Documentation</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative integration guides, cryptographic signature rules, and financial idempotency mechanics.
          </p>
        </div>

        <Link
          href="/developers/explorer"
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
        >
          <Terminal className="w-4 h-4" />
          <span>Try in Explorer</span>
        </Link>
      </div>

      {/* 2-Column Docs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="space-y-1 lg:sticky lg:top-24 h-fit">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-400 px-3 py-1">Table of Contents</div>
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left p-3 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                  activeSection === s.id
                    ? 'bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeSection === s.id ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="truncate">{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content View */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === 'auth' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Authentication & API Keys</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  The KoriePay API uses standard HTTP Bearer Token authentication. All requests to protected endpoints must transmit your secret key in the <code className="text-emerald-400 font-mono">Authorization</code> header.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white">Key Prefixes & Environments</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30">
                    <span className="text-slate-400 block text-[10px]">SANDBOX SECRET KEY:</span>
                    <span className="text-emerald-400 font-bold">kp_test_••••••••••••••••</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30">
                    <span className="text-slate-400 block text-[10px]">PRODUCTION SECRET KEY:</span>
                    <span className="text-amber-400 font-bold">kp_live_••••••••••••••••</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">HTTP Header Example</span>
                  <button
                    onClick={() => handleCopy('Authorization: Bearer kp_test_884920a1b2c3d4e5f6g7h8i9j0k1l2m3\nContent-Type: application/json', 'c_auth')}
                    className="text-xs text-emerald-400 font-mono flex items-center gap-1"
                  >
                    {copiedKey === 'c_auth' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'c_auth' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto">
{`Authorization: Bearer kp_test_884920a1b2c3d4e5f6g7h8i9j0k1l2m3
Content-Type: application/json
Accept: application/json`}
                </pre>
              </div>
            </div>
          )}

          {activeSection === 'corridor' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Bilateral Cross-Border Rails (NGN & XOF)</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  KoriePay connects commercial banking rails in Nigeria (Providus Bank NIP) and Niger Republic (Koris Bank WAEMU GIM-UEMOA) into a single atomic liquidity bridge.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-2 text-xs">
                <div className="font-bold text-white">Rate Locks & Liquidity Routing</div>
                <p className="text-slate-400">
                  When you execute <code className="text-emerald-400 font-mono">POST /v1/transfers/cross-border</code>, the exchange rate is guaranteed for 60 seconds. The source ledger is debited in real-time, and the destination node dispatches payout immediately.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'idempotency' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Idempotency & Double Debit Protection</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  All mutating financial operations (payments, transfers, cash-outs) require an <code className="text-emerald-400 font-mono">Idempotency-Key</code> header containing a unique UUID v4.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>How KoriePay Handles Retries</span>
                </div>
                <p className="text-slate-300">
                  If network disconnects during a transfer, retry the identical request with the same <code className="font-mono text-amber-300">Idempotency-Key</code>. KoriePay returns the cached committed result without double debiting the wallet.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'webhooks' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Webhook HMAC-SHA256 Signature Verification</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  Every webhook request includes an <code className="text-teal-400 font-mono">X-KoriePay-Signature</code> header. Verify this signature to ensure payloads originate from KoriePay.
                </p>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto">
{`import crypto from 'crypto';

function verifyWebhook(rawPayload, signatureHeader, secretKey) {
  const [tPart, sigPart] = signatureHeader.split(',');
  const timestamp = tPart.split('=')[1];
  const signature = sigPart.split('=')[1];

  const signedPayload = \`\${timestamp}.\${rawPayload}\`;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}`}
              </pre>
            </div>
          )}

          {activeSection === 'errors' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Standard Error Format</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  All 4xx and 5xx responses follow a predictable RFC-7807 compliant JSON format.
                </p>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-rose-300 overflow-x-auto">
{`{
  "status": "error",
  "code": "INSUFFICIENT_FUNDS",
  "message": "Available balance (₦1,240.00) is insufficient for transaction amount.",
  "request_id": "KP-REQ-99281a04",
  "timestamp": "2026-09-03T16:15:00Z"
}`}
              </pre>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Production Security & IP Whitelisting</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  Production API keys are restricted to whitelisted merchant egress IP addresses. Requests from unlisted IPs receive an immediate <code className="text-rose-400 font-mono">HTTP 403 FORBIDDEN</code>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-2 text-xs">
                <div className="font-bold text-white">Zero Credential Exposure Rule</div>
                <p className="text-slate-400">
                  Never commit secret keys into client-side code, single-page web apps, or mobile bundles. Use server-side reverse proxies or backend microservices.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
