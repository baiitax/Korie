"use client";

import React from "react";

/**
 * KoriePay Skeleton system.
 * A shared, restrained shimmer (soft light → brighter → soft light) built on
 * `.kp-skeleton`. Skeletons mirror the geometry of the component they stand
 * in for, so a page never flashes from placeholder to content. The animation
 * is frozen by `prefers-reduced-motion` (the global CSS layer).
 */

export type SkeletonTone = "default" | "brand" | "gold";

const TONE: Record<SkeletonTone, string> = {
  default: "kp-skeleton",
  brand: "kp-skeleton bg-gradient-to-r from-[var(--brand-soft)] via-[var(--surface-3)] to-[var(--brand-soft)]",
  gold: "kp-skeleton bg-gradient-to-r from-[#fff7ed] via-[var(--surface-3)] to-[#fff7ed]",
};

const base = `relative overflow-hidden rounded-md ${TONE.default}`;

export const Skeleton: React.FC<{
  className?: string;
  tone?: SkeletonTone;
  style?: React.CSSProperties;
}> = ({ className = "", tone = "default", style }) => (
  <div className={`${base} ${TONE[tone]} ${className}`} style={style} aria-hidden />
);

/** A single line of text. width in Tailwind units. */
export const SkeletonText: React.FC<{ w?: string; h?: string; className?: string; tone?: SkeletonTone }> = ({
  w = "w-3/4",
  h = "h-3.5",
  className = "",
  tone,
}) => <Skeleton className={`${w} ${h} ${className}`} tone={tone} />;

export const SkeletonAvatar: React.FC<{ size?: string; className?: string; tone?: SkeletonTone }> = ({
  size = "h-10 w-10",
  className = "",
  tone,
}) => <Skeleton className={`${size} rounded-full ${className}`} tone={tone} />;

export const SkeletonButton: React.FC<{ w?: string; h?: string; className?: string; tone?: SkeletonTone }> = ({
  w = "w-32",
  h = "h-11",
  className = "",
  tone,
}) => <Skeleton className={`${w} ${h} rounded-xl ${className}`} tone={tone} />;

export const SkeletonCard: React.FC<{ className?: string; tone?: SkeletonTone }> = ({ className = "", tone }) => (
  <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`} aria-hidden>
    <Skeleton className="h-4 w-28 mb-3" tone={tone} />
    <Skeleton className="h-8 w-40 mb-4" tone={tone} />
    <Skeleton className="h-3 w-full" tone={tone} />
    <Skeleton className="h-3 w-2/3 mt-2" tone={tone} />
  </div>
);

export const SkeletonMetric: React.FC<{ className?: string; tone?: SkeletonTone }> = ({ className = "", tone }) => (
  <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`} aria-hidden>
    <div className="flex items-center justify-between">
      <Skeleton className="h-3 w-24" tone={tone} />
      <Skeleton className="h-8 w-8 rounded-lg" tone={tone} />
    </div>
    <Skeleton className="h-7 w-32 mt-4" tone={tone} />
    <Skeleton className="h-3 w-16 mt-2.5" tone={tone} />
  </div>
);

export const SkeletonChart: React.FC<{ className?: string; tone?: SkeletonTone }> = ({ className = "", tone }) => (
  <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`} aria-hidden>
    <Skeleton className="h-4 w-32 mb-5" tone={tone} />
    <div className="flex h-40 items-end gap-2">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md" tone={tone} style={{ height: `${30 + ((i * 9) % 60)}%` }} />
      ))}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string; tone?: SkeletonTone }> = ({
  rows = 5,
  className = "",
  tone,
}) => (
  <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`} aria-hidden>
    <Skeleton className="h-3 w-full mb-3" tone={tone} />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 py-2.5">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" tone={tone} />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-1/2" tone={tone} />
          <Skeleton className="h-3 w-1/4" tone={tone} />
        </div>
        <Skeleton className="h-3 w-16" tone={tone} />
      </div>
    ))}
  </div>
);

export const SkeletonTransaction: React.FC<{ className?: string; tone?: SkeletonTone }> = ({ className = "", tone }) => (
  <SkeletonTable rows={4} className={className} tone={tone} />
);

export const SkeletonProfile: React.FC<{ className?: string; tone?: SkeletonTone }> = ({ className = "", tone }) => (
  <div className={`flex items-center gap-4 ${className}`} aria-hidden>
    <Skeleton className="h-16 w-16 rounded-2xl shrink-0" tone={tone} />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/2" tone={tone} />
      <Skeleton className="h-3 w-1/3" tone={tone} />
    </div>
    <Skeleton className="h-8 w-20 rounded-xl" tone={tone} />
  </div>
);

export const SkeletonList: React.FC<{ rows?: number; className?: string; tone?: SkeletonTone }> = ({
  rows = 4,
  className = "",
  tone,
}) => (
  <div className={`space-y-3 ${className}`} aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" tone={tone} />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-2/3" tone={tone} />
          <Skeleton className="h-3 w-1/3" tone={tone} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonForm: React.FC<{ fields?: number; className?: string; tone?: SkeletonTone }> = ({
  fields = 4,
  className = "",
  tone,
}) => (
  <div className={`space-y-4 ${className}`} aria-hidden>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-1.5">
        <Skeleton className="h-3 w-24" tone={tone} />
        <Skeleton className="h-11 w-full rounded-xl" tone={tone} />
      </div>
    ))}
  </div>
);
