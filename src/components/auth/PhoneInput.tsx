"use client";

import React from "react";
import { Phone, ChevronDown } from "lucide-react";
import { JurisdictionCode } from "@/lib/auth/authService";

interface PhoneInputProps {
  country: JurisdictionCode;
  onCountryChange: (country: JurisdictionCode) => void;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  country,
  onCountryChange,
  value,
  onChange,
  disabled = false,
  error,
  required = true,
}) => {
  const dialCode = country === "NG" ? "+234" : "+227";
  const placeholder = country === "NG" ? "803 123 4567" : "90 12 34 56";

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    onChange(raw);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor="auth-phone" className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span>Mobile Phone Number</span>
          {required && <span className="text-emerald-400">*</span>}
        </label>
        <span className="text-[11px] text-slate-400 font-mono">
          SMS OTP verification
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Country Selector Dropdown Pill */}
        <div className="relative shrink-0">
          <select
            value={country}
            onChange={(e) => onCountryChange(e.target.value as JurisdictionCode)}
            disabled={disabled}
            className="appearance-none pl-3 pr-7 py-3.5 rounded-2xl bg-[#070d18] border border-white/[0.12] text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="NG" className="bg-slate-900 text-white">🇳🇬 +234</option>
            <option value="NE" className="bg-slate-900 text-white">🇳🇪 +227</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-4 pointer-events-none" />
        </div>

        {/* Input */}
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-4 pointer-events-none text-slate-400">
            <Phone className="w-4 h-4 text-emerald-400" />
          </div>

          <input
            id="auth-phone"
            type="tel"
            required={required}
            disabled={disabled}
            value={value}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            className={`w-full pl-10 pr-4 py-3.5 rounded-2xl bg-[#070d18] border ${
              error
                ? "border-rose-500/80 focus:ring-rose-500"
                : "border-white/[0.12] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            } text-white font-mono text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none transition-all`}
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );
};

export default PhoneInput;
