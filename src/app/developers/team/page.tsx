"use client";

import React, { useState } from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import { DeveloperRole } from '@/types/developer';
import {
  Users,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Lock,
  Mail,
  UserPlus,
  X,
} from 'lucide-react';

export default function TeamPage() {
  const {
    members,
    inviteTeamMember,
    removeTeamMember,
    organization,
  } = useDeveloper();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<DeveloperRole>('DEVELOPER');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    inviteTeamMember(inviteName, inviteEmail, inviteRole);
    setInviteName('');
    setInviteEmail('');
    setIsInviteOpen(false);
  };

  const roleDescriptions: Record<DeveloperRole, string> = {
    OWNER: 'Full organization ownership, settlement bank management, and legal authority.',
    ADMIN: 'Manage applications, issue production credentials, and configure IP whitelists.',
    DEVELOPER: 'Access sandbox API keys, build integrations, configure webhooks, and inspect logs.',
    ANALYST: 'Read-only access to transaction logs, rate limits, and error diagnostics.',
    SUPPORT_CONTACT: 'Open technical support tickets and communicate with KoriePay engineering.',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ORGANIZATION & RBAC
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">Team & Access Control</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage granular roles, multi-factor authentication, and developer permissions for {organization.name}.
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Team Table */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <h3 className="font-bold text-white text-base">Organization Members ({members.length})</h3>

        <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-400 border-b border-white/5">
              <tr>
                <th className="p-3.5">Member Name</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">MFA Status</th>
                <th className="p-3.5">Last Login</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-white/5">
                  <td className="p-3.5 font-bold text-white">{m.name}</td>
                  <td className="p-3.5 text-slate-300">{m.email}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {m.role}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {m.mfaEnabled ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Enabled</span>
                      </span>
                    ) : (
                      <span className="text-amber-400">Disabled</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-500 text-[11px]">{m.lastLogin.split('T')[0]}</td>
                  <td className="p-3.5 text-right">
                    {m.role !== 'OWNER' && (
                      <button
                        onClick={() => removeTeamMember(m.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Clearance Matrix */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <h3 className="font-bold text-white text-base">Granular Clearance Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          {(Object.keys(roleDescriptions) as DeveloperRole[]).map(r => (
            <div key={r} className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
              <div className="font-bold text-emerald-400 uppercase">{r}</div>
              <p className="text-slate-400 font-sans text-xs">{roleDescriptions[r]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0b1222] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Invite Team Member</h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="e.g. Fatima Garba"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="fatima@saheltech.io"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Role *</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as DeveloperRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="DEVELOPER">Developer (Sandbox, Keys & Webhooks)</option>
                  <option value="ADMIN">Admin (Production Keys & Approvals)</option>
                  <option value="ANALYST">Analyst (Logs & Metrics Read-Only)</option>
                  <option value="SUPPORT_CONTACT">Support Contact</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
