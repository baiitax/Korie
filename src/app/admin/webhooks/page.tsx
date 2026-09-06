"use client";

import React from "react";
import { PageHeader, fmtDate, fmtAgo } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * Webhook monitoring — live views of outbound webhook_delivery_logs and
 * inbound provider_webhook_events. The old page's "whk-091 / 84ms" rows
 * were hardcoded; delivery attempts shown here actually happened.
 */
export default function WebhooksPage() {
  const outboundCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtAgo(r.created_at)}</span> },
    { key: "event_name", label: "Event", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.event_name}</span> },
    { key: "endpoint_url", label: "Endpoint", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)] truncate max-w-[280px] inline-block align-bottom">{r.endpoint_url}</span> },
    { key: "attempt_number", label: "Attempt", className: "text-right", render: (r) => <span>{r.attempt_number}/{r.max_attempts}</span> },
    { key: "http_status", label: "HTTP", className: "text-right", render: (r) => <span className={String(r.http_status ?? "").startsWith("2") ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{r.http_status ?? "—"}</span> },
    { key: "latency_ms", label: "Latency", className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{r.latency_ms ?? "—"}ms</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
  ];

  const inboundCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtAgo(r.created_at)}</span> },
    { key: "provider_code", label: "Provider", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.provider_code}</span> },
    { key: "event_type", label: "Event type" },
    { key: "is_signature_valid", label: "Signature", render: (r) => <span className={r.is_signature_valid ? "text-emerald-400" : "text-rose-400 font-bold"}>{r.is_signature_valid === null ? "—" : r.is_signature_valid ? "VALID" : "INVALID"}</span> },
    { key: "processing_status", label: "Processing", render: (r) => <StatusChip value={r.processing_status as string} /> },
    { key: "processed_at", label: "Processed", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.processed_at)}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Banking Nodes"
        title="Webhook Dispatcher & Ingest Monitor"
        subtitle="Outbound delivery attempts (webhook_delivery_logs) and inbound provider events (provider_webhook_events) with real HTTP codes, latency and signature verification."
      />

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Outbound deliveries</h2>
        <ResourceTable
          resource="webhook-deliveries"
          columns={outboundCols}
          exportName="webhook-deliveries"
          searchPlaceholder="Search event name, endpoint URL…"
          filters={[
            { key: "status", label: "Status" },
            { key: "environment", label: "Env" },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Inbound provider events</h2>
        <ResourceTable
          resource="provider-webhooks"
          columns={inboundCols}
          exportName="provider-webhooks"
          searchPlaceholder="Search provider, event type…"
          filters={[
            { key: "processing_status", label: "Processing" },
            { key: "provider_code", label: "Provider" },
          ]}
        />
      </section>
    </div>
  );
}
