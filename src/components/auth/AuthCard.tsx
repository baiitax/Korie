"use client";

import React from "react";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  children,
  className = "",
  maxWidth = "max-w-md",
}) => {
  return (
    <div
      className={`w-full ${maxWidth} rounded-3xl bg-[#0b1220]/80 border border-white/[0.12] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-5 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/25 ${className}`}
    >
      {/* Subtle Top Border Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      {children}
    </div>
  );
};

export default AuthCard;
