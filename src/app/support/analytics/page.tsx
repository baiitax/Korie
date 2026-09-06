"use client";

// =============================================================================
// File: src/app/support/analytics/page.tsx
// Description: Analytics (spec §57–§59) — agents / SLA / CSAT.
// The content lives in components/support/AnalyticsContent.tsx because Next
// page files may only export page fields. /support/analytics/agents|sla|csat
// preselect the tab (spec §107 keeps those routes addressable).
// =============================================================================

import { AnalyticsContent } from "@/components/support/AnalyticsContent";

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
