"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  Settings,
  Building2,
  Bell,
  Shield,
  Palette,
  Check,
  Smartphone,
  Mail,
  Lock,
} from "lucide-react";

export default function MerchantSettingsPage() {
  const { merchant, language, setLanguage, t } = useMerchant();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Operational Settings</h1>
        <p className="text-xs text-slate-400">
          Configure linked Providus settlement accounts, security 2FA, receipt branding, and notifications.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Settings successfully updated across all branch nodes.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Settlement Account Card */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Providus Bank Payout Destination</h3>
              <p className="text-xs text-slate-400">Where all daily sales settlements are cleared.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Settlement Bank</label>
              <input
                type="text"
                disabled
                value={merchant.settlementBank}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold opacity-80"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Account Number</label>
              <input
                type="text"
                disabled
                value={merchant.settlementAccountMasked}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-teal-400 font-mono text-xs font-bold opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Security & 2FA */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Security & Maker-Checker Dual Controls</h3>
              <p className="text-xs text-slate-400">Enforce dual approval for all high-value refunds and payouts.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/5">
              <div>
                <div className="font-bold text-xs text-white">Two-Factor Authentication (SMS & Authenticator)</div>
                <div className="text-[11px] text-slate-400">Required for staff logins and API key generation</div>
              </div>
              <button
                type="button"
                onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  twoFactorAuth ? "bg-teal-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Real-time Inflow Notifications</h3>
              <p className="text-xs text-slate-400">Get notified immediately upon payment receipt.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/5">
              <div>
                <div className="font-bold text-xs text-white">Email Receipt Dispatch</div>
                <div className="text-[11px] text-slate-400">Dispatch transaction receipts to finance@saharasupermarket.ng</div>
              </div>
              <button
                type="button"
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  emailAlerts ? "bg-teal-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/5">
              <div>
                <div className="font-bold text-xs text-white">Instant SMS Inflow Alerts</div>
                <div className="text-[11px] text-slate-400">Send instant SMS notifications to Store Branch Cashiers</div>
              </div>
              <button
                type="button"
                onClick={() => setSmsAlerts(!smsAlerts)}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  smsAlerts ? "bg-teal-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
