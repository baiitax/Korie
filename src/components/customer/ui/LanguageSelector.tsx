"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCustomer } from "../CustomerContext";
import { SupportedLanguage } from "@/types/customer";
import { Globe, Check } from "lucide-react";

export const LanguageSelector: React.FC<{ variant?: "compact" | "full" }> = ({ variant = "compact" }) => {
  const { language, setLanguage } = useCustomer();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { code: SupportedLanguage; label: string; native: string; flag: string }[] = [
    { code: "en", label: "English", native: "English", flag: "🇬🇧" },
    { code: "ha", label: "Hausa", native: "Harshen Hausa", flag: "🇳🇬" },
    { code: "fr", label: "Français", native: "Français", flag: "🇳🇪" },
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        aria-label="Select Language"
      >
        <span className="text-sm">{currentLang.flag}</span>
        <span className="uppercase font-mono text-[11px] font-bold">{currentLang.code}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#0d162a] border border-white/15 shadow-2xl backdrop-blur-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
            Select Language / Harshe / Langue
          </div>
          {languages.map((item) => (
            <button
              key={item.code}
              onClick={() => {
                setLanguage(item.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors ${
                language === item.code
                  ? "bg-emerald-500/15 text-emerald-300 font-bold"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{item.flag}</span>
                <div>
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-[10px] text-slate-400">{item.native}</div>
                </div>
              </div>
              {language === item.code && <Check className="w-4 h-4 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
