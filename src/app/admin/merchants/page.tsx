"use client";

import React from "react";
import { Store, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function MerchantsAdminPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
            MERCHANT PAYMENT ACCEPTANCE
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Merchant Directory & Settlements</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            This console previously listed merchants from a hand-written array. That list is removed; what follows is the honest state.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-amber-500/25 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Directory withheld — no merchant registry engine exists</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
              No engine in this deployment records merchants (no business registry, no settlement accounts, no QR/terminal
              inventory, no checkout volumes). A directory built without one would be invented businesses with invented
              settlement balances — so the console shows this instead of a table.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 border border-white/5 p-4 space-y-2 text-xs">
          <p className="text-slate-300 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> What was checked before withholding
          </p>
          <ul className="text-slate-400 space-y-1.5 leading-relaxed list-none">
            <li>· <span className="font-mono text-slate-300">AgentMerchantIntelligenceEngine</span> holds two merchant profiles with GMV and margin figures — but they are constructor seeds with no provenance and no recomputation path, so they are deliberately not surfaced as telemetry.</li>
            <li>· The subledger carries a <span className="font-mono text-slate-300">MERCHANT_PAYABLE</span> position, but a payable line without a merchant record identifies no business and settles to no account.</li>
            <li>· Merchant checkout and settlement flows exist in the merchant portal as operator journeys; they do not write to a registry this console can read.</li>
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-950/70 border border-white/5 p-4 text-xs">
          <p className="text-slate-300 font-semibold">What would wire this console</p>
          <p className="text-slate-400 mt-1 leading-relaxed">
            A merchant registry engine (business identity, settlement account mapping, QR/terminal inventory) with checkout
            and settlement events journaled through the ledger. Until then, gross sales, pending settlements and success
            SLAs per merchant are unmeasurable and stay off this screen.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/wallets" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-200 text-xs font-semibold transition-colors">
            Wallet positions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/admin/transactions" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-200 text-xs font-semibold transition-colors">
            Posted ledger activity <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
