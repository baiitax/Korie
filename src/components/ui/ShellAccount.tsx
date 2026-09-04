"use client";

import React from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useTheme } from "./ThemeContext";

/**
 * Compact account controls for the light-on-dark portal headers.
 * Renders a day/night toggle and a sign-out button.
 */
export const ShellAccount: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    await logout();
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {/* Day / Night toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
        title={theme === "dark" ? "Switch to Day (Light) mode" : "Switch to Night (Dark) mode"}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-emerald-400" />
        )}
      </button>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-red-400 hover:border-red-500/40 transition-colors"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>

      {/* Operator identity */}
      <span className="hidden xl:flex flex-col items-end leading-tight">
        <span className="text-[11px] font-bold text-white">{user?.firstName || "User"}</span>
        <span className="text-[9px] font-mono text-slate-400 capitalize">{user?.role || "STAFF"}</span>
      </span>
    </div>
  );
};

export default ShellAccount;
