"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { SupportedLanguage } from "@/types/customer";

const OPTIONS: { code: SupportedLanguage; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "ha", label: "Hausa", native: "Hausa" },
  { code: "fr", label: "Français", native: "Français" },
];

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

/**
 * Unified EN / HA / FR language selector. Consistent across the public
 * website, the auth flow and every authenticated portal.
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
  className = "",
}) => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = OPTIONS.find((o) => o.code === language);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Language: ${current?.label || "English"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--nav-muted)] transition-colors hover:text-[var(--nav-fg)] hover:border-[var(--border-strong)]"
      >
        <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
        <span className="uppercase tracking-wide">{language}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {!compact && (
          <span className="hidden md:inline text-[var(--nav-muted)] font-normal">
            {current?.label}
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-fadeIn"
        >
          {OPTIONS.map((opt) => {
            const active = opt.code === language;
            return (
              <button
                key={opt.code}
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLanguage(opt.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "text-[var(--nav-fg)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono uppercase">{opt.code}</span>
                  <span>{opt.native}</span>
                </span>
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
