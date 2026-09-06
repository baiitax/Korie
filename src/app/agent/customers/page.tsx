"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { agencyApiFetch } from "@/lib/agency/agentSession";
import {
  ArrowLeft,
  Users,
  Search,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";

export default function AgentCustomersPage() {
  const { customers, isCustomersLoading, refreshCustomers, t } = useAgent();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError("Full name and phone are required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await agencyApiFetch("/api/v1/agency/customers", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          bank_name: bankName.trim() || undefined,
          account_number_masked: accountNumber.trim()
            ? `****${accountNumber.trim().slice(-4)}`
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        setError(json?.error?.message || "Could not onboard this customer.");
        return;
      }
      await refreshCustomers();
      setIsOnboardOpen(false);
      setFullName("");
      setPhone("");
      setBankName("");
      setAccountNumber("");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.accountNumberMasked.includes(searchTerm) ||
      c.bankName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {t("common.customers")}
            </h1>
            <p className="text-xs text-slate-400">
              Agency retail customers and verified bank accounts.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOnboardOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Onboard New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search customer by name, phone or account number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#090f1e] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      {/* Customer Cards List */}
      {isCustomersLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-3 animate-pulse">
              <div className="h-10 w-10 rounded-2xl bg-white/10" />
              <div className="h-3 w-32 rounded bg-white/10" />
              <div className="h-16 rounded-2xl bg-white/5" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#090f1e] border border-white/10 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm text-slate-300 font-semibold">
            {customers.length === 0 ? "No customers yet" : "No customers match your search"}
          </p>
          <p className="text-xs text-slate-500">
            {customers.length === 0
              ? "Your customer directory fills in automatically after your first cash-in or cash-out, or you can onboard someone manually above."
              : "Try a different name, phone number or bank."}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((cust) => (
          <div
            key={cust.id}
            className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 hover:border-amber-500/30 transition-all space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-sm font-mono">
                  {cust.fullName[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{cust.fullName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300">
                      {cust.kycTier}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{cust.phone}</div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-xs font-mono">
              <div className="text-slate-400 text-[10px]">Primary Bank Account</div>
              <div className="text-white font-bold mt-0.5">
                {cust.bankName} • {cust.accountNumberMasked}
              </div>
              <div className="text-slate-400 text-[10px] pt-1">
                Total Operations: {cust.totalTransactionsCount}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href={`/agent/cash-in?account=${cust.accountNumberMasked}&name=${encodeURIComponent(cust.fullName)}`}
                className="flex-1 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs text-center transition-colors"
              >
                Cash In
              </Link>
              <Link
                href={`/agent/cash-out?account=${cust.accountNumberMasked}&name=${encodeURIComponent(cust.fullName)}`}
                className="flex-1 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs text-center transition-colors"
              >
                Cash Out
              </Link>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Onboard New Customer Modal */}
      {isOnboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#0d1424] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">Onboard New Customer</h3>
              <button
                onClick={() => setIsOnboardOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOnboard} className="space-y-3">
              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#090f1e] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +2348012345678"
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#090f1e] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bank Name (optional)</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#090f1e] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Account Number (optional)
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#090f1e] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-bold transition-colors"
              >
                {isSubmitting ? "Saving..." : "Save Customer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
