"use client";

import React, { useState } from "react";
import { useCountry } from "../ui/CountryContext";
import { useLanguage } from "../ui/LanguageContext";
import {
  Code2,
  Copy,
  Check,
  Terminal,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export const DevCodePreview: React.FC = () => {
  const { openModal } = useCountry();
  const { t } = useLanguage();
  const [activeLang, setActiveLang] = useState<"curl" | "node" | "python" | "go">("node");
  const [activeEndpoint, setActiveEndpoint] = useState<"transfer" | "qr" | "agency" | "webhook">("transfer");
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    transfer: {
      curl: `curl -X POST https://api.koriepay.com/v1/transfers/cross-border \\
  -H "Authorization: Bearer sec_live_kp_987654321" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source_currency": "NGN",
    "destination_currency": "XOF",
    "amount": 250000.00,
    "sender": {
      "name": "Ibrahim Dawanau Ltd",
      "account_number": "0123456789",
      "country": "NGA"
    },
    "recipient": {
      "name": "Maradi Grain Traders SARL",
      "account_number": "NE020010012345678901",
      "bank_code": "BOA_NER",
      "country": "NER"
    },
    "narration": "Wholesale Sesame Purchase - Corridor Settlement"
  }'`,
      node: `import { KoriePay } from '@koriepay/sdk';

const korie = new KoriePay({ apiKey: process.env.KORIEPAY_SECRET_KEY });

// Execute instant cross-border settlement (Nigeria -> Niger)
const transfer = await korie.transfers.crossBorder({
  sourceCurrency: 'NGN',
  destinationCurrency: 'XOF',
  amount: 250000.00,
  sender: {
    name: 'Ibrahim Dawanau Ltd',
    accountNumber: '0123456789',
    country: 'NGA',
  },
  recipient: {
    name: 'Maradi Grain Traders SARL',
    accountNumber: 'NE020010012345678901',
    bankCode: 'BOA_NER',
    country: 'NER',
  },
  narration: 'Wholesale Sesame Purchase',
});

console.log('Transfer Settled:', transfer.reference, transfer.status);`,
      python: `from koriepay import KoriePay
import os

client = KoriePay(api_key=os.getenv("KORIEPAY_SECRET_KEY"))

# Execute bilateral cross-border transfer
transfer = client.transfers.cross_border(
    source_currency="NGN",
    destination_currency="XOF",
    amount=250000.00,
    sender={
        "name": "Ibrahim Dawanau Ltd",
        "account_number": "0123456789",
        "country": "NGA"
    },
    recipient={
        "name": "Maradi Grain Traders SARL",
        "account_number": "NE020010012345678901",
        "bank_code": "BOA_NER",
        "country": "NER"
    },
    narration="Wholesale Sesame Purchase"
)

print(f"Transfer Ref: {transfer.reference} | State: {transfer.status}")`,
      go: `package main

import (
    "context"
    "fmt"
    "github.com/koriepay/koriepay-go"
)

func main() {
    client := koriepay.NewClient("sec_live_kp_987654321")

    req := &koriepay.CrossBorderTransferRequest{
        SourceCurrency:      "NGN",
        DestinationCurrency: "XOF",
        Amount:              250000.00,
        SenderName:          "Ibrahim Dawanau Ltd",
        RecipientName:       "Maradi Grain Traders SARL",
        RecipientAccount:    "NE020010012345678901",
        RecipientBank:       "BOA_NER",
    }

    resp, err := client.Transfers.CreateCrossBorder(context.Background(), req)
    if err != nil {
        panic(err)
    }
    fmt.Printf("Settlement Confirmed: %s\\n", resp.Reference)
}`,
    },
    qr: {
      curl: `curl -X POST https://api.koriepay.com/v1/checkout/qr \\
  -H "Authorization: Bearer sec_live_kp_987654321" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant_id": "mch_kano_central_88",
    "amount": 45000.00,
    "currency": "NGN",
    "supported_corridors": ["NGN", "XOF"],
    "expiry_seconds": 900,
    "metadata": { "order_id": "ORD-9921" }
  }'`,
      node: `// Generate dynamic multi-currency merchant QR
const qrSession = await korie.merchant.createDynamicQR({
  merchantId: 'mch_kano_central_88',
  amount: 45000.00,
  currency: 'NGN',
  supportedCorridors: ['NGN', 'XOF'],
  metadata: { orderId: 'ORD-9921' },
});

console.log('Dynamic QR Data URI:', qrSession.qrCodeDataUri);`,
      python: `qr_session = client.merchant.create_dynamic_qr(
    merchant_id="mch_kano_central_88",
    amount=45000.00,
    currency="NGN",
    supported_corridors=["NGN", "XOF"],
    metadata={"order_id": "ORD-9921"}
)
print("QR Code generated successfully:", qr_session.qr_code_url)`,
      go: `qrResp, err := client.Merchant.CreateDynamicQR(ctx, &koriepay.CreateQRRequest{
    MerchantID: "mch_kano_central_88",
    Amount:     45000.00,
    Currency:   "NGN",
})`,
    },
    agency: {
      curl: `curl -X POST https://api.koriepay.com/v1/agency/cash-out \\
  -H "Authorization: Bearer sec_live_kp_987654321" \\
  -H "Content-Type: application/json" \\
  -d '{
    "terminal_id": "POS-NG-KAN-0042",
    "agent_wallet_id": "wlt_agent_7721",
    "amount": 20000.00,
    "currency": "NGN",
    "customer_identifier": "08031234567",
    "auth_token": "884192"
  }'`,
      node: `const cashOut = await korie.agency.authorizeCashOut({
  terminalId: 'POS-NG-KAN-0042',
  agentWalletId: 'wlt_agent_7721',
  amount: 20000.00,
  currency: 'NGN',
  customerIdentifier: '08031234567',
  authToken: '884192',
});

console.log('Agent Float Credited & Receipt Issued:', cashOut.receiptNo);`,
      python: `cash_out = client.agency.authorize_cash_out(
    terminal_id="POS-NG-KAN-0042",
    agent_wallet_id="wlt_agent_7721",
    amount=20000.00,
    currency="NGN",
    customer_identifier="08031234567",
    auth_token="884192"
)
print("Cash-Out Authorized:", cash_out.receipt_number)`,
      go: `cashOutResp, err := client.Agency.AuthorizeCashOut(ctx, &koriepay.CashOutRequest{
    TerminalID: "POS-NG-KAN-0042",
    Amount:     20000.00,
    Currency:   "NGN",
})`,
    },
    webhook: {
      curl: `// Incoming KoriePay Signed Webhook Payload:
{
  "event": "transfer.settled",
  "corridor": "NGN_XOF",
  "data": {
    "reference": "KP-XFER-9941829",
    "source_amount": 250000.00,
    "source_currency": "NGN",
    "destination_amount": 102000.00,
    "destination_currency": "XOF",
    "settlement_latency_ms": 380,
    "status": "SUCCESSFUL"
  },
  "timestamp": "2026-09-03T01:15:00Z",
  "signature": "sha256=a891f...9b2"
}`,
      node: `import express from 'express';
import { verifyKorieWebhook } from '@koriepay/sdk';

const app = express();

app.post('/webhook/koriepay', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-koriepay-signature'];
  const event = verifyKorieWebhook(req.body, signature, process.env.KORIEPAY_WEBHOOK_SECRET);

  if (event.type === 'transfer.settled') {
    console.log('Corridor Transfer Complete:', event.data.reference);
  }

  res.json({ received: true });
});`,
      python: `from flask import Flask, request, jsonify
from koriepay.webhooks import verify_signature

app = Flask(__name__)

@app.route("/webhook/koriepay", methods=["POST"])
def webhook():
    signature = request.headers.get("X-KoriePay-Signature")
    event = verify_signature(request.data, signature, secret=os.getenv("WEBHOOK_SECRET"))
    
    if event["event"] == "transfer.settled":
        print(f"Settlement confirmed for {event['data']['reference']}")
        
    return jsonify({"received": True}), 200`,
      go: `http.HandleFunc("/webhook/koriepay", func(w http.ResponseWriter, r *http.Request) {
    event, err := koriepay.VerifyWebhookRequest(r, webhookSecret)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    log.Printf("Received event: %s", event.Type)
    w.WriteHeader(http.StatusOK)
})`,
    },
  };

  const currentCode = codeSnippets[activeEndpoint][activeLang];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 lg:py-28 kp-band-default text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-white/10 text-xs font-mono text-emerald-400 mb-3">
            <Code2 className="w-3.5 h-3.5" />
            <span>{t("public.home.dev.badge")}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {t("public.home.dev.heading")}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            {t("public.home.dev.intro")}
          </p>
        </div>

        {/* Code Explorer Container */}
        <div className="max-w-5xl mx-auto rounded-3xl glass-02 border border-[var(--border-strong)] shadow-2xl overflow-hidden">
          {/* Top Bar: Endpoints & Languages */}
          <div className="p-4 bg-slate-900/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            {/* Endpoints Selector */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveEndpoint("transfer")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  activeEndpoint === "transfer"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                POST /v1/transfers/cross-border
              </button>
              <button
                onClick={() => setActiveEndpoint("qr")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  activeEndpoint === "qr"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                POST /v1/checkout/qr
              </button>
              <button
                onClick={() => setActiveEndpoint("agency")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  activeEndpoint === "agency"
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                POST /v1/agency/cash-out
              </button>
              <button
                onClick={() => setActiveEndpoint("webhook")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  activeEndpoint === "webhook"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                WEBHOOK: transfer.settled
              </button>
            </div>

            {/* Language Switcher & Copy Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-white/10 text-xs font-mono">
                {(["curl", "node", "python", "go"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-2.5 py-1 rounded-md uppercase transition-all ${
                      activeLang === lang
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-white/10"
                title="Copy snippet"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Code Window */}
          <div className="p-6 bg-[var(--surface)] border-t border-[var(--border)] overflow-x-auto text-xs sm:text-sm font-mono text-[var(--brand-primary)] leading-relaxed">
            <pre className="text-[var(--foreground-muted)]">
              <code>{currentCode}</code>
            </pre>
          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-slate-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t("public.home.dev.sandbox")}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/developers"
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <span>{t("public.home.dev.readDocs")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => openModal("developer")}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors"
              >
                Get Sandbox Keys
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DevCodePreview;
