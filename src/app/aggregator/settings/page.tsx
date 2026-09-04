"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Settings,
  Building2,
  Bell,
  Shield,
  Check,
} from "lucide-react";

export default function AggregatorSettingsPage() {
  const { aggregator, language, setLanguage, t } = useAggregator();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
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
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Network Settings</h1>
        <p className="text-xs text-slate-400">
          Configure corporate settlement accounts, automatic float threshold alerts, and communication preferences
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Aggregator network settings updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Settlement Account */}
        <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Providus Bank Settlement Account</h3>
              <p className="text-xs text-slate-400">Destination account for daily automated commission clearing.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Settlement Bank</label>
              <input
                type="text"
                disabled
                value={aggregator.settlementBank}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold opacity-80"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Account Number</label>
              <input
                type="text"
                disabled
                value={aggregator.settlementAccountMasked}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-teal-400 font-mono text-xs font-bold opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Automated Network Alerts</h3>
              <p className="text-xs text-slate-400">Get notified immediately upon critical float shortages or risk anomalies.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/5">
              <div>
                <div className="font-bold text-xs text-white">Low Agent Float Notifications</div>
                <div className="text-[11px] text-slate-400">Dispatch SMS/Email alerts when an agent float drops below ₦250k</div>
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
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
