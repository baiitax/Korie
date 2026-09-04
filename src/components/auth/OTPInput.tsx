"use client";

import React, { useRef, useEffect } from "react";

interface OTPInputProps {
  length?: number;
  value: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
  hasError?: boolean;
  onComplete?: (code: string) => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  hasError = false,
  onComplete,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (idx: number, char: string) => {
    const numericChar = char.replace(/\D/g, "");
    if (!numericChar) return;

    const newOtp = [...value];
    newOtp[idx] = numericChar[numericChar.length - 1];
    onChange(newOtp);

    // Auto-advance to next input
    if (idx < length - 1) {
      inputRefs.current[idx + 1]?.focus();
    }

    // Trigger onComplete if full
    const fullCode = newOtp.join("");
    if (fullCode.length === length && !newOtp.includes("")) {
      onComplete?.(fullCode);
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[idx] === "" && idx > 0) {
        const newOtp = [...value];
        newOtp[idx - 1] = "";
        onChange(newOtp);
        inputRefs.current[idx - 1]?.focus();
      } else {
        const newOtp = [...value];
        newOtp[idx] = "";
        onChange(newOtp);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pastedData) return;

    const newOtp = Array(length).fill("");
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    onChange(newOtp);

    // Focus on the next empty or last input
    const nextIdx = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIdx]?.focus();

    if (pastedData.length === length) {
      onComplete?.(pastedData);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={value[idx] || ""}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className={`w-11 sm:w-12 h-14 sm:h-16 rounded-2xl bg-[#070d18] border text-center font-mono text-xl sm:text-2xl font-black text-white focus:outline-none transition-all ${
            hasError
              ? "border-rose-500/80 ring-2 ring-rose-500/20 text-rose-400"
              : value[idx]
              ? "border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10"
              : "border-white/[0.12] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          }`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
