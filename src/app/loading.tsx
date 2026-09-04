import {
  SkeletonMetric,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
} from "@/components/loading";

/**
 * Route-level loading fallback (Next.js Suspense boundary).
 * Light-first skeleton that mirrors the dashboard geometry, so navigating
 * between pages never shows a full-screen spinner for a fast route — content
 * is revealed into the final structure. Static markup → no hydration flash.
 */
export default function RouteLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="kp-skeleton h-5 w-40 rounded-md" aria-hidden />
          <div className="kp-skeleton h-3 w-64 rounded-md" aria-hidden />
        </div>
        <div className="kp-skeleton h-9 w-28 rounded-xl" aria-hidden />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonMetric key={i} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonChart />
        </div>
        <SkeletonCard />
      </div>

      <div className="mt-4">
        <SkeletonTable rows={5} />
      </div>
    </div>
  );
}
