"use client";
import { RetainedModulePage, StatusTone } from "@/components/support/RetainedModulePage";

export default function QaPage() {
  return (
    <RetainedModulePage
      module="qaReviews"
      titleKey="supportOps.nav.qa"
      columns={[
        { key: "ticketNumber", labelKey: "supportOps.inbox.ticket" },
        { key: "reviewer", labelKey: "supportOps.common.officer" },
        { key: "score", labelKey: "supportOps.analytics.csat" },
        { key: "status", labelKey: "supportOps.common.status", render: (v) => <StatusTone value={v} /> },
      ]}
    />
  );
}
