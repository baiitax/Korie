"use client";
import { RetainedModulePage, StatusTone } from "@/components/support/RetainedModulePage";

export default function IncidentsPage() {
  return (
    <RetainedModulePage
      module="incidents"
      titleKey="supportOps.nav.incidents"
      columns={[
        { key: "title", labelKey: "supportOps.newTicket.subject" },
        { key: "severity", labelKey: "supportOps.common.priority" },
        { key: "impact", labelKey: "supportOps.escalations.reason" },
        { key: "status", labelKey: "supportOps.common.status", render: (v) => <StatusTone value={v} /> },
      ]}
    />
  );
}
