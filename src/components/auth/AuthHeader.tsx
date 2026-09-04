"use client";

import React from "react";
import { useAuth } from "./AuthContext";

interface AuthHeaderProps {
  titleEn: string;
  titleHa?: string;
  titleFr?: string;
  subtitleEn: string;
  subtitleHa?: string;
  subtitleFr?: string;
  badge?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  titleEn,
  titleHa,
  titleFr,
  subtitleEn,
  subtitleHa,
  subtitleFr,
  badge,
}) => {
  const { language } = useAuth();

  const title =
    language === "ha" && titleHa
      ? titleHa
      : language === "fr" && titleFr
      ? titleFr
      : titleEn;

  const subtitle =
    language === "ha" && subtitleHa
      ? subtitleHa
      : language === "fr" && subtitleFr
      ? subtitleFr
      : subtitleEn;

  return (
    <div className="space-y-1.5 text-center sm:text-left">
      {badge && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold tracking-wide uppercase mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{badge}</span>
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
        {title}
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
        {subtitle}
      </p>
    </div>
  );
};

export default AuthHeader;
