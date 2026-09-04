"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { AuthService, PasswordStrengthResult } from "@/lib/auth/authService";

interface PasswordStrengthMeterProps {
  password: string;
  showCriteriaList?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showCriteriaList = true,
}) => {
  const authService = AuthService.getInstance();
  const strength: PasswordStrengthResult = authService.evaluatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Password Strength:</span>
          <span className="font-bold" style={{ color: strength.color }}>
            {strength.label}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4].map((step) => {
            const isFilled = strength.score >= step;
            return (
              <div
                key={step}
                className="rounded-full transition-all duration-300 h-full"
                style={{
                  backgroundColor: isFilled ? strength.color : "rgba(255, 255, 255, 0.08)",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Criteria Checklist */}
      {showCriteriaList && (
        <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 text-slate-400">
          <div className="flex items-center gap-1.5">
            {strength.metCriteria.length ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={strength.metCriteria.length ? "text-slate-200" : ""}>
              8+ Characters
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {strength.metCriteria.uppercase ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={strength.metCriteria.uppercase ? "text-slate-200" : ""}>
              Uppercase (A-Z)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {strength.metCriteria.number ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={strength.metCriteria.number ? "text-slate-200" : ""}>
              Number (0-9)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {strength.metCriteria.special ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={strength.metCriteria.special ? "text-slate-200" : ""}>
              Special Symbol
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
