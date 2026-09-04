"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "./AuthContext";

interface PasswordInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  autoComplete?: "current-password" | "new-password";
  placeholder?: string;
  showForgotPassword?: boolean;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id = "auth-password",
  label,
  value,
  onChange,
  autoComplete = "current-password",
  placeholder = "••••••••••••",
  showForgotPassword = false,
  disabled = false,
  error,
  required = true,
}) => {
  const { language } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const defaultLabel =
    language === "ha"
      ? "Kalmar Sirri"
      : language === "fr"
      ? "Mot de passe"
      : "Password";

  const forgotText =
    language === "ha"
      ? "Ka manta kalmar sirri?"
      : language === "fr"
      ? "Mot de passe oublié ?"
      : "Forgot password?";

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span>{label || defaultLabel}</span>
          {required && <span className="text-emerald-400">*</span>}
        </label>
        {showForgotPassword && (
          <Link
            href="/forgot-password"
            className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] transition-colors"
          >
            {forgotText}
          </Link>
        )}
      </div>

      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
          <Lock className="w-4 h-4 text-slate-400" />
        </div>

        <input
          id={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          className={`w-full pl-10 pr-11 py-3.5 rounded-2xl bg-[#070d18] border ${
            error
              ? "border-rose-500/80 focus:ring-rose-500"
              : "border-white/[0.12] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          } text-white font-medium text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none transition-all`}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3.5 p-1 text-slate-400 hover:text-white transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Caps Lock Alert */}
      {capsLockOn && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Caps Lock is ON</span>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );
};

export default PasswordInput;
