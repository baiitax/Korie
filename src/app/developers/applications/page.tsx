"use client";

import React, { useState } from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Layers,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Server,
  Key,
  Radio,
  Lock,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

export default function ApplicationsPage() {
  const {
    applications,
    activeApplication,
    setActiveApplicationId,
    createApplication,
    updateIpWhitelist,
    environment,
  } = useDeveloper();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [editingIpAppId, setEditingIpAppId] = useState<string | null>(null);
  const [ipInput, setIpInput] = useState('');

  const handleCreateApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    createApplication(
      newAppName,
      newAppDesc || 'Commercial fintech client application',
      ['payments', 'wallets', 'merchant', 'customers'],
      ['197.210.84.12']
    );
    setNewAppName('');
    setNewAppDesc('');
    setIsCreateOpen(false);
  };

  const handleSaveIps = (appId: string) => {
    const ips = ipInput
      .split(',')
      .map(i => i.trim())
      .filter(Boolean);
    updateIpWhitelist(appId, ips);
    setEditingIpAppId(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            APPLICATION REGISTRY
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">Manage Developer Applications</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure isolated client apps, scoped rate limits, and server IP address whitelists.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* Applications List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {applications.map(app => {
          const isSelected = app.id === activeApplication.id;
          return (
            <div
              key={app.id}
              className={`p-6 rounded-3xl border transition-all space-y-4 ${
                isSelected
                  ? 'bg-[#0b1428] border-emerald-500/50 shadow-xl shadow-emerald-500/5'
                  : 'bg-[#0a1122] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        app.environment === 'PRODUCTION'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {app.environment}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{app.id}</span>
                  </div>
                  <h3 className="font-bold text-white text-base">{app.name}</h3>
                </div>

                {!isSelected && (
                  <button
                    onClick={() => setActiveApplicationId(app.id)}
                    className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold transition-colors"
                  >
                    Select App
                  </button>
                )}
                {isSelected && (
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                    ● ACTIVE
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{app.description}</p>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/5">
                  <span className="text-slate-500 block text-[10px]">RATE LIMIT</span>
                  <span className="text-white font-bold">{app.rateLimitPerMinute} req/min</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/5">
                  <span className="text-slate-500 block text-[10px]">MONTHLY QUOTA</span>
                  <span className="text-emerald-400 font-bold">{(app.monthlyRequestQuota / 1000000).toFixed(1)}M reqs</span>
                </div>
              </div>

              {/* IP Whitelist Section */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>IP Address Whitelist</span>
                  </span>
                  {editingIpAppId !== app.id && (
                    <button
                      onClick={() => {
                        setEditingIpAppId(app.id);
                        setIpInput(app.ipWhitelist.join(', '));
                      }}
                      className="text-[11px] text-emerald-400 hover:underline font-mono"
                    >
                      Edit IPs
                    </button>
                  )}
                </div>

                {editingIpAppId === app.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={ipInput}
                      onChange={e => setIpInput(e.target.value)}
                      placeholder="197.210.84.12, 160.154.20.10"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-mono text-emerald-300 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingIpAppId(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveIps(app.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-[11px] font-bold"
                      >
                        Save IPs
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {app.ipWhitelist.map((ip, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-white/5">
                        {ip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Application Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0b1222] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Register New Application</h3>
                  <p className="text-xs text-slate-400">Environment: {environment}</p>
                </div>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Application Name *</label>
                <input
                  type="text"
                  required
                  value={newAppName}
                  onChange={e => setNewAppName(e.target.value)}
                  placeholder="e.g. Niamey Cross-Border Merchant API"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description / Purpose</label>
                <textarea
                  rows={2}
                  value={newAppDesc}
                  onChange={e => setNewAppDesc(e.target.value)}
                  placeholder="Briefly describe what services will connect to this application..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
                >
                  Create Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
