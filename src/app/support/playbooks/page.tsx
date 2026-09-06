"use client";
import { RetainedModulePage, StatusTone } from "@/components/support/RetainedModulePage";

export default function PlaybooksPage() {
  return (
    <RetainedModulePage
      module="playbooks"
      titleKey="supportOps.nav.playbooks"
      columns={[
        { key: "title", labelKey: "supportOps.newTicket.subject" },
        { key: "scenario", labelKey: "supportOps.escalations.reason" },
        { key: "owner", labelKey: "supportOps.tasks.assignee" },
        { key: "status", labelKey: "supportOps.common.status", render: (v) => <StatusTone value={v} /> },
      ]}
    />
  );
}
