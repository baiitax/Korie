"use client";

import React, { useState } from "react";
import { X, Lock, Fingerprint, Delete } from "lucide-react";
import { useCustomer } from "../CustomerContext";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  title?: string;
  subtitle?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
}) => {
  const { t } = useCustomer();
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        // Automatically verify PIN
        setTimeout(() => {
          onSuccess(newPin);
          setPin("");
          setError(null);
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleBiometric = () => {
    // Biometric simulated authorization
    onSuccess("BIO_PASS");
    setPin("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#090f1d] border border-white/15 shadow-2xl p-6 text-center space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {title || t("transfers.enterPin")}
          </h3>
          <p className="text-xs text-slate-400">
            {subtitle || t("transfers.pinRequiredMsg")}
          </p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? "bg-emerald-400 scale-110 shadow-lg shadow-emerald-500/50"
                    : "bg-white/10 border border-white/20"
                }`}
              />
            );
          })}
        </div>

        {error && <div className="text-xs text-rose-400 font-semibold">{error}</div>}

        {/* Custom Touch Keypad */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-emerald-500/20 text-lg font-mono font-bold text-white transition-colors border border-white/5 focus:outline-none"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBiometric}
            className="h-14 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20 transition-colors"
            title="Authenticate with FaceID / Biometrics"
          >
            <Fingerprint className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-emerald-500/20 text-lg font-mono font-bold text-white transition-colors border border-white/5 focus:outline-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center border border-white/5 transition-colors"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinModal;
