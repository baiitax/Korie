"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { useTheme } from "@/components/ui/ThemeContext";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  User,
} from "lucide-react";

/**
 * Authenticated user menu with the logged-in identity, a link to the
 * relevant dashboard and a Sign-out action (logout). Reusable across the
 * public navbar and the various portal top bars.
 */
export const UserMenu: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { user, logout, activeRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n.charAt(0).toUpperCase())
    .join("");

  const dashboards: Record<string, string> = {
    ADMIN: "/admin",
    SUPER_ADMIN: "/admin",
    CUSTOMER: "/customer",
    AGENT: "/agent",
    AGGREGATOR: "/aggregator",
    MERCHANT: "/merchant",
    COMPLIANCE: "/compliance",
    SUPPORT: "/support",
    DEVELOPER: "/developer",
  };
  const dashboard = dashboards[activeRole] || "/login";

  const handleLogout = async () => {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    await logout();
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 pl-1.5 text-xs text-[var(--nav-fg)] transition-colors hover:border-[var(--accent-border)]"
        aria-label="Account menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-bold text-white">
          {initials || "K"}
        </span>
        <span className="hidden md:inline font-semibold">
          {user.firstName}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-[var(--nav-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-2xl z-50 animate-fadeIn">
          <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
              {initials || "K"}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-[var(--nav-fg)]">
                {user.fullName}
              </div>
              <div className="truncate text-[11px] text-[var(--nav-muted)]">
                {user.email}
              </div>
            </div>
          </div>

          <div className="p-2">
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--nav-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Role: </span>
              <span className="font-semibold text-[var(--nav-fg)] capitalize">
                {activeRole.toLowerCase().replace("_", " ")}
              </span>
            </div>

            <Link
              href={dashboard}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--nav-fg)] transition-colors hover:bg-[var(--surface-2)]"
            >
              <LayoutDashboard className="h-4 w-4 text-emerald-500" />
              Go to Dashboard
            </Link>

            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--nav-fg)] transition-colors hover:bg-[var(--surface-2)]"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-emerald-600" />
              )}
              {theme === "dark" ? "Day (Light) Theme" : "Night (Dark) Theme"}
            </button>

            <div className="my-1.5 border-t border-[var(--border)]" />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
