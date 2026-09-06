"use client";
import { RetainedModulePage, StatusTone } from "@/components/support/RetainedModulePage";

export default function CapacityPage() {
  return (
    <RetainedModulePage
      module="capacity"
      titleKey="supportOps.nav.capacity"
      columns={[
        { key: "day", labelKey: "supportOps.dashboard.trendTitle" },
        { key: "volume", labelKey: "supportOps.dashboard.created" },
        { key: "staffed", labelKey: "supportOps.nav.team" },
        { key: "load", labelKey: "supportOps.common.status", render: (v) => <StatusTone value={v} /> },
      ]}
    />
  );
}
