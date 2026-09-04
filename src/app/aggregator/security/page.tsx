"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Shield,
  Lock,
  Smartphone,
  CheckCircle2,
  Key,
} from "lucide-react";

export default function AggregatorSecurityPage() {
  const { t } = useAggregator();
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [ipLockEnabled, setIpLockEnabled] = useState(true);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Security & Access Control Center</h1>
        <p className="text-xs text-slate-400">
          Enforce multi-factor authentication, maker-checker authorization controls, and IP restriction policies
        </p>
      </div>

      {/* Security Policies */}
      <div className="space-y-4">
        <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Multi-Factor Authentication (MFA)</h3>
              <p className="text-xs text-slate-400">Require TOTP authenticator app verification for all float dispatches and payouts.</p>
            </div>
            <button
              onClick={() => setMfaEnabled(!mfaEnabled)}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                mfaEnabled ? "bg-teal-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">IP Whitelisting & Geo-Fencing</h3>
              <p className="text-xs text-slate-400">Restrict aggregator command center access to approved office IP subnets in Nigeria & Niger.</p>
            </div>
            <button
              onClick={() => setIpLockEnabled(!ipLockEnabled)}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                ipLockEnabled ? "bg-teal-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
