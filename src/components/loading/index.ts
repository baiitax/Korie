/**
 * KoriePay Global Loading Experience — public barrel.
 * One central, reusable loading system across every surface.
 */
export { LoadingProvider, useLoading } from "./LoadingContext";
export type { LoadingContextType, FullScreenOptions, TransactionOptions } from "./LoadingContext";

export { default as KpayLoader } from "./KpayLoader";
export { default as KpayBrandMark } from "./KpayBrandMark";
export type { KpayMarkSize } from "./KpayBrandMark";

export { default as KpayFullScreenLoader } from "./KpayFullScreenLoader";
export { default as KpayTransactionLoader } from "./KpayTransactionLoader";
export type { TransactionStatus } from "./KpayTransactionLoader";

export { default as KpayPageLoader } from "./KpayPageLoader";
export { default as KpaySectionLoader } from "./KpaySectionLoader";
export { default as KpayInlineLoader } from "./KpayInlineLoader";
export type { KpayInlineSize } from "./KpayInlineLoader";

export { default as KpayButton } from "./KpayButton";
export type { KpayButtonVariant } from "./KpayButton";

export { default as KpayProgress } from "./KpayProgress";

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonMetric,
  SkeletonChart,
  SkeletonTable,
  SkeletonTransaction,
  SkeletonProfile,
  SkeletonList,
  SkeletonForm,
} from "./KpaySkeleton";
export type { SkeletonTone } from "./KpaySkeleton";
