"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface AuthSuccessBannerProps {
  title: string;
  message: string;
}

export const AuthSuccessBanner: React.FC<AuthSuccessBannerProps> = ({ title, message }) => {
  return (
    <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/30 p-6 sm:p-8 text-center space-y-3 backdrop-blur-xl shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-2">
        <CheckCircle2 className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-extrabold text-white">{title}</h2>
      <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
        {message}
      </p>
    </div>
  );
};

export default AuthSuccessBanner;
