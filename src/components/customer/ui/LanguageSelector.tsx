"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCustomer } from "../CustomerContext";
import { SupportedLanguage } from "@/types/customer";
import { Globe, Check, ChevronDown } from "lucide-react";

/**
 * Fixed, instantly-accessible language control for the customer portal.
 * A single persistent control (desktop header + mobile header) that switches
 * the interface immediately, preserves route/context, and persists the choice.
 *
 * LANGUAGE ≠ NATIONALITY (directive §12): the selector uses a clean globe icon
 * and the ISO language codes (EN / FR / HA) with native names — never country
 * flags, maps, geographic outlines or random national symbols.
 */
export const LanguageSelector: React.FC<{ variant?: "compact" | "full" }> = ({
  variant = "compact",
}) => {
  const { language, setLanguage } = useCustomer();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { code: SupportedLanguage; label: string; native: string }[] = [
    { code: "fr", label: "Français", native: "Français" },
    { code: "en", label: "English", native: "English" },
    { code: "ha", label: "Hausa", native: "Hausa" },
  ];

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
        aria-label="Select Language"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
        <span className="uppercase font-mono text-[11px] font-bold">{currentLang.code}</span>
        <ChevronDown className="w-3 h-3 text-[var(--foreground-muted)]" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-52 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] backdrop-blur-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)] border-b border-[var(--border)]">
            {languages.map((l) => l.code.toUpperCase()).join(" · ")}
          </div>
          {languages.map((item) => (
            <button
              key={item.code}
              role="option"
              aria-selected={language === item.code}
              onClick={() => {
                setLanguage(item.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors ${
                language === item.code
                  ? "bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold"
                  : "text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-6 w-9 shrink-0 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-[10px] font-mono font-extrabold flex items-center justify-center text-[var(--brand-primary)]">
                  {item.code.toUpperCase()}
                </span>
                <div>
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-[10px] text-[var(--foreground-muted)]">{item.native}</div>
                </div>
              </div>
              {language === item.code && <Check className="w-4 h-4 text-[var(--brand-primary)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
