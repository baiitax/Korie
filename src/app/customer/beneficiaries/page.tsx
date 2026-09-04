"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomer } from "@/components/customer/CustomerContext";
import { BANK_DIRECTORY } from "@/services/customerDataService";
import { CustomerCurrency, CustomerCountry } from "@/types/customer";
import {
  ArrowLeft,
  Users,
  Plus,
  ArrowUpRight,
  Trash2,
  Search,
  Building2,
  CheckCircle2,
  X,
} from "lucide-react";

export default function CustomerBeneficiariesPage() {
  const router = useRouter();
  const { beneficiaries, saveBeneficiary, deleteBeneficiary, t } = useCustomer();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New beneficiary form
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("058");
  const [country, setCountry] = useState<CustomerCountry>("NG");

  const filteredBeneficiaries = beneficiaries.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.accountNumber.includes(searchTerm) ||
      b.bankName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !accountNumber) return;

    const selectedBank = BANK_DIRECTORY.find((b) => b.code === bankCode);

    saveBeneficiary({
      name,
      accountNumber,
      bankName: selectedBank?.name || "Commercial Bank",
      bankCode,
      currency: country === "NG" ? "NGN" : "XOF",
      country,
      avatarColor: "bg-emerald-500",
      isFavorite: false,
    });

    setIsAddModalOpen(false);
    setName("");
    setAccountNumber("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {t("nav.beneficiaries")}
            </h1>
            <p className="text-xs text-slate-400">
              Manage saved bank accounts for 1-tap instant transfers.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recipient</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search saved recipients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#090f1e] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      {/* Beneficiaries List */}
      <div className="space-y-3">
        {filteredBeneficiaries.map((ben) => (
          <div
            key={ben.id}
            className="p-4 rounded-3xl bg-[#090f1e] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-2xl ${ben.avatarColor} text-white font-bold text-sm flex items-center justify-center shrink-0`}
              >
                {ben.name[0]}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                  <span>{ben.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {ben.country === "NG" ? "🇳🇬" : "🇳🇪"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                  {ben.bankName} • {ben.accountNumber}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/customer/send-money"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-colors"
              >
                <span>Send</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => deleteBeneficiary(ben.id)}
                className="p-2 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                title="Delete beneficiary"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0b1222] border border-white/15 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Add New Beneficiary</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Destination Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CustomerCountry)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="NG">🇳🇬 Nigeria (NIP)</option>
                  <option value="NE">🇳🇪 Niger Republic (WAEMU)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Bank Name</label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {BANK_DIRECTORY.filter((b) => b.country === country).map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Account Number</label>
                <input
                  type="text"
                  required
                  placeholder="10-digit NUBAN / IBAN"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Recipient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aisha Mohammed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
              >
                Save Beneficiary
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
