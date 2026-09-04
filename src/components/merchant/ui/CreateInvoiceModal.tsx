"use client";

import React, { useState } from "react";
import { useMerchant } from "../MerchantContext";
import { X, FileText, Plus, Trash2, Check, Sparkles, Building2, Calendar } from "lucide-react";
import { InvoiceLineItem } from "@/types/merchant";

export const CreateInvoiceModal: React.FC = () => {
  const { isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen, createInvoice, customers, merchant, formatCurrency } =
    useMerchant();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [dueDate, setDueDate] = useState("2026-09-20");
  const [notes, setNotes] = useState("Payment terms: 100% on delivery. Providus settlement automated.");
  const [taxPercent, setTaxPercent] = useState<number>(7.5);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<string | null>(null);

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: "item-1",
      description: "Premium White Maize (100kg Bags)",
      quantity: 10,
      unitPrice: 42000,
      amount: 420000,
    },
  ]);

  if (!isCreateInvoiceModalOpen) return null;

  const handleItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      item.amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }
    updated[index] = item;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const tax = subtotal * (taxPercent / 100);
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal + tax - discount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || lineItems.length === 0) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const inv = createInvoice({
        customerName,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        customerAddress: customerAddress || undefined,
        items: lineItems,
        subtotal,
        tax,
        discount,
        total,
        dueDate,
        notes,
      });
      setCreatedInvoiceNumber(inv.invoiceNumber);
      setIsSubmitting(false);
    }, 600);
  };

  const handleClose = () => {
    setCreatedInvoiceNumber(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setLineItems([
      {
        id: "item-1",
        description: "Premium White Maize (100kg Bags)",
        quantity: 10,
        unitPrice: 42000,
        amount: 420000,
      },
    ]);
    setIsCreateInvoiceModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c1324] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#080d1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Generate Commercial Tax Invoice</h3>
              <p className="text-xs text-slate-400 font-mono">B2B Invoicing with Dynamic Bank Settlement Account</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdInvoiceNumber ? (
          <div className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-500/20 border-2 border-teal-400 text-teal-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Invoice Created Successfully!</h4>
              <p className="text-xs text-teal-300 font-mono mt-1 font-bold">
                Invoice Reference: {createdInvoiceNumber}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                A dynamic Providus settlement account has been provisioned specifically for this invoice.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="text-white font-bold">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Due:</span>
                <span className="text-teal-400 font-mono font-bold">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Due Date:</span>
                <span className="text-slate-200">{dueDate}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-teal-500/20"
              >
                Close & View Invoices
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Customer Information */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
              <div className="text-[11px] font-mono text-teal-400 uppercase font-bold tracking-wider">
                1. Bill To / Customer Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Customer / Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dangote Agro Foods Ltd"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Customer Email</label>
                  <input
                    type="email"
                    placeholder="finance@client.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Customer Phone</label>
                  <input
                    type="text"
                    placeholder="+234 803 000 0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono text-teal-400 uppercase font-bold tracking-wider">
                  2. Line Items & Deliverables
                </div>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center gap-1 text-xs font-bold text-teal-400 hover:text-teal-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-6">
                      <input
                        type="text"
                        required
                        placeholder="Item Description"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        disabled={lineItems.length <= 1}
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>VAT ({taxPercent}%):</span>
                  <span className="font-mono text-white">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 text-white">
                  <span>Grand Total:</span>
                  <span className="font-mono text-teal-400">{formatCurrency(total)}</span>
                </div>
              </div>
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
                {isSubmitting ? "Generating..." : "Generate Official Tax Invoice"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
