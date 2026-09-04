"use client";

import React, { useState } from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Settings,
  ShieldCheck,
  Building,
  Lock,
  Mail,
  CheckCircle2,
  AlertTriangle,
  History,
} from 'lucide-react';

export default function DeveloperSettingsPage() {
  const { organization, auditLogs, environment } = useDeveloper();
  const [mfaEnforced, setMfaEnforced] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ORGANIZATION PREFERENCES & POLICIES
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">Developer Settings & Security Policies</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Enterprise compliance settings, MFA mandates, notification triggers, and immutable audit logs.
          </p>
        </div>
      </div>

      {/* Organization Profile */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <h3 className="font-bold text-white text-base">Organization Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[10px]">LEGAL ENTITY</span>
            <span className="text-white font-bold">{organization.name}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[10px]">TIER & STATUS</span>
            <span className="text-emerald-400 font-bold">{organization.tier} • {organization.verificationStatus}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[10px]">JURISDICTION</span>
            <span className="text-white font-bold">{organization.jurisdiction}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[10px]">DEFAULT CURRENCY</span>
            <span className="text-teal-300 font-bold">{organization.defaultCurrency}</span>
          </div>
        </div>
      </div>

      {/* Security Policies */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <h3 className="font-bold text-white text-base">Security Policies & Governance</h3>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-white">Mandatory Two-Factor Authentication (MFA)</span>
              <p className="text-slate-400">Enforce TOTP / WebAuthn for all developers before generating keys or modifying webhooks.</p>
            </div>
            <button
              onClick={() => setMfaEnforced(!mfaEnforced)}
              className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs ${
                mfaEnforced ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {mfaEnforced ? 'ENFORCED' : 'OPTIONAL'}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-white">Webhook Delivery Failure Email Alerts</span>
              <p className="text-slate-400">Dispatch immediate email notifications if 3 consecutive webhook retries fail.</p>
            </div>
            <button
              onClick={() => setEmailAlerts(!emailAlerts)}
              className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs ${
                emailAlerts ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {emailAlerts ? 'ENABLED' : 'MUTED'}
            </button>
          </div>
        </div>
      </div>

      {/* Immutable Developer Audit Log */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Immutable Developer Audit Trail</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{auditLogs.length} Events Logged</span>
        </div>

        <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-400 border-b border-white/5">
              <tr>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Resource</th>
                <th className="p-3.5">Details</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/5">
                  <td className="p-3.5 font-bold text-white">{log.actorEmail} ({log.actorRole})</td>
                  <td className="p-3.5 text-emerald-400 font-bold">{log.action}</td>
                  <td className="p-3.5 text-slate-400">{log.resourceType}: {log.resourceId}</td>
                  <td className="p-3.5 text-slate-300 font-sans text-xs">{log.details}</td>
                  <td className="p-3.5 text-slate-500 text-[11px]">{log.timestamp.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
