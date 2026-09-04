"use client";

import React from "react";
import Image from "next/image";

/**
 * Editorial image card for the public marketing site (V6.0).
 *
 * Purpose-driven photography only (§12, §15). The image sits in a light,
 * glass-framed stage with a consistent 24px radius, soft ambient shadow and a
 * subtle brand-light grade — so the photograph feels connected to the KoriePay
 * glass system (§17, §19–21) rather than pasted on.
 *
 * Responsive art direction (§42): the important subject stays in-frame at every
 * width via `object-position`. Lazy-loaded unless `priority`.
 */

interface KpayImageCardProps {
  src: string;
  alt: string;
  /** Width in px — together with aspect it drives layout. */
  width?: number;
  height?: number;
  aspect?: string;
  objectPosition?: string;
  priority?: boolean;
  /** Use the stronger glass frame (hero). */
  frame?: boolean;
  className?: string;
  imgClassName?: string;
}

export const KpayImageCard: React.FC<KpayImageCardProps> = ({
  src,
  alt,
  width = 1600,
  height = 1067,
  aspect,
  objectPosition = "center",
  priority = false,
  frame = false,
  className = "",
  imgClassName = "",
}) => {
  return (
    <figure
      className={`${frame ? "kp-img-frame" : "kp-img"} relative w-full ${className}`}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width:1024px) 50vw, 100vw"
        priority={priority}
        className={`object-cover ${objectPosition && `[object-position:${objectPosition}]`} ${imgClassName}`}
      />
      {/* Quiet brand-light grade over the photograph */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" aria-hidden />
    </figure>
  );
};

export default KpayImageCard;
