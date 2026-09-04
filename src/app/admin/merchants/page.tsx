"use client";

import React, { useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { MERCHANTS } from "@/services/adminDataService";
import { CreditCard, Search, QrCode, Smartphone, Download, ArrowRight } from "lucide-react";

export default function MerchantsAdminPage() {
  const { countryFilter } = useAdmin();
  const [search, setSearch] = useState("");

  const filtered = MERCHANTS.filter((m) => {
    const matchesCountry = countryFilter === "GLOBAL" || m.countryCode === countryFilter;
    const matchesSearch =
      !search.trim() ||
      m.businessName.toLowerCase().includes(search.toLowerCase()) ||
      m.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      m.city.toLowerCase().includes(search.toLowerCase());
    return matchesCountry && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
            MERCHANT PAYMENT ACCEPTANCE
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Merchant Directory & Settlements</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor registered retail merchants, dynamic counter QR standees, card terminals, and gross checkout volumes.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Business Name</th>
              <th className="p-4 font-semibold">City / Market</th>
              <th className="p-4 font-semibold">Settlement Bank</th>
              <th className="p-4 font-semibold">QR Codes</th>
              <th className="p-4 font-semibold">30D Gross Sales</th>
              <th className="p-4 font-semibold">Pending Settlement</th>
              <th className="p-4 font-semibold">Success SLA</th>
              <th className="p-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-white">{m.businessName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{m.ownerName} • {m.businessType}</div>
                </td>
                <td className="p-4 font-mono">{m.countryCode === "NG" ? "🇳🇬 " : "🇳🇪 "}{m.city}</td>
                <td className="p-4 font-mono text-slate-300">{m.settlementBank}</td>
                <td className="p-4 font-mono text-amber-400 font-bold">{m.activeQRCodes} Standees</td>
                <td className="p-4 font-mono font-bold text-white">
                  {m.currency === "NGN" ? "₦" : "CFA "}
                  {m.grossSales30d.toLocaleString()}
                </td>
                <td className="p-4 font-mono text-emerald-400 font-semibold">
                  {m.currency === "NGN" ? "₦" : "CFA "}
                  {m.netSettlementPending.toLocaleString()}
                </td>
                <td className="p-4 font-mono text-white font-bold">{m.successRate}%</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    ● {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
