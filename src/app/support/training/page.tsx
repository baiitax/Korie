"use client";
import { RetainedModulePage, StatusTone } from "@/components/support/RetainedModulePage";

export default function TrainingPage() {
  return (
    <RetainedModulePage
      module="training"
      titleKey="supportOps.nav.training"
      columns={[
        { key: "title", labelKey: "supportOps.newTicket.subject" },
        { key: "module", labelKey: "supportOps.common.category" },
        { key: "duration", labelKey: "supportOps.sla.firstResponse" },
        { key: "status", labelKey: "supportOps.common.status", render: (v) => <StatusTone value={v} /> },
      ]}
    />
  );
}
