"use client";

import React, { useState, useEffect } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Building2,
  Bell,
  Check,
  AlertCircle,
} from "lucide-react";

export default function AggregatorSettingsPage() {
  const { aggregator, notificationPreferences, updateNotificationPreferences, t } = useAggregator();
  const [emailAlerts, setEmailAlerts] = useState(notificationPreferences.lowFloatEmailAlerts);
  const [smsAlerts, setSmsAlerts] = useState(notificationPreferences.lowFloatSmsAlerts);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setEmailAlerts(notificationPreferences.lowFloatEmailAlerts);
    setSmsAlerts(notificationPreferences.lowFloatSmsAlerts);
  }, [notificationPreferences]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSavedSuccess(false);
    const result = await updateNotificationPreferences({ lowFloatEmailAlerts: emailAlerts, lowFloatSmsAlerts: smsAlerts });
    setIsSaving(false);
    if (result.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      setSaveError(result.error || "Could not save settings.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Aggregator Network Settings</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Configure corporate settlement account details and low-float alert preferences
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Notification preferences saved.</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Settlement Account */}
        <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--foreground)] text-base">Settlement Account</h3>
              <p className="text-xs text-[var(--foreground-muted)]">Destination account for commission settlement runs.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase block mb-1">Settlement Bank</label>
              <input
                type="text"
                disabled
                value={aggregator.settlementBank}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-xs font-bold opacity-80"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase block mb-1">Account Number</label>
              <input
                type="text"
                disabled
                value={aggregator.settlementAccountMasked}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-teal-600 dark:text-teal-400 font-mono text-xs font-bold opacity-80"
              />
            </div>
          </div>
          <p className="text-[10px] text-[var(--foreground-muted)]">
            To change your settlement account, contact support — this requires manual verification and is not
            self-service.
          </p>
        </div>

        {/* Notifications */}
        <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--foreground)] text-base">Low Agent Float Alerts</h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Choose how you're notified when an agent's float drops below their configured threshold.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div>
                <div className="font-bold text-xs text-[var(--foreground)]">Email Alerts</div>
                <div className="text-[11px] text-[var(--foreground-muted)]">Sent to {aggregator.contactEmail}</div>
              </div>
              <button
                type="button"
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  emailAlerts ? "bg-teal-500 justify-end" : "bg-[var(--surface-3)] justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div>
                <div className="font-bold text-xs text-[var(--foreground)]">SMS Alerts</div>
                <div className="text-[11px] text-[var(--foreground-muted)]">Sent to {aggregator.contactPhone}</div>
              </div>
              <button
                type="button"
                onClick={() => setSmsAlerts(!smsAlerts)}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  smsAlerts ? "bg-teal-500 justify-end" : "bg-[var(--surface-3)] justify-start"
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
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
