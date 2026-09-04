"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";

interface AuthErrorAlertProps {
  error: string | null;
  onDismiss?: () => void;
}

export const AuthErrorAlert: React.FC<AuthErrorAlertProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start justify-between gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">{error}</span>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 transition-colors shrink-0"
          aria-label="Dismiss error"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default AuthErrorAlert;
