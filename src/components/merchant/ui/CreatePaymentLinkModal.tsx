"use client";

import React, { useState } from "react";
import { useMerchant } from "../MerchantContext";
import { X, Link as LinkIcon, Copy, Check, ExternalLink, Sparkles, AlertCircle } from "lucide-react";

export const CreatePaymentLinkModal: React.FC = () => {
  const { isCreateLinkModalOpen, setIsCreateLinkModalOpen, createPaymentLink, merchant } = useMerchant();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"SINGLE" | "REUSABLE" | "SUBSCRIPTION">("REUSABLE");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCreateLinkModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const link = await createPaymentLink({
      title,
      description,
      type,
      amount: amount && Number(amount) > 0 ? Number(amount) : undefined,
      redirectUrl: redirectUrl || undefined,
    });
    setIsSubmitting(false);
    if (link) {
      setCreatedUrl(link.url);
    }
  };

  const handleCopy = () => {
    if (createdUrl) {
      navigator.clipboard?.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCreatedUrl(null);
    setTitle("");
    setDescription("");
    setAmount(undefined);
    setRedirectUrl("");
    setIsCreateLinkModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c1324] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#080d1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Generate Payment Link</h3>
              <p className="text-xs text-slate-400 font-mono">Collect payments anywhere across Africa</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdUrl ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-500/20 border-2 border-teal-400 text-teal-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Payment Link Ready!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Share this link with customers on WhatsApp, Instagram, or email.
              </p>
            </div>

            <div className="p-3 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-teal-300 truncate">{createdUrl}</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white"
              >
                Done
              </button>
              <a
                href={createdUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20"
              >
                <span>Test Checkout</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Link Title / Product Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Grain Supply Bulk Order (25 Bags)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Link Usage Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("REUSABLE")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    type === "REUSABLE"
                      ? "border-teal-500 bg-teal-500/10 text-white"
                      : "border-white/10 bg-slate-900/50 text-slate-400"
                  }`}
                >
                  <div className="font-bold text-white">Reusable (Store/Catalog)</div>
                  <div className="text-[10px] text-slate-400">Can be paid multiple times</div>
                </button>
                <button
                  type="button"
                  onClick={() => setType("SINGLE")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    type === "SINGLE"
                      ? "border-teal-500 bg-teal-500/10 text-white"
                      : "border-white/10 bg-slate-900/50 text-slate-400"
                  }`}
                >
                  <div className="font-bold text-white">Single Use</div>
                  <div className="text-[10px] text-slate-400">Expires after one payment</div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Fixed Amount (Optional, leave blank for open customer input)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                  {merchant.currency === "NGN" ? "₦" : "CFA"}
                </span>
                <input
                  type="number"
                  placeholder="e.g. 50,000"
                  value={amount || ""}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Description / Memo</label>
              <textarea
                rows={2}
                placeholder="Details of the order or instructions for the customer"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Redirect URL after Payment (Optional)
              </label>
              <input
                type="url"
                placeholder="https://yourwebsite.com/thank-you"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-teal-500/20"
              >
                {isSubmitting ? "Generating..." : "Generate Link"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreatePaymentLinkModal;
