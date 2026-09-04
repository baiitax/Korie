'use client';

import React, { useState } from 'react';
import { useSupport } from './SupportContext';
import {
  TicketCategory,
  TicketPriority,
  CustomerType,
  SupportJurisdiction,
  SupportChannel,
} from '@/types/support';
import { X, Plus, Sparkles, LifeBuoy } from 'lucide-react';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTicketModal: React.FC<CreateModalProps> = ({ isOpen, onClose }) => {
  const { createTicket, currentOfficer, officers } = useSupport();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('PENDING_TRANSACTION');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [customerType, setCustomerType] = useState<CustomerType>('CUSTOMER');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [jurisdiction, setJurisdiction] = useState<SupportJurisdiction>('NG');
  const [channel, setChannel] = useState<SupportChannel>('IN_APP');
  const [language, setLanguage] = useState<'en' | 'ha' | 'fr'>('en');
  const [assignedOfficerId, setAssignedOfficerId] = useState(currentOfficer.id);
  const [relatedTransactionId, setRelatedTransactionId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !customerName.trim()) return;

    createTicket({
      subject,
      description,
      category,
      priority,
      customerType,
      customerName,
      customerId: customerId || `CUST-NG-${Date.now().toString().slice(-5)}`,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      jurisdiction,
      channel,
      language,
      assignedOfficerId,
      assignedOfficerName: officers.find((o) => o.id === assignedOfficerId)?.fullName || currentOfficer.fullName,
      relatedTransactionId: relatedTransactionId || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#090E1A] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-500/40 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                INTELLIGENT TICKET INTAKE
              </span>
              <h2 className="text-base font-bold text-white">Create Support Case</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject / Issue Summary</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. NIP Transfer Debited but Not Credited"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="PENDING_TRANSACTION">Pending Transfer (NIP/Koris)</option>
                <option value="FAILED_TRANSACTION">Failed Transaction</option>
                <option value="AGENT_FLOAT">Agent POS Float Discrepancy</option>
                <option value="MERCHANT_SETTLEMENT">Merchant Daily Settlement</option>
                <option value="CARD">ATM / POS Card Dispense</option>
                <option value="KYC_TIER">KYC Verification & Limits</option>
                <option value="LOGIN_ACCESS">Login / Phone Number Update</option>
                <option value="REFUND">Refund Inquiry</option>
                <option value="FRAUD_SECURITY">Fraud / Unauthorized Attempt</option>
                <option value="COMPLAINT">General Complaint</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="LOW">LOW (SLA: 72h)</option>
                <option value="NORMAL">NORMAL (SLA: 24h)</option>
                <option value="HIGH">HIGH (SLA: 4h)</option>
                <option value="URGENT">URGENT (SLA: 2h)</option>
                <option value="CRITICAL">CRITICAL (SLA: 30m)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Jurisdiction</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value as SupportJurisdiction)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="NG">Nigeria 🇳🇬 (NGN)</option>
                <option value="NE">Niger Republic 🇳🇪 (XOF)</option>
                <option value="CROSS_BORDER">Cross-Border 🌍</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Type</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="CUSTOMER">Retail Customer</option>
                <option value="AGENT">Agency Banking POS Agent</option>
                <option value="MERCHANT">Merchant / Business</option>
                <option value="AGGREGATOR">Super Aggregator</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Alhaji Danladi Mukhtar"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+234 803 123 4567"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as SupportChannel)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="IN_APP">In-App Chat</option>
                <option value="WEB_PORTAL">Web Portal</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="HOTLINE">Phone Hotline</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="en">English (EN)</option>
                <option value="ha">Hausa (HA)</option>
                <option value="fr">French (FR)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction Ref (Optional)</label>
              <input
                type="text"
                value={relatedTransactionId}
                onChange={(e) => setRelatedTransactionId(e.target.value)}
                placeholder="e.g. TX-NG-2026-99201"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assign To Officer</label>
              <select
                value={assignedOfficerId}
                onChange={(e) => setAssignedOfficerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {officers.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.fullName} ({off.role.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Customer Message / Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State the customer's question or issue details..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs shadow-lg transition"
            >
              Create Support Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
