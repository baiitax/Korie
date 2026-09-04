"use client";

import React, { useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { CUSTOMERS, AGENTS } from "@/services/adminDataService";
import { Wallet, Search, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function WalletsAdminPage() {
  const { countryFilter, openMakerChecker } = useAdmin();
  const [search, setSearch] = useState("");

  const wallets = [
    ...CUSTOMERS.map((c) => ({
      walletId: c.walletId,
      owner: c.fullName,
      type: "CUSTOMER_PERSONAL",
      country: c.country,
      countryCode: c.countryCode,
      currency: c.currency,
      available: c.availableBalance,
      ledger: c.ledgerBalance,
      status: c.status,
    })),
    ...AGENTS.map((a) => ({
      walletId: a.walletId,
      owner: a.businessName,
      type: "AGENT_FLOAT",
      country: a.country,
      countryCode: a.countryCode,
      currency: a.currency,
      available: a.floatBalance,
      ledger: a.floatBalance,
      status: a.status,
    })),
  ];

  const filtered = wallets.filter((w) => {
    const matchesCountry = countryFilter === "GLOBAL" || w.countryCode === countryFilter;
    const matchesSearch =
      !search.trim() ||
      w.walletId.toLowerCase().includes(search.toLowerCase()) ||
      w.owner.toLowerCase().includes(search.toLowerCase());
    return matchesCountry && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            TREASURY & WALLET CONTROL
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Multi-Currency Wallet Control</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor ledger vs available balances, freeze/unfreeze actions with Maker-Checker dual authorization.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                <th className="p-4 font-semibold">Wallet ID</th>
                <th className="p-4 font-semibold">Owner</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Market</th>
                <th className="p-4 font-semibold">Available Balance</th>
                <th className="p-4 font-semibold">Ledger Balance</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Dual Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((w) => (
                <tr key={w.walletId} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono font-bold text-white">{w.walletId}</td>
                  <td className="p-4 font-semibold text-white">{w.owner}</td>
                  <td className="p-4 text-slate-400 font-mono text-[11px]">{w.type}</td>
                  <td className="p-4 font-mono">{w.countryCode === "NG" ? "🇳🇬 NG" : "🇳🇪 NE"}</td>
                  <td className="p-4 font-mono font-bold text-emerald-400">
                    {w.currency === "NGN" ? "₦" : "CFA "}
                    {w.available.toLocaleString()}
                  </td>
                  <td className="p-4 font-mono text-slate-300">
                    {w.currency === "NGN" ? "₦" : "CFA "}
                    {w.ledger.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                      ● {w.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() =>
                        openMakerChecker({
                          id: `mc-wallet-${w.walletId}`,
                          actionType: "WALLET_FREEZE",
                          resourceType: "WALLET",
                          resourceId: w.walletId,
                          resourceName: `${w.owner} (${w.walletId})`,
                          countryCode: w.countryCode,
                          requestedBy: "supervisor.finance@koriepay.com",
                          requestedAt: new Date().toISOString(),
                          reason: "Administrative temporary compliance lock",
                          payload: { walletId: w.walletId },
                          status: "PENDING",
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-[11px] transition-colors"
                    >
                      Freeze / Restrict
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
