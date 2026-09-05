"use client";

/**
 * Customer UI kit barrel (§70).
 *
 * Names are the ones the design system uses in conversation — a reviewer asking
 * for "the primary balance card" or "the transaction filters sheet" should find
 * exactly one export with that meaning. Where a component already existed under a
 * descriptive filename, the alias is a re-export, not a second implementation:
 * `KoriePayCustomerShell` IS `CustomerShell`, and `ReceiptPreview` IS
 * `ReceiptDocument`. Six of the §70 names had no implementation at all and were
 * created in this pass: `PrimaryBalanceCard`, `BalanceVisibilityToggle`,
 * `CustomerGreeting`, `VerificationCard`, `TransactionFilters`,
 * `NotificationCenter`, `TransactionPreview`, `MoreMenuSheet`,
 * `KoriePaySkeletons`.
 */

export { default as KoriePayCustomerShell } from "./CustomerShell";
export { default as CustomerShell } from "./CustomerShell";
export { default as CustomerGreeting } from "./CustomerGreeting";
export { default as PrimaryBalanceCard } from "./PrimaryBalanceCard";
export { default as BalanceVisibilityToggle, maskedBalance } from "./BalanceVisibilityToggle";
export { default as AccountCard } from "./AccountCard";
export { default as AccountSwitcher } from "./AccountSwitcher";
export { default as QuickActions } from "./QuickActions";
export { default as EverydayServices } from "./EverydayServices";
export { default as TransactionRow } from "./TransactionRow";
export { default as TransactionPreview } from "./TransactionPreview";
export {
  default as TransactionFiltersSheet,
  TransactionFiltersButton,
  countActiveFilters,
  CURRENCY_OPTIONS,
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  RANGE_OPTIONS,
} from "./TransactionFilters";
export { default as FloatingBottomNav } from "./FloatingMobileNav";
export { default as FloatingMobileNav } from "./FloatingMobileNav";
export { default as MoreMenuSheet } from "./MoreMenuSheet";
export { default as NotificationCenter } from "./NotificationCenter";
export { default as VerificationCard } from "./VerificationCard";
export { default as DocumentUploader } from "./DocumentUploader";
export { default as LanguageSelector } from "./LanguageSelector";
export { default as ThemeSelector } from "./ThemeSelector";
export { default as PinModal } from "./PinModal";
export { default as ReportDisputeModal } from "./ReportDisputeModal";
export { default as TransactionReceiptModal } from "./TransactionReceiptModal";
export { default as ReceiptPreview } from "./ReceiptDocument";
export { default as ReceiptDocument } from "./ReceiptDocument";
export { default as VaultCard } from "./PrimaryBalanceCard";
export { ComingSoonServiceCard, ComingSoonBadge } from "./ComingSoonCard";
export { ComingSoonServiceCard as ComingSoonCard } from "./ComingSoonCard";
export { CustomerProfileGate } from "./CustomerProfileGate";
export {
  DataErrorState,
  DataEmptyState,
  TransactionHistorySkeleton,
  DataFreshnessBar,
} from "./CustomerStateViews";
export {
  BalanceCardSkeleton,
  QuickActionsSkeleton,
  AccountCardsSkeleton,
  VerificationCardSkeleton,
  TransactionRowsSkeleton,
  KoriePaySkeleton,
} from "./KoriePaySkeletons";
