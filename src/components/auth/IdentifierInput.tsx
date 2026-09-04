"use client";

import React from "react";
import { Mail, Phone, X, Check } from "lucide-react";
import { useAuth } from "./AuthContext";

interface IdentifierInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

export const IdentifierInput: React.FC<IdentifierInputProps> = ({
  value,
  onChange,
  disabled = false,
  error,
  required = true,
}) => {
  const { language, jurisdiction } = useAuth();

  const isEmail = value.includes("@");
  const isPhone = !isEmail && (value.startsWith("+") || /^[\d\s()-]+$/.test(value));
  const isNigerPhone = value.startsWith("+227") || (jurisdiction === "NE" && !value.startsWith("+234"));

  const label =
    language === "ha"
      ? "Lambar Waya ko Imel"
      : language === "fr"
      ? "Numéro de Téléphone ou Email"
      : "Phone Number or Email";

  const placeholder =
    jurisdiction === "NE"
      ? "+227 90 12 34 56 or name@domain.ne"
      : "+234 803 456 7890 or name@domain.ng";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor="auth-identifier" className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-emerald-400">*</span>}
        </label>
        <span className="text-[11px] text-slate-400 font-mono">
          {isEmail ? "Email format" : isPhone ? (isNigerPhone ? "🇳🇪 Niger phone" : "🇳🇬 Nigeria phone") : "Smart detection"}
        </span>
      </div>

      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
          {isEmail ? (
            <Mail className="w-4 h-4 text-emerald-400" />
          ) : isPhone ? (
            <div className="flex items-center gap-1">
              <span className="text-xs">{isNigerPhone ? "🇳🇪" : "🇳🇬"}</span>
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          ) : (
            <Mail className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          id="auth-identifier"
          type="text"
          autoComplete="username"
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${
            isPhone ? "pl-12" : "pl-10"
          } pr-9 py-3.5 rounded-2xl bg-[#070d18] border ${
            error
              ? "border-rose-500/80 focus:ring-rose-500"
              : "border-white/[0.12] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          } text-white font-medium text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none transition-all`}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Clear input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );
};

export default IdentifierInput;
