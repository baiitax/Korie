"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import { merchantApiFetch } from "@/lib/merchant/merchantSession";
import { Building2, Bell, Shield, Check, AlertTriangle, Loader2 } from "lucide-react";

export default function MerchantSettingsPage() {
  const { merchant, t } = useMerchant();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/settings/notifications");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setEmailAlerts(json.data.emailAlerts);
        setSmsAlerts(json.data.smsAlerts);
        setTwoFactorAuth(json.data.twoFactorAuth);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await merchantApiFetch("/api/v1/merchant/settings/notifications", {
        method: "PUT",
        body: JSON.stringify({ emailAlerts, smsAlerts, twoFactorAuth }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } else {
        setErrorMessage(json?.error?.message || "Could not save settings.");
      }
    } catch {
      setErrorMessage("Network error saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Operational Settings</h1>
        <p className="text-xs text-slate-400">
          Linked settlement account, security, and notification preferences — persisted to your real account.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Settings saved.</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMessage}</span>
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
              <h3 className="font-bold text-white text-base">Settlement Payout Destination</h3>
              <p className="text-xs text-slate-400">Where your settlement batches are payable to.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Settlement Bank</label>
              <input
                type="text"
                disabled
                value={merchant.settlementBank || "Not yet configured"}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold opacity-80"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Account Number</label>
              <input
                type="text"
                disabled
                value={merchant.settlementAccountMasked || "—"}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-teal-400 font-mono text-xs font-bold opacity-80"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            To change your settlement bank, contact support — this requires manual verification for fraud prevention.
          </p>
        </div>

        {/* Security & 2FA */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Security Preferences</h3>
              <p className="text-xs text-slate-400">Require an additional factor for staff logins.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/5">
              <div>
                <div className="font-bold text-xs text-white">Two-Factor Authentication</div>
                <div className="text-[11px] text-slate-400">Adds a preference flag to your account; enrolment is completed via your Supabase login provider.</div>
              </div>
              <button
                type="button"
                disabled={isLoading}
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
              <h3 className="font-bold text-white text-base">Inflow Notification Preferences</h3>
              <p className="text-xs text-slate-400">Choose how you're notified of new activity.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/5">
              <div>
                <div className="font-bold text-xs text-white">Email Notifications</div>
                <div className="text-[11px] text-slate-400">Sent to {merchant.email}</div>
              </div>
              <button
                type="button"
                disabled={isLoading}
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
                <div className="font-bold text-xs text-white">SMS Notifications</div>
                <div className="text-[11px] text-slate-400">Sent to {merchant.phone}</div>
              </div>
              <button
                type="button"
                disabled={isLoading}
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
            disabled={isSaving || isLoading}
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
