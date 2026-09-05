"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomer } from "@/components/customer/CustomerContext";
import { BANK_DIRECTORY } from "@/services/customerDataService";
import { CustomerCurrency, CustomerCountry } from "@/types/customer";
import { ArrowLeft, Plus, ArrowUpRight, Trash2, Search, X } from "lucide-react";

export default function CustomerBeneficiariesPage() {
  const router = useRouter();
  const { beneficiaries, saveBeneficiary, deleteBeneficiary, t } = useCustomer();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
      avatarColor: "bg-[var(--brand-soft)] text-[var(--brand-primary)]",
      isFavorite: false,
    });
    setIsAddModalOpen(false);
    setName("");
    setAccountNumber("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("nav.beneficiaries")}</h1>
            <p className="text-xs text-[var(--foreground-muted)]">{t("customer.beneficiaries.subtitle")}</p>
          </div>
        </div>

        <button onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] font-bold text-xs transition-colors shadow-[var(--shadow-md)]">
          <Plus className="w-4 h-4" /><span>{t("customer.beneficiaries.addRecipient")}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder={t("customer.beneficiaries.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-xs placeholder:text-[var(--text-disabled)] focus:outline-none"
        />
      </div>

      {/* Beneficiaries List */}
      <div className="space-y-3">
        {filteredBeneficiaries.map((ben) => (
          <div key={ben.id} className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex items-center justify-between gap-3 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 rounded-2xl ${ben.avatarColor} font-bold text-sm flex items-center justify-center shrink-0`}>
                {ben.name[0]}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--foreground)] truncate flex items-center gap-2">
                  <span>{ben.name}</span>
                  <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{ben.country === "NG" ? "🇳🇬" : "🇳🇪"}</span>
                </div>
                <div className="text-xs text-[var(--foreground-muted)] font-mono mt-0.5 truncate">
                  {ben.bankName} · {ben.accountNumber}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/customer/send-money"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--brand-soft)] hover:bg-[var(--brand-soft-strong)] border border-[var(--brand-border)] text-[var(--brand-primary)] font-bold text-xs transition-colors">
                <span>{t("customer.beneficiaries.send")}</span><ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <button onClick={() => deleteBeneficiary(ben.id)}
                className="p-2 rounded-xl hover:bg-[var(--danger-soft)] text-[var(--foreground-muted)] hover:text-[var(--danger)] transition-colors"
                title={t("customer.beneficiaries.deleteTitle")}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--foreground)]">{t("customer.beneficiaries.addNewTitle")}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-full text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--foreground)] font-semibold">{t("customer.beneficiaries.destinationCountry")}</label>
                <select value={country} onChange={(e) => setCountry(e.target.value as CustomerCountry)}
                  className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none">
                  <option value="NG">🇳🇬 Nigeria (NIP)</option>
                  <option value="NE">🇳🇪 Niger Republic (WAEMU)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--foreground)] font-semibold">{t("customer.beneficiaries.bankName")}</label>
                <select value={bankCode} onChange={(e) => setBankCode(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none">
                  {BANK_DIRECTORY.filter((b) => b.country === country).map((bank) => (
                    <option key={bank.code} value={bank.code}>{bank.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--foreground)] font-semibold">{t("customer.beneficiaries.accountNumber")}</label>
                <input type="text" required placeholder="10-digit NUBAN / IBAN" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-mono focus:outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--foreground)] font-semibold">{t("customer.beneficiaries.recipientName")}</label>
                <input type="text" required placeholder="e.g. Aisha Mohammed" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none" />
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] font-bold text-xs hover:bg-[var(--brand-primary-hover)] transition-colors shadow-[var(--shadow-md)]">
                {t("customer.beneficiaries.saveBeneficiary")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
