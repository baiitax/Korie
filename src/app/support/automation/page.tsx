"use client";
import { RetainedModulePage, StatusTone } from "@/components/support/RetainedModulePage";

export default function AutomationPage() {
  return (
    <RetainedModulePage
      module="automationRules"
      titleKey="supportOps.nav.automation"
      columns={[
        { key: "name", labelKey: "supportOps.newTicket.subject" },
        { key: "trigger", labelKey: "supportOps.escalations.reason" },
        { key: "action", labelKey: "supportOps.common.actions" },
        { key: "enabled", labelKey: "supportOps.common.status", render: (v) => <StatusTone value={v ? "ACTIVE" : "DISABLED"} /> },
      ]}
    />
  );
}
