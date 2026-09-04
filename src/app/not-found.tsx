import React from "react";
import Link from "next/link";
import { Globe2, ArrowRight, Home, Building2, Repeat2, Users } from "lucide-react";
import KorieLogo from "@/components/brand/KorieLogo";

export default function NotFound() {
  return (
    <main className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-center px-4 bg-grid-subtle relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl mx-auto space-y-6 relative z-10">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
          <Globe2 className="w-8 h-8 text-emerald-400 animate-pulse" />
        </div>

        <div className="text-4xl sm:text-6xl font-extrabold font-mono text-gradient-korie">
          404
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          This Page Isn&apos;t Connected
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
          The node or route you are attempting to reach is currently offline or has moved to a new corridor address.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl btn-korie-primary text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <Home className="w-4 h-4" />
            <span>Return to KoriePay Home</span>
          </Link>
        </div>

        {/* Quick jump paths */}
        <div className="pt-8 border-t border-white/10 max-w-md mx-auto">
          <div className="text-xs text-slate-400 mb-3 font-mono uppercase">
            Or reconnect to a primary pillar:
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Link
              href="/solutions/agency-banking"
              className="p-3 rounded-xl bg-slate-900/80 border border-white/5 hover:border-emerald-500/30 text-white font-medium text-center"
            >
              Agency Banking
            </Link>
            <Link
              href="/solutions/bdc-fx"
              className="p-3 rounded-xl bg-slate-900/80 border border-white/5 hover:border-amber-500/30 text-white font-medium text-center"
            >
              BDC / FX Desks
            </Link>
            <Link
              href="/solutions/customers"
              className="p-3 rounded-xl bg-slate-900/80 border border-white/5 hover:border-teal-500/30 text-white font-medium text-center"
            >
              Customer Wallet
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
