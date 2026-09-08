"use client";

// Agent cash-in — engine-backed (real ledger journal + float subledger debit).

import React from "react";
import { AgentOperationForm } from "@/components/agent/ui/AgentOperationForm";
import { ArrowDownLeft } from "lucide-react";

export default function AgentCashInPage() {
  return (
    <AgentOperationForm
      kind="CASH_IN"
      title="Customer Cash-In (Deposit)"
      subtitle="Collect physical cash and credit the customer's bank account instantly through the settlement pool."
      icon={<ArrowDownLeft className="h-4 w-4" aria-hidden="true" />}
      accent="bg-emerald-600 hover:bg-emerald-700"
      confirmLabel="Complete Cash-In"
      quickAmounts={[1000, 5000, 10000, 50000, 100000]}
    />
  );
}
