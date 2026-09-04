"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Smartphone,
  Laptop,
  CheckCircle2,
  Trash2,
} from "lucide-react";

export default function AggregatorDevicesPage() {
  const { t } = useAggregator();

  const devices = [
    {
      id: "dev-01",
      deviceName: "MacBook Pro 16 (Apple Silicon)",
      browser: "Chrome 128.0",
      location: "Kano, Nigeria",
      lastActive: "Active Now",
      status: "CURRENT_DEVICE",
    },
    {
      id: "dev-02",
      deviceName: "iPhone 15 Pro",
      browser: "KoriePay Mobile App",
      location: "Abuja, Nigeria",
      lastActive: "15 mins ago",
      status: "TRUSTED",
    },
    {
      id: "dev-03",
      deviceName: "PAX A920 Pro Terminal Node #04",
      browser: "KoriePay POS Firmware v3.2",
      location: "Dawanau Market Node",
      lastActive: "1 hour ago",
      status: "TRUSTED",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Authorized Devices & POS Terminals</h1>
        <p className="text-xs text-slate-400">
          Manage hardware devices, tablets, and POS terminals authenticated to your aggregator network
        </p>
      </div>

      {/* Device List */}
      <div className="space-y-3">
        {devices.map((dev) => (
          <div
            key={dev.id}
            className="p-5 rounded-3xl bg-[#091122] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                {dev.deviceName.includes("iPhone") ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-white text-sm">{dev.deviceName}</div>
                <div className="text-xs text-slate-400">{dev.browser} • {dev.location}</div>
                <div className="text-[10px] text-teal-300 font-mono">Last active: {dev.lastActive}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {dev.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
