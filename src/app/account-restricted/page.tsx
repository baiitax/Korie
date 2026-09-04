"use client";

import React from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import SecurityNotice from "@/components/auth/SecurityNotice";
import { ShieldAlert, HelpCircle, ArrowLeft, PhoneCall } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

export default function AccountRestrictedPage() {
  const { logout, jurisdiction } = useAuth();

  return (
    <AuthShell>
      <div className="w-full max-w-md space-y-6">
        <AuthHeader
          titleEn="Security Review Required"
          titleHa="Ana Bukatar Binciken Tsaro"
          titleFr="Vérification de sécurité requise"
          subtitleEn="Your account is currently undergoing routine compliance verification or security holds."
          subtitleHa="Asusunka na bukatar karin tabbaci don tsaro kafin a ci gaba."
          subtitleFr="Votre compte fait l'objet d'une vérification de conformité de routine."
          badge="Security Alert Desk"
        />

        <AuthCard>
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white">Access Temporarily On Hold</h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                In accordance with bilateral CBN & BCEAO banking regulations and automated risk protocols, access to this account requires manual verification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#070d18] border border-white/[0.08] text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Jurisdiction:</span>
                <span className="font-bold text-white">{jurisdiction === "NG" ? "Nigeria (NGN)" : "Niger Republic (XOF)"}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Hold Reference:</span>
                <span className="font-mono text-emerald-400">SEC-HOLD-2026-9912</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Resolution Time:</span>
                <span className="text-slate-200">1 – 2 Business Hours</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/support"
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Contact Security Desk</span>
              </Link>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-bold text-xs transition-colors"
              >
                Sign Out
              </button>
            </div>

            <SecurityNotice />
          </div>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
