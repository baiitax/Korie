"use client";

// Agent interbank transfer (NIP) — engine-backed float debit with real journal.

import React from "react";
import { AgentOperationForm } from "@/components/agent/ui/AgentOperationForm";
import { ArrowRightLeft } from "lucide-react";

export default function AgentTransferPage() {
  return (
    <AgentOperationForm
      kind="TRANSFER_NIP"
      title="Send Transfer (NIP)"
      subtitle="Send money from your agency float to any Nigerian bank account via the Providus NIP rail."
      icon={<ArrowRightLeft className="h-4 w-4" aria-hidden="true" />}
      accent="bg-sky-600 hover:bg-sky-700"
      confirmLabel="Send Transfer"
      quickAmounts={[1000, 5000, 10000, 50000, 100000]}
    />
  );
}
