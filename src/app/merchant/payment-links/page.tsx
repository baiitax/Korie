"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  Link as LinkIcon,
  Plus,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  X,
  Share2,
} from "lucide-react";
import { MerchantPaymentLink } from "@/types/merchant";

export default function PaymentLinksPage() {
  const { paymentLinks, setIsCreateLinkModalOpen, formatCurrency, formatDate, t } = useMerchant();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedQrLink, setSelectedQrLink] = useState<MerchantPaymentLink | null>(null);

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Instant Payment Links</h1>
          <p className="text-xs text-slate-400">
            Create reusable or single-use checkout links with zero coding. Share anywhere across WhatsApp, social media, or email.
          </p>
        </div>
        <button
          onClick={() => setIsCreateLinkModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Generate New Payment Link</span>
        </button>
      </div>

      {/* Grid of Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentLinks.map((link) => (
          <div
            key={link.id}
            className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    link.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                  }`}
                >
                  {link.type} • {link.status}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{formatDate(link.createdAt)}</span>
              </div>

              <h3 className="text-base font-bold text-white mt-2 leading-snug">{link.title}</h3>
              {link.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{link.description}</p>}
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-bold text-teal-400">
                  {link.amount ? formatCurrency(link.amount) : "Customer Choice (Flexible)"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-mono">Total Volume:</div>
                  <div className="font-mono font-bold text-white">{formatCurrency(link.totalCollected)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-mono">Paid Count:</div>
                  <div className="font-mono font-bold text-white">{link.successfulPaymentsCount} txs</div>
                </div>
              </div>

              {/* URL Box */}
              <div className="p-2 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-400 truncate text-[11px]">{link.url}</span>
                <button
                  onClick={() => handleCopy(link.id, link.url)}
                  className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                >
                  {copiedId === link.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === link.id ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setSelectedQrLink(link)}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5 text-teal-400" />
                  <span>View QR</span>
                </button>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                >
                  <span>Open Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* QR Modal */}
      {selectedQrLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0c1324] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-slate-100 p-6 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Payment Link QR Standee</h3>
              <button
                onClick={() => setSelectedQrLink(null)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl border-4 border-teal-500">
              <svg className="w-48 h-48" viewBox="0 0 100 100" fill="none">
                <rect width="100" height="100" fill="white" />
                <path
                  d="M10 10h30v30h-30zM15 15h20v20h-20zM60 10h30v30h-30zM65 15h20v20h-20zM10 60h30v30h-30zM15 65h20v20h-20z"
                  fill="#0A1128"
                />
                <rect x="20" y="20" width="10" height="10" fill="#0D9488" />
                <rect x="70" y="20" width="10" height="10" fill="#0D9488" />
                <rect x="20" y="70" width="10" height="10" fill="#0D9488" />
                <rect x="45" y="15" width="10" height="10" fill="#0A1128" />
                <rect x="45" y="35" width="10" height="10" fill="#0A1128" />
                <rect x="45" y="55" width="10" height="10" fill="#0D9488" />
                <rect x="45" y="75" width="10" height="10" fill="#0A1128" />
                <rect x="65" y="55" width="10" height="10" fill="#0A1128" />
                <rect x="75" y="65" width="15" height="10" fill="#0A1128" />
                <rect x="65" y="75" width="10" height="15" fill="#0D9488" />
              </svg>
            </div>

            <div>
              <div className="font-bold text-white text-sm">{selectedQrLink.title}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {selectedQrLink.amount ? formatCurrency(selectedQrLink.amount) : "Flexible Amount"}
              </div>
            </div>

            <button
              onClick={() => setSelectedQrLink(null)}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
