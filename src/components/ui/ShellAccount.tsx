"use client";

import React from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useTheme } from "./ThemeContext";

/**
 * Compact account controls for portal headers (customer, agent, aggregator,
 * merchant, developer, support, compliance).
 *
 * Token-driven so it renders correctly in both Light and Night modes: the
 * semantic tokens (--surface, --border, --foreground) resolve per theme.
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
        className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        title={theme === "dark" ? "Switch to Day (Light) mode" : "Switch to Night (Dark) mode"}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4 text-[var(--brand-secondary)]" />
        ) : (
          <Moon className="w-4 h-4 text-[var(--brand-primary)]" />
        )}
      </button>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--danger)] hover:border-[var(--danger-soft)] transition-colors"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>

      {/* Operator identity */}
      <span className="hidden xl:flex flex-col items-end leading-tight">
        <span className="text-[11px] font-bold text-[var(--foreground)]">{user?.firstName || "User"}</span>
        <span className="text-[9px] font-mono text-[var(--foreground-muted)] capitalize">{user?.role || "STAFF"}</span>
      </span>
    </div>
  );
};

export default ShellAccount;
