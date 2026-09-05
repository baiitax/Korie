"use client";

import React from "react";
import { Skeleton, SkeletonText, SkeletonTransaction } from "@/components/loading/KpaySkeleton";

/**
 * KoriePaySkeletons — the shapes a customer sees while money data is in flight
 * (directive §43 / §46).
 *
 * The rule this file exists for: a loading screen should preview the thing that
 * is coming, not a spinner. A spinner tells a customer "wait"; a balance-shaped
 * skeleton tells them "your balance is arriving here", which is measurably less
 * likely to make them pull-to-refresh, double-tap Send, or leave and come back.
 *
 * Each shape mirrors the real component's geometry (same radii, same paddings,
 * same number of lines) so nothing jumps when data lands. `.kp-skeleton` is
 * already frozen by `prefers-reduced-motion: reduce` in globals.css, so these
 * are static rectangles for customers who ask for no motion — the layout is
 * still reserved, only the shimmer stops.
 */

const bar = (w: string, h: string, extra = "") => (
  <div className={`rounded-lg bg-[var(--surface-3)] ${w} ${h} ${extra}`} />
);

/** Shape of `PrimaryBalanceCard` — brand field, figure, masked number. */
export const BalanceCardSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`relative flex flex-col justify-between overflow-hidden rounded-[26px] p-5 shadow-[var(--shadow-md)] sm:p-6 ${className}`}
    aria-hidden="true"
  >
    <div className="kp-balance-surface absolute inset-0" />
    <div className="relative z-10 space-y-4">
      <div className="flex items-center justify-between">
        {bar("w-24", "h-3")}
        {bar("w-10", "h-4")}
      </div>
      <div className="space-y-2">
        {bar("w-32", "h-3")}
        <div className="h-10 w-56 max-w-full rounded-xl bg-[var(--surface-3)]" />
        {bar("w-28", "h-2.5")}
      </div>
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          {bar("w-16", "h-2.5")}
          {bar("w-28", "h-4")}
        </div>
        <div className="h-9 w-9 rounded-xl bg-[var(--surface-3)]" />
      </div>
    </div>
    <span className="sr-only">loading</span>
  </div>
);

/** Row of quick-action tiles. */
export const QuickActionsSkeleton: React.FC<{ items?: number; className?: string }> = ({ items = 4, className = "" }) => (
  <div className={`grid grid-cols-4 gap-2 ${className}`} aria-hidden="true">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="mx-auto h-9 w-9 rounded-xl bg-[var(--surface-3)]" />
        <div className="mx-auto mt-2 h-2.5 w-10 rounded bg-[var(--surface-3)]" />
      </div>
    ))}
  </div>
);

/** Two account cards, XOF slot first. */
export const AccountCardsSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`grid gap-3 sm:grid-cols-2 ${className}`} aria-hidden="true">
    {[0, 1].map((i) => (
      <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 rounded bg-[var(--surface-3)]" />
          <div className="h-4 w-9 rounded bg-[var(--surface-3)]" />
        </div>
        <div className="h-7 w-36 max-w-full rounded-lg bg-[var(--surface-3)]" />
        <div className="h-2.5 w-24 rounded bg-[var(--surface-3)]" />
      </div>
    ))}
  </div>
);

/** The verification prompt's shape, so the banner does not appear from nowhere. */
export const VerificationCardSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`} aria-hidden="true">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-[var(--surface-3)]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-40 max-w-full rounded bg-[var(--surface-3)]" />
        <div className="h-2.5 w-56 max-w-full rounded bg-[var(--surface-3)]" />
      </div>
    </div>
  </div>
);

/**
 * Recent activity. Uses the shared `SkeletonTransaction` so the row rhythm
 * (icon · two lines · amount) matches `TransactionRow` exactly — History and
 * Home must not reserve different heights for the same data.
 */
export const TransactionRowsSkeleton: React.FC<{ rows?: number; className?: string }> = ({ rows = 4, className = "" }) => (
  <div className={`divide-y divide-[var(--border)] ${className}`} aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonTransaction key={i} />
    ))}
  </div>
);

/** Generic labelled block, for pages without a bespoke shape yet. */
export const KoriePaySkeleton: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = "" }) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    <Skeleton className="h-4 w-28" />
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonText key={i} w={i === lines - 1 ? "w-2/3" : "w-full"} h="h-3" tone={undefined} />
    ))}
  </div>
);

export default KoriePaySkeleton;
