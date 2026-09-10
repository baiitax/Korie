"use client";

import React from "react";
import { useAdmin } from "./AdminContext";
import { useAuth } from "@/components/auth/AuthContext";
import ConsoleTopBar from "@/components/console/ConsoleTopBar";

/** Super Admin top bar — thin wrapper over the shared console top bar so the
 *  admin design language is defined once and reused by every portal shell. */
export const AdminTopBar: React.FC<{ onOpenSearch?: () => void }> = ({ onOpenSearch }) => {
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* noop */ }
    await logout();
  };

  return (
    <ConsoleTopBar
      searchPlaceholder="Search transactions, accounts, BDC, reference (e.g. KP-2026)..."
      onSearch={() => {
        onOpenSearch?.();
        setIsSearchOpen(true);
      }}
      markets={{
        value: countryFilter,
        onChange: (v) => setCountryFilter(v as typeof countryFilter),
        options: [
          { id: "GLOBAL", label: "🌍 All Markets", tone: "global" },
          { id: "NG", label: "🇳🇬 Nigeria (NGN)", tone: "ng" },
          { id: "NE", label: "🇳🇪 Niger (XOF)", tone: "ne" },
        ],
      }}
      statusChip={
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
      }
      realtime={{ active: isRealtimeActive, onToggle: () => setIsRealtimeActive(!isRealtimeActive) }}
      notifications={{
        count: notificationsCount,
        title: "System Security & Alerts",
        emptyText: "No active alerts.",
        items: [
          {
            id: "mc-fx",
            title: "Maker-Checker Approval Pending",
            body: "High-Value FX swap (₦12.5M) awaiting checker verification.",
            tone: "amber",
          },
          {
            id: "nodes-ok",
            title: "Banking Nodes 100% Operational",
            body: "Providus & Coris gateways healthy with sub-200ms latency.",
            tone: "emerald",
          },
        ],
      }}
      user={{ name: user?.fullName || "Signed in", role: user?.role || "ADMIN" }}
      onLogout={handleLogout}
    />
  );
};

export default AdminTopBar;
