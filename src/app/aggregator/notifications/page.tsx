"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldAlert,
  Clock,
} from "lucide-react";

export default function AggregatorNotificationsPage() {
  const { t } = useAggregator();

  const notifications = [
    {
      id: "nt-01",
      title: "Nightly Commission Settlement Batch Completed",
      message: "₦371,000 net commission has been credited to your Providus Bank account (NIBSS: 99281029381029384).",
      category: "FINANCIAL",
      time: "2 hours ago",
      read: false,
    },
    {
      id: "nt-02",
      title: "Low Float Warning: Kantin Kwari Float Point 4",
      message: "Agent AGT-KN-0188 float dropped below minimum ₦250,000 threshold. Float rebalancing recommended.",
      category: "OPERATIONS",
      time: "4 hours ago",
      read: false,
    },
    {
      id: "nt-03",
      title: "New Agent Enrolled: Garko Women Micro-Finance",
      message: "Agent AGT-KN-0149 has been verified and provisioned in Kano North & Urban territory.",
      category: "COMPLIANCE",
      time: "Yesterday",
      read: true,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Notification Center</h1>
        <p className="text-xs text-slate-400">
          Real-time operational notifications, settlement alerts, and compliance updates
        </p>
      </div>

      {/* List */}
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-4 ${
              !n.read
                ? "bg-[#0c162c] border-amber-500/30"
                : "bg-[#091122] border-white/5 opacity-80"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-amber-400">
              <Bell className="w-4 h-4" />
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{n.title}</span>
                <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
              </div>
              <p className="text-xs text-slate-300">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
