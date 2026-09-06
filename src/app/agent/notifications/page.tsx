"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { agencyApiFetch } from "@/lib/agency/agentSession";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  AlertTriangle,
  Info,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

interface AgentNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export default function AgentNotificationsPage() {
  const { refreshNotifications } = useAgent();
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await agencyApiFetch("/api/v1/agency/notifications?limit=60");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setNotifications(json.data.notifications || []);
      }
    } catch {
      /* keep prior state on transient errors */
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkAllRead = async () => {
    setIsMarking(true);
    try {
      const res = await agencyApiFetch("/api/v1/agency/notifications", { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        if (typeof refreshNotifications === "function") refreshNotifications();
      }
    } finally {
      setIsMarking(false);
    }
  };

  const iconFor = (type: string) => {
    const t = type?.toUpperCase() || "";
    if (t.includes("CASH_IN")) return <ArrowDownLeft className="w-4 h-4 text-emerald-400" />;
    if (t.includes("CASH_OUT") || t.includes("TRANSFER")) return <ArrowUpRight className="w-4 h-4 text-amber-400" />;
    if (t.includes("ALERT") || t.includes("LIMIT") || t.includes("FAIL")) return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    return <Info className="w-4 h-4 text-sky-400" />;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Notifications
            </h1>
            <p className="text-xs text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarking}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-[#090f1e] border border-white/10 divide-y divide-white/5 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">No notifications yet.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start gap-3 transition-colors ${
                n.is_read ? "opacity-60" : "bg-amber-500/[0.03]"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {iconFor(n.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate">{n.title}</span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{n.message}</p>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
