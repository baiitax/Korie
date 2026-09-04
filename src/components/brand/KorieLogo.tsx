"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

interface KorieLogoProps {
  variant?: "full" | "icon" | "compact" | "horizontal";
  theme?: "dark" | "light" | "auto";
  height?: number;
  showTagline?: boolean;
  className?: string;
  linkHref?: string;
}

export const KorieLogo: React.FC<KorieLogoProps> = ({
  variant = "full",
  theme = "dark",
  height = 36,
  showTagline = true,
  className = "",
  linkHref = "/",
}) => {
  // If variant is icon only
  if (variant === "icon") {
    const size = height || 36;
    const content = (
      <div className={`relative inline-flex items-center justify-center ${className}`} style={{ height: size, width: size }}>
        <Image
          src="/brand/koriepay-icon-tight.png"
          alt="KoriePay Monogram"
          width={size * 2}
          height={size * 2}
          className="object-contain w-full h-full drop-shadow-md"
          priority
        />
      </div>
    );

    if (linkHref) {
      return (
        <Link href={linkHref} className="inline-flex items-center transition-opacity hover:opacity-90" aria-label="KoriePay Home">
          {content}
        </Link>
      );
    }
    return content;
  }

  // Full or compact logo
  const logoSrc = theme === "light" 
    ? "/brand/koriepay-logo-full.png" 
    : "/brand/koriepay-logo-white.png";

  const calcWidth = Math.round(height * (4226 / 934));

  const content = (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative" style={{ height: height, width: calcWidth }}>
        <Image
          src={logoSrc}
          alt="KoriePay - Kudinka, Hannunka"
          width={calcWidth}
          height={height}
          className="object-contain w-full h-full"
          priority
        />
      </div>
    </div>
  );

  if (linkHref) {
    return (
      <Link href={linkHref} className="inline-flex items-center transition-opacity hover:opacity-95" aria-label="KoriePay Home">
        {content}
      </Link>
    );
  }

  return content;
};

export default KorieLogo;
