"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { SECURITY_SESSIONS, TRUSTED_DEVICES } from "@/services/customerDataService";
import {
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  Laptop,
  Fingerprint,
  Lock,
  KeyRound,
  LogOut,
  CheckCircle2,
} from "lucide-react";

export default function CustomerSecurityPage() {
  const { customer, t } = useCustomer();
  const [mfaEnabled, setMfaEnabled] = useState(customer.mfaEnabled);
  const [biometricsEnabled, setBiometricsEnabled] = useState(customer.biometricEnabled);
  const [sessions, setSessions] = useState(SECURITY_SESSIONS);
  const [revokedMessage, setRevokedMessage] = useState<string | null>(null);

  const handleRevokeOthers = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrentSession));
    setRevokedMessage("All other active device sessions have been terminated.");
    setTimeout(() => setRevokedMessage(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("security.title")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("security.subtitle")}
          </p>
        </div>
      </div>

      {/* Security Switches */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 divide-y divide-white/5 overflow-hidden shadow-xl">
        {/* 2FA */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {t("security.twoFactorTitle")}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t("security.twoFactorDesc")}
              </p>
            </div>
          </div>

          <button
            onClick={() => setMfaEnabled(!mfaEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
              mfaEnabled ? "bg-emerald-500" : "bg-slate-700"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                mfaEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Biometrics */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {t("security.biometricTitle")}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t("security.biometricDesc")}
              </p>
            </div>
          </div>

          <button
            onClick={() => setBiometricsEnabled(!biometricsEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
              biometricsEnabled ? "bg-emerald-500" : "bg-slate-700"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                biometricsEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* PIN & Password Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => alert("PIN change OTP dispatched to your verified phone number.")}
          className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 text-left transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{t("security.changePin")}</div>
            <div className="text-[10px] text-slate-400">Update 4-digit transfer code</div>
          </div>
        </button>

        <button
          onClick={() => alert("Password reset link dispatched to your email.")}
          className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 text-left transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{t("security.changePassword")}</div>
            <div className="text-[10px] text-slate-400">Account login credentials</div>
          </div>
        </button>
      </div>

      {/* Active Device Sessions */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
            {t("security.activeSessions")}
          </h2>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeOthers}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold"
            >
              {t("security.revokeOtherSessions")}
            </button>
          )}
        </div>

        {revokedMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{revokedMessage}</span>
          </div>
        )}

        <div className="divide-y divide-white/5">
          {sessions.map((sess) => (
            <div key={sess.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-300">
                  {sess.browser.includes("Mobile") || sess.browser.includes("iOS") ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{sess.deviceName}</span>
                    {sess.isCurrentSession && (
                      <span className="px-2 py-0.2 rounded text-[9px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        THIS DEVICE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {sess.browser} • {sess.locationApprox}
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                {sess.lastActive}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
