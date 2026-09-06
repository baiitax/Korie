"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import { merchantApiFetch } from "@/lib/merchant/merchantSession";
import {
  UserPlus,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const ROLE_STYLES: Record<string, string> = {
  MERCHANT_OWNER: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  ADMIN: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  FINANCE_MANAGER: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  BRANCH_MANAGER: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  CASHIER: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  DEVELOPER: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  AUDITOR: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
};

export default function MerchantTeamPage() {
  const { staff, branches, formatDate, refreshAll, t } = useMerchant();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("CASHIER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await merchantApiFetch("/api/v1/merchant/staff", {
        method: "POST",
        body: JSON.stringify({ fullName: newStaffName, email: newStaffEmail, role: newStaffRole }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setInviteSent(true);
        await refreshAll();
        setTimeout(() => {
          setInviteSent(false);
          setIsInviteOpen(false);
          setNewStaffName("");
          setNewStaffEmail("");
        }, 2200);
      } else {
        setErrorMessage(json?.error?.message || "Could not send invitation.");
      }
    } catch {
      setErrorMessage("Network error sending invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Staff & Branch Permissions</h1>
          <p className="text-xs text-slate-400">
            Real team roster for Owners, Finance Managers, Store Cashiers, Developers, and Auditors.
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

      {/* Staff Table */}
      <div className="rounded-3xl bg-[#091020] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d1a] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Store Assignment</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="text-white font-bold">{member.fullName}</div>
                    <div className="text-[10px] text-slate-400">{member.email}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${ROLE_STYLES[member.role] || "bg-slate-500/10 text-slate-400 border border-slate-500/20"}`}>
                      {member.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {member.branchName || "All Corporate Branches"}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      member.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{member.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-400 text-[11px]">
                    {member.lastLoginAt ? formatDate(member.lastLoginAt) : "Never"}
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
          <div className="bg-[#0c1324] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Invite Staff Member</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteSent ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white">Team Member Added!</h4>
                <p className="text-xs text-slate-400">
                  {newStaffEmail} can now sign in with this email to activate their account.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fatima Bello"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="fatima@yourbusiness.ng"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Assigned Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="CASHIER">CASHIER (Process Sales & QR)</option>
                    <option value="BRANCH_MANAGER">BRANCH_MANAGER (View Store Reports)</option>
                    <option value="FINANCE_MANAGER">FINANCE_MANAGER (Payouts & Ledger)</option>
                    <option value="DEVELOPER">DEVELOPER (API Keys & Webhooks)</option>
                    <option value="AUDITOR">AUDITOR (Read-only Compliance)</option>
                  </select>
                </div>

                {errorMessage && (
                  <div className="text-[11px] text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> {errorMessage}
                  </div>
                )}

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
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Send Invitation</span>
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
