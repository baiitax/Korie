"use client";

// Agent cash-out — engine-backed; debits the physical till position, credits
// the float. Rejected honestly when till cash is short.

import React from "react";
import { AgentOperationForm } from "@/components/agent/ui/AgentOperationForm";
import { ArrowUpRight } from "lucide-react";

export default function AgentCashOutPage() {
  return (
    <AgentOperationForm
      kind="CASH_OUT"
      title="Customer Cash-Out (Withdrawal)"
      subtitle="Disburse cash to a customer whose bank account is debited through the NIP rail."
      icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
      accent="bg-amber-600 hover:bg-amber-700"
      confirmLabel="Dispense Cash-Out"
      requiresCashInHand
      quickAmounts={[1000, 5000, 10000, 20000, 50000]}
    />
  );
}
