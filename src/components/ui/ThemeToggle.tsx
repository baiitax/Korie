"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeContext";

interface ThemeToggleProps {
  className?: string;
  label?: boolean;
}

/**
 * A day / night toggle. Clicking toggles the global theme
 * (light <-> dark) and persists the preference.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  label = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to day (light) theme" : "Switch to night (dark) theme"}
      title={isDark ? "Switch to Day / Light mode" : "Switch to Night / Dark mode"}
      className={`inline-flex items-center gap-1.5 rounded-xl border transition-colors ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-emerald-600" />
      )}
      <span className="sr-only">{isDark ? "Light mode" : "Dark mode"}</span>
      {label && (
        <span className="text-xs font-semibold text-[var(--nav-muted)]">
          {isDark ? "Day" : "Night"}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
