"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  UserCheck,
  UserPlus,
  ShieldCheck,
  Mail,
  Phone,
  CheckCircle2,
  X,
} from "lucide-react";

export default function AggregatorTeamPage() {
  const { team, t } = useAggregator();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("OPERATIONS_MANAGER");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
    }, 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Team & Role Permissions</h1>
          <p className="text-xs text-slate-400">
            Granular access controls for Aggregator Owners, Operations Leads, Finance Managers, Risk Officers, and Field Leads
          </p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Team Table */}
      <div className="rounded-3xl bg-[#091122] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a16] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Team Member</th>
                <th className="px-4 py-3">Role & Clearance</th>
                <th className="px-4 py-3">Territory Scope</th>
                <th className="px-4 py-3">Direct Permissions</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {team.map((member) => (
                <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="text-white font-bold">{member.fullName}</div>
                    <div className="text-[10px] text-slate-400">{member.email}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        member.role === "AGGREGATOR_OWNER"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : member.role === "FINANCE_MANAGER"
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {member.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {member.territoryScope.join(", ")}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {member.permissions.slice(0, 3).map((p, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-mono text-slate-400">
                          {p}
                        </span>
                      ))}
                      {member.permissions.length > 3 && (
                        <span className="px-1 py-0.5 rounded bg-white/5 text-[9px] text-slate-500">
                          +{member.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{member.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-400 text-[11px]">
                    {member.lastLoginAt.split("T")[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1222] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Invite Aggregator Staff</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white">Invitation Dispatched!</h4>
                <p className="text-xs text-slate-400">Security setup link sent to {inviteEmail}</p>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ibrahim Lawal"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="ibrahim.ops@sahel-syndicate.ng"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Assigned Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="OPERATIONS_MANAGER">OPERATIONS_MANAGER (Manage Agents & Merchants)</option>
                    <option value="FINANCE_MANAGER">FINANCE_MANAGER (Float Dispatches & Payouts)</option>
                    <option value="COMPLIANCE_OFFICER">COMPLIANCE_OFFICER (KYC & Documents)</option>
                    <option value="FIELD_OFFICER">FIELD_OFFICER (Territory Inspections)</option>
                    <option value="AUDITOR">AUDITOR (Read-only Compliance)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
