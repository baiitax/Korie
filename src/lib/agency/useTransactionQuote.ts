"use client";

import { useEffect, useState } from "react";
import { agencyApiFetch } from "@/lib/agency/agentSession";

export interface TransactionQuote {
  customerFee: number;
  agentCommission: number;
  total: number;
}

/**
 * Live, debounced fee/commission preview backed by GET /api/v1/agency/quote
 * — the real server-side agent_commission_rates lookup. Every transaction
 * form (cash-in, cash-out, transfer) uses this instead of a hardcoded
 * constant or client-side formula, so what the agent sees before submitting
 * always matches what the backend will actually charge/pay.
 */
export function useTransactionQuote(
  type: "CASH_IN" | "CASH_OUT" | "TRANSFER_NIP" | "TRANSFER_CROSS_BORDER",
  currency: "NGN" | "XOF",
  amount: number
) {
  const [quote, setQuote] = useState<TransactionQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!amount || amount <= 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const handle = setTimeout(async () => {
      try {
        const res = await agencyApiFetch(
          `/api/v1/agency/quote?type=${type}&currency=${currency}&amount=${amount}`
        );
        const json = await res.json();
        if (!cancelled && res.ok && json.status === "success") {
          setQuote({
            customerFee: json.data.customer_fee,
            agentCommission: json.data.agent_commission,
            total: json.data.total,
          });
        } else if (!cancelled) {
          setQuote(null);
        }
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [type, currency, amount]);

  return { quote, isLoading };
}
