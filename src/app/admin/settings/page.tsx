"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, Globe2, Coins, Sliders, Save, Check } from "lucide-react";

export default function SettingsAdminPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-white/10">
            SYSTEM PARAMETERS
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Platform Settings & Limits</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure country-specific transaction limits, regulatory reporting thresholds, and fee engine parameters.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {/* Nigeria Limits */}
        <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <span className="text-xl">🇳🇬</span>
            <h3 className="text-sm font-bold text-white uppercase font-mono">Nigeria Market Parameters (CBN Aligned)</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Tier 1 Daily Limit (NGN)</label>
              <input type="text" defaultValue="₦ 50,000" className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Tier 3 Daily Limit (NGN)</label>
              <input type="text" defaultValue="₦ 5,000,000" className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Single NIP Transfer Cap</label>
              <input type="text" defaultValue="₦ 10,000,000" className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Default Banking Gateway</label>
              <input type="text" disabled defaultValue="Providus Bank Nigeria Plc" className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/5 text-emerald-400 font-mono" />
            </div>
          </div>
        </div>

        {/* Niger Limits */}
        <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <span className="text-xl">🇳🇪</span>
            <h3 className="text-sm font-bold text-white uppercase font-mono">Niger Republic Parameters (BCEAO Aligned)</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Tier 1 Daily Limit (XOF)</label>
              <input type="text" defaultValue="100,000 CFA" className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Tier 3 Daily Limit (XOF)</label>
              <input type="text" defaultValue="10,000,000 CFA" className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Default Banking Gateway</label>
              <input type="text" disabled defaultValue="Koris Bank SA (Niamey)" className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/5 text-amber-400 font-mono" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3 rounded-xl btn-korie-primary text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? "Parameters Saved & Synced" : "Save Platform Parameters"}</span>
        </button>
      </form>
    </div>
  );
}
