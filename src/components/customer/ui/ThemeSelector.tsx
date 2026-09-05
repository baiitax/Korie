"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme, Theme } from "@/components/ui/ThemeContext";

/**
 * ThemeSelector — the accessible appearance control (§37–§38).
 *
 * The defect this replaces: the day/night toggle was a lone icon button in the
 * header with `hidden sm:inline-flex`, so on a phone there was literally no way
 * to change the theme anywhere in the customer portal. Two rules follow from
 * the brief:
 *   • the control must exist in the mobile surfaces too (More sheet + Settings);
 *   • it renders real radios with labels, not an unlabelled glyph, so it is
 *     operable and readable by assistive tech.
 *
 * Only the options the product actually supports are offered. "System" is
 * deliberately NOT added: first visit already follows
 * `prefers-color-scheme`, but there is no live follow-through, and a control
 * that silently stops tracking the OS after the first paint is worse than no
 * control. Persistence itself is handled by ThemeContext + the pre-hydration
 * script in the root layout (no theme flash).
 */

const OPTIONS: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: "light", labelKey: "customer.settings.appearanceLight", icon: Sun },
  { value: "dark", labelKey: "customer.settings.appearanceDark", icon: Moon },
];

export const ThemeSelector: React.FC<{
  t: (key: string, params?: Record<string, string | number>) => string;
  /** `segmented` for settings, `sheet` for the mobile More menu. */
  variant?: "segmented" | "sheet";
}> = ({ t, variant = "segmented" }) => {
  const { theme, setTheme } = useTheme();

  if (variant === "sheet") {
    return (
      <div className="flex items-center justify-between gap-3 px-1 py-1">
        <span className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)]">
            {theme === "dark" ? <Moon className="h-4 w-4 text-[var(--brand-secondary)]" /> : <Sun className="h-4 w-4 text-[var(--brand-primary)]" />}
          </span>
          {t("customer.settings.appearance")}
        </span>
        <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-elevated)] p-1">
          {OPTIONS.map((o) => {
            const active = theme === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setTheme(o.value)}
                aria-pressed={active}
                className={`min-h-[36px] min-w-[64px] rounded-lg px-3 text-[11px] font-bold transition-colors ${
                  active
                    ? "bg-[var(--surface)] text-[var(--brand-primary)] shadow-[var(--shadow-sm)] border border-[var(--brand-border)]"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {t(o.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
        {t("customer.settings.appearance")}
      </legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("customer.settings.appearance")}>
        {OPTIONS.map((o) => {
          const active = theme === o.value;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(o.value)}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left transition-all min-h-[48px] ${
                active
                  ? "border-[var(--brand-border)] bg-[var(--brand-soft)] shadow-[var(--shadow-sm)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${active ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`}
                aria-hidden="true"
              />
              <span className={`text-xs font-bold ${active ? "text-[var(--brand-primary)]" : "text-[var(--foreground)]"}`}>
                {t(o.labelKey)}
              </span>
              {active && (
                <span className="ml-auto h-2 w-2 rounded-full bg-[var(--brand-primary)]" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--foreground-muted)]">{t("customer.settings.appearanceNote")}</p>
    </fieldset>
  );
};

export default ThemeSelector;
