"use client";

import React, { useState } from "react";
import { useAdmin } from "./AdminContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/components/auth/AuthContext";
import {
  Search,
  Globe2,
  Bell,
  ShieldAlert,
  Radio,
  CheckCircle2,
  Layers,
  ChevronDown,
  RefreshCw,
  LogOut,
} from "lucide-react";

export const AdminTopBar: React.FC = () => {
  const {
    countryFilter,
    setCountryFilter,
    environment,
    setEnvironment,
    isRealtimeActive,
    setIsRealtimeActive,
    setIsSearchOpen,
    notificationsCount,
  } = useAdmin();
  const { user, logout } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* noop */ }
    await logout();
  };

  return (
    <header className="h-16 glass-nav px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Quick Search Trigger */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all text-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search transactions, accounts, BDC, reference (e.g. KP-2026)...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 text-slate-300 rounded border border-white/10">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-3">
        {/* Country Filter Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setCountryFilter("GLOBAL")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              countryFilter === "GLOBAL"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🌍 All Markets
          </button>
          <button
            onClick={() => setCountryFilter("NG")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              countryFilter === "NG"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🇳🇬 Nigeria (NGN)
          </button>
          <button
            onClick={() => setCountryFilter("NE")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              countryFilter === "NE"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🇳🇪 Niger (XOF)
          </button>
        </div>

        {/* Environment Toggle */}
        <button
          onClick={() => setEnvironment(environment === "PRODUCTION" ? "SANDBOX" : "PRODUCTION")}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
            environment === "PRODUCTION"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}
          title="Toggle Production / Sandbox"
        >
          <span className={`w-2 h-2 rounded-full ${environment === "PRODUCTION" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <span>{environment}</span>
        </button>

        {/* Realtime Status Button */}
        <button
          onClick={() => setIsRealtimeActive(!isRealtimeActive)}
          className={`p-2 rounded-xl border transition-colors ${
            isRealtimeActive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-slate-900 text-slate-500 border-white/5"
          }`}
          title={isRealtimeActive ? "Realtime Telemetry Active" : "Realtime Paused"}
        >
          <Radio className="w-4 h-4" />
        </button>

        {/* Notifications Tray Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            {notificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono">
                {notificationsCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-[#0d1527] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl z-50 text-xs animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <span className="font-bold text-white">System Security & Alerts</span>
                <span className="text-[10px] font-mono text-emerald-400">{notificationsCount} Active</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-white/5">
                <div className="p-2 rounded-lg bg-slate-900/80">
                  <div className="text-amber-400 font-bold text-[11px]">Maker-Checker Approval Pending</div>
                  <div className="text-slate-300 text-[11px] mt-0.5">High-Value FX swap (₦12.5M) awaiting checker verification.</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/80 pt-2">
                  <div className="text-emerald-400 font-bold text-[11px]">Banking Nodes 100% Operational</div>
                  <div className="text-slate-300 text-[11px] mt-0.5">Providus & Koris gateways healthy with sub-200ms latency.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Day / Night Theme Toggle */}
        <ThemeToggle className="items-center justify-center p-2 bg-slate-900 border border-white/10 text-slate-300 hover:text-white" />

        {/* Signed-in operator + Logout */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-xs font-bold text-white">{user?.fullName || "Signed in"}</span>
            <span className="text-[10px] font-mono text-emerald-400 capitalize">{user?.role || "ADMIN"}</span>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-red-400 hover:border-red-500/40 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden xl:inline text-xs font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
