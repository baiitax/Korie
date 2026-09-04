"use client";

import React from "react";

/**
 * Abstract cross-border financial network (V7.0 §16–§18).
 *
 * Not a literal political map. A soft web of financial pathways between two
 * hubs (Nigeria ↔ Niger) — connected nodes with a travelling pulse that
 * represents transaction movement. Output is fixed layout (SVG), and every
 * moving element animates ONLY transform/opacity via CSS, so the global
 * `prefers-reduced-motion` layer freezes them — no SMIL, no heavy canvas.
 */
export const KpayCrossBorderNetwork: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <svg
      viewBox="0 0 400 220"
      className={`w-full max-w-[440px] ${className}`}
      aria-hidden
      fill="none"
    >
      <defs>
        <linearGradient id="kp-net-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.06" />
          <stop offset="50%" stopColor="var(--brand-primary)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--brand-secondary)" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Central spine */}
      <line x1="40" y1="110" x2="360" y2="110" stroke="url(#kp-net-line)" strokeWidth="1.5" />

      {/* Static pathways */}
      <path d="M40 110 C120 40, 280 40, 360 110" stroke="url(#kp-net-line)" strokeWidth="1.2" strokeDasharray="3 6" />
      <path d="M40 110 C120 180, 280 180, 360 110" stroke="url(#kp-net-line)" strokeWidth="1.2" strokeDasharray="3 6" />
      <path d="M40 110 C150 90, 250 130, 360 110" stroke="var(--brand-secondary)" strokeOpacity="0.16" strokeWidth="1" />
      <path d="M40 110 C150 130, 250 90, 360 110" stroke="var(--brand-primary)" strokeOpacity="0.16" strokeWidth="1" />

      {/* Travelling pulses (CSS opacity+translate) along the spine */}
      {[
        { cls: "kp-net-pulse kp-net-pulse-1", fill: "var(--brand-primary)", o: 0.95 },
        { cls: "kp-net-pulse kp-net-pulse-2", fill: "var(--brand-secondary)", o: 0.8 },
        { cls: "kp-net-pulse kp-net-pulse-3", fill: "var(--brand-accent)", o: 0.7 },
      ].map((p, i) => (
        <circle key={i} className={p.cls} r="2.6" fill={p.fill} opacity={p.o} />
      ))}

      {/* Two hub nodes (Nigeria ↔ Niger) */}
      {[40, 360].map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy="110" r="9" fill="var(--brand-soft-strong)" />
          <circle cx={cx} cy="110" r="6" fill={i ? "var(--brand-secondary)" : "var(--brand-primary)"} opacity="0.9" />
        </g>
      ))}

      {/* Intermediate nodes */}
      {[
        [120, 48], [280, 48], [120, 172], [280, 172], [200, 110], [160, 106], [240, 106],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="7" fill="var(--brand-soft-strong)" />
          <circle cx={cx} cy={cy} r="3" fill={i % 2 ? "var(--brand-secondary)" : "var(--brand-primary)"} opacity="0.85" />
        </g>
      ))}
    </svg>
  );
};

export default KpayCrossBorderNetwork;
