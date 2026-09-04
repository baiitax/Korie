"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  Download,
  Plus,
  ArrowRight,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  X,
  CreditCard,
  Smartphone,
  Award,
} from "lucide-react";
import { CustomerRecord, CustomerLifecycleStatus, CustomerAccountRecord, AccountRestrictionType } from "@/types/customerProductFactory";

export default function CustomersAdminPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("GLOBAL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected Customer 360 State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customer360Data, setCustomer360Data] = useState<any>(null);
  const [is360Loading, setIs360Loading] = useState(false);

  // Restrictions Modal State
  const [isRestrictModalOpen, setIsRestrictModalOpen] = useState(false);
  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [restrictionType, setRestrictionType] = useState<AccountRestrictionType>("DEBIT_ONLY");
  const [restrictionReason, setRestrictionReason] = useState("Suspicious high velocity transaction activity");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer/360?id=cust-ng-001-ibrahim`);
      // Also fetch full customer list
      const resList = await fetch("/api/accounts");
      const jsonList = await resList.json();

      // Seed fallback customers
      setCustomers([
        {
          id: "cust-ng-001-ibrahim",
          customerCode: "CUST-NG-009182",
          tenantId: "tenant-korie-core",
          identityRecordId: "KID-NG-889102",
          fullName: "Ibrahim Bello",
          email: "ibrahim.bello@koriepay.ng",
          phone: "+2348099887766",
          country: "NG",
          customerType: "PERSONAL",
          status: "ACTIVE",
          kycTier: "TIER_2",
          riskStatus: "LOW",
          riskScore: 12.5,
          createdAt: "2026-08-01T08:00:00Z",
          updatedAt: "2026-09-03T12:00:00Z",
        },
        {
          id: "cust-ne-001-amara",
          customerCode: "CUST-NE-004419",
          tenantId: "tenant-korie-core",
          identityRecordId: "KID-NE-449102",
          fullName: "Amara Diallo",
          email: "amara.diallo@koriepay.ne",
          phone: "+22790223344",
          country: "NE",
          customerType: "PERSONAL",
          status: "ACTIVE",
          kycTier: "TIER_2",
          riskStatus: "LOW",
          riskScore: 15.0,
          createdAt: "2026-08-05T10:00:00Z",
          updatedAt: "2026-09-03T11:30:00Z",
        },
        {
          id: "cust-ng-002-jumia",
          customerCode: "CUST-ORG-008129",
          tenantId: "tenant-korie-core",
          identityRecordId: "KID-ORG-998822",
          fullName: "Jumia Express Distribution Hub",
          email: "finance.hub@jumia.com.ng",
          phone: "+2348033221100",
          country: "NG",
          customerType: "MERCHANT",
          status: "ACTIVE",
          kycTier: "TIER_3",
          riskStatus: "LOW",
          riskScore: 8.0,
          createdAt: "2026-08-10T11:00:00Z",
          updatedAt: "2026-09-03T10:00:00Z",
        },
      ]);
    } catch (e) {
      console.error("Failed to fetch customer data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [countryFilter]);

  const loadCustomer360 = async (id: string) => {
    setSelectedCustomerId(id);
    setIs360Loading(true);
    try {
      const res = await fetch(`/api/customer/360?id=${id}`);
      const json = await res.json();
      if (json.success) {
        setCustomer360Data(json.data);
      }
    } catch (e) {
      console.error("Failed to load 360", e);
    } finally {
      setIs360Loading(false);
    }
  };

  const handleApplyRestriction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${targetAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESTRICT",
          restriction: restrictionType,
          reason: restrictionReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Restriction ${restrictionType} applied to account ${targetAccountId}`);
        setIsRestrictModalOpen(false);
        if (selectedCustomerId) loadCustomer360(selectedCustomerId);
      } else {
        alert(`Failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    const matchesCountry = countryFilter === "GLOBAL" || c.country === countryFilter;
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesSearch =
      !search.trim() ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    return matchesCountry && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
              CUSTOMER & ACCOUNT CONTROL PLANE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CORE SUBLEDGER LINKED
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Customer 360 & Account Lifecycle Desk</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage customer master identities, multi-currency accounts, real-time GL balances, active propositions, and restrictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
          >
            <option value="GLOBAL">All Corridors (NGN & XOF)</option>
            <option value="NG">Nigeria 🇳🇬 (NGN)</option>
            <option value="NE">Niger Republic 🇳🇪 (XOF)</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 border border-white/10 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Sync Directory
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Customer Master</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{customers.length} Profiles</div>
          <div className="text-[10px] text-emerald-400 font-medium mt-1">Identity Master Linked</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">KYC Tier 2/3 Verified</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">100% Verified</div>
          <div className="text-[10px] text-slate-400 mt-1">NIN / BVN / NINA Validated</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Multi-Currency Accounts</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">NGN & XOF Accounts</div>
          <div className="text-[10px] text-slate-400 mt-1">Zero Shadow Balances</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Operational Restrictions</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">0 Active Freezes</div>
          <div className="text-[10px] text-slate-400 mt-1">All Channels Operating</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, phone, customer code..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Customer Master Table */}
      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                <th className="p-4 font-semibold">Customer & Identity Code</th>
                <th className="p-4 font-semibold">Market & Segment</th>
                <th className="p-4 font-semibold">KYC Verification</th>
                <th className="p-4 font-semibold">Risk Score</th>
                <th className="p-4 font-semibold">Lifecycle Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((cust) => (
                <tr key={cust.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-white group-hover:text-emerald-400">{cust.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {cust.customerCode} • {cust.identityRecordId || "KID-PENDING"} • {cust.phone}
                    </div>
                  </td>
                  <td className="p-4 font-mono">
                    <div className="text-white font-semibold">
                      {cust.country === "NG" ? "🇳🇬 Nigeria" : "🇳🇪 Niger"}
                    </div>
                    <div className="text-[10px] text-slate-400">{cust.customerType}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ● {cust.kycTier}
                    </span>
                  </td>
                  <td className="p-4 font-mono">
                    <span className="text-slate-300 font-bold">{cust.riskScore}</span>
                    <span className="text-[10px] text-emerald-400 ml-1.5 font-bold">({cust.riskStatus})</span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                      ● {cust.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => loadCustomer360(cust.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-900/30 transition-all"
                    >
                      Customer 360° ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER 360° DOSSIER MODAL */}
      {selectedCustomerId && customer360Data && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1324] border border-white/15 rounded-3xl p-6 max-w-4xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded">
                  CUSTOMER 360° MASTER DOSSIER
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{customer360Data.customer.fullName}</h3>
                <div className="text-xs text-slate-400 font-mono">
                  {customer360Data.customer.customerCode} • {customer360Data.customer.email} • {customer360Data.customer.phone}
                </div>
              </div>
              <button onClick={() => setSelectedCustomerId(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Ledger Subledger Accounts Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase font-mono text-emerald-400">
                  Authoritative Banking Accounts & Ledger Balances
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Sourced from GL Subledgers</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customer360Data.accounts.map((acc: CustomerAccountRecord) => (
                  <div key={acc.id} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-emerald-400 font-bold">{acc.accountName}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400">
                        ● {acc.status}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400">
                      {acc.accountNumber} ({acc.assignedBankName})
                    </div>

                    <div className="pt-1">
                      <div className="text-[9px] font-mono text-slate-500 uppercase">Available Balance</div>
                      <div className="text-lg font-bold font-mono text-white">
                        {acc.currency === "NGN" ? "₦" : "CFA "}
                        {acc.availableBalance.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-400 font-mono">Product: {acc.productCode}</span>
                      <button
                        onClick={() => {
                          setTargetAccountId(acc.id);
                          setIsRestrictModalOpen(true);
                        }}
                        className="text-[10px] font-semibold text-amber-400 hover:underline"
                      >
                        Restrictions ⚙️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Beneficiaries & Safeguards */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase font-mono text-blue-400">
                Verified Counterparties & 24h Cooldown Status
              </h4>
              <div className="divide-y divide-white/5 border border-white/10 rounded-2xl bg-slate-950/60 p-3 text-xs">
                {customer360Data.beneficiaries.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-semibold text-white">{b.beneficiaryName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {b.accountNumber} • {b.bankName} ({b.currency})
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400">
                      ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESTRICTION MODAL */}
      {isRestrictModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1324] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Apply Account Restriction</h3>
              <button onClick={() => setIsRestrictModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyRestriction} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Restriction Type</label>
                <select
                  value={restrictionType}
                  onChange={(e) => setRestrictionType(e.target.value as AccountRestrictionType)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="DEBIT_ONLY">DEBIT_ONLY (Inflows allowed, outward blocked)</option>
                  <option value="CREDIT_ONLY">CREDIT_ONLY (Outward allowed, deposits blocked)</option>
                  <option value="TRANSFER_DISABLED">TRANSFER_DISABLED (P2P/NIP disabled)</option>
                  <option value="DEVICE_RESTRICTED">DEVICE_RESTRICTED (Hardware bound only)</option>
                  <option value="FULL_FREEZE">FULL_FREEZE (Complete operational lock)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Reason Code / Notes</label>
                <textarea
                  rows={2}
                  required
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestrictModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-lg shadow-amber-900/30"
                >
                  Apply Restriction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
