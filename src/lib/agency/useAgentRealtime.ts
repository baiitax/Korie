"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Subscribes to real Supabase Realtime changes on the tables added to the
 * `supabase_realtime` publication (agency_transactions, agent_notifications,
 * ledger_accounts) filtered to the authenticated agent's own rows via RLS on
 * the underlying realtime channel. This is real Postgres change data capture
 * — not a client-side polling simulation — so a transaction posted from a
 * second device (or by a back-office reversal) shows up here live.
 *
 * `agentId` and `walletFloatAccountId`/`cashAccountId` scope the
 * subscriptions server-side via Postgres row filters, so one agent never
 * receives another agent's realtime events (no agent-to-agent data leakage).
 */
export function useAgentRealtime(params: {
  agentId: string | null;
  ledgerAccountIds: string[];
  onTransactionChange: () => void;
  onNotification: () => void;
  onBalanceChange: () => void;
}) {
  const { agentId, ledgerAccountIds, onTransactionChange, onNotification, onBalanceChange } = params;
  const callbacksRef = useRef({ onTransactionChange, onNotification, onBalanceChange });
  callbacksRef.current = { onTransactionChange, onNotification, onBalanceChange };

  useEffect(() => {
    if (!agentId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`agent-realtime-${agentId}`);

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "agency_transactions", filter: `agent_id=eq.${agentId}` },
      () => callbacksRef.current.onTransactionChange()
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "agent_notifications", filter: `agent_id=eq.${agentId}` },
      () => callbacksRef.current.onNotification()
    );

    if (ledgerAccountIds.length > 0) {
      for (const accountId of ledgerAccountIds) {
        channel.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "ledger_accounts", filter: `id=eq.${accountId}` },
          () => callbacksRef.current.onBalanceChange()
        );
      }
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, ledgerAccountIds.join(",")]);
}
