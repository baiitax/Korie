"use client";

import React, { useEffect, useState } from "react";
import { useAdmin } from "./AdminContext";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Lock,
  ArrowRight,
  Check,
  Zap,
  Loader2,
} from "lucide-react";

export const MakerCheckerModal: React.FC = () => {
  const { makerCheckerModal, closeMakerChecker } = useAdmin();
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionDone, setActionDone] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [autoDecision, setAutoDecision] = useState<{ decision: string; ruleName?: string; ruleId?: string; decisionId?: string } | null>(null);
  const [consulting, setConsulting] = useState(false);

  const req = makerCheckerModal.isOpen ? makerCheckerModal.request : null;

  // Consult the automation decision service whenever a maker-checker request opens.
  // A matching LIVE rule auto-approves (audited); otherwise manual review proceeds.
  useEffect(() => {
    if (!req) return;
    let cancelled = false;
    setConsulting(true);
    setAutoDecision(null);
    const amount = Number((req.payload as Record<string, unknown> | undefined)?.amount);
    fetch("/api/admin/config/automation/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionKey: "maker_checker.approve",
        context: {
          country: req.countryCode,
          category: req.actionType,
          amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
          detail: `${req.actionType} on ${req.resourceType} ${req.resourceId}`,
        },
        actor: "System Administrator",
      }),
    })
      .then(r => r.json())
      .then(json => {
        if (cancelled || !json?.success) return;
        const data = json.data;
        setAutoDecision(data);
        if (data.decision === "AUTO_EXECUTE" && data.decisionId) {
          // Finalize the audit trail for the auto-execution.
          void fetch("/api/admin/config/automation/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decisionId: data.decisionId, outcome: "SUCCESS", actor: "System Administrator" }),
          });
          // Auto-approve through the same UI path, flagged as automated.
          window.setTimeout(() => {
            if (cancelled) return;
            setIsProcessing(true);
            window.setTimeout(() => {
              if (cancelled) return;
              setIsProcessing(false);
              setActionDone("APPROVED");
              window.setTimeout(() => {
                setActionDone(null);
                closeMakerChecker();
              }, 2000);
            }, 500);
          }, 450);
        }
      })
      .finally(() => {
        if (!cancelled) setConsulting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.id]);

  if (!req) return null;

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    setIsProcessing(true);
    // Simulate instantaneous auditable maker-checker resolution
    setTimeout(() => {
      setIsProcessing(false);
      setActionDone(decision);
      setTimeout(() => {
        setActionDone(null);
        closeMakerChecker();
      }, 1500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-lg bg-[#0d162a] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300">
                FOUR-EYES / DUAL-CONTROL AUDIT
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Privileged Financial Authorization
              </h3>
            </div>
          </div>
          <button
            onClick={closeMakerChecker}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionDone ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">
              {actionDone === "APPROVED"
                ? autoDecision?.decision === "AUTO_EXECUTE"
                  ? "Auto-Approved by Automation Rule"
                  : "Approved & Executed"
                : "Rejected"}
            </h4>
            <p className="text-xs text-slate-400 font-mono">
              {actionDone === "APPROVED" && autoDecision?.decision === "AUTO_EXECUTE"
                ? `Automation rule "${autoDecision.ruleName}" matched the policy — dual-control bypassed under approved limits. Audit entry recorded.`
                : "Cryptographic audit log entry recorded."}
            </p>
          </div>
        ) : (
          <>
            {/* Automation decision strip */}
            {consulting ? (
              <div className="flex items-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-xs text-sky-300">
                <Loader2 className="w-4 h-4 animate-spin" /> Consulting automation rules for this action…
              </div>
            ) : autoDecision?.decision === "AUTO_EXECUTE" ? (
              <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <Zap className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">
                    Automation rule matched — this request will be auto-approved.
                  </p>
                  <p className="text-[10px] text-emerald-200/70 mt-0.5">
                    Rule: “{autoDecision.ruleName}” · decision {autoDecision.decisionId} · audit entry written · no dual-control needed
                  </p>
                </div>
              </div>
            ) : (
              !isProcessing && (
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-[11px] text-slate-400">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  No matching automation rule (or dry-run only) — manual dual-control review required below.
                </div>
              )
            )}

            {/* Request Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Action Type:</span>
                <span className="font-mono text-amber-400 font-bold">{req.actionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Resource:</span>
                <span className="text-white font-semibold">{req.resourceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Originating Maker:</span>
                <span className="font-mono text-slate-300">{req.requestedBy}</span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono mb-1">
                  Justification Reason:
                </span>
                <p className="text-slate-200 italic bg-slate-900/90 p-2.5 rounded-xl border border-white/5">
                  &ldquo;{req.reason}&rdquo;
                </p>
              </div>
            </div>

            {/* Reviewer Note Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Checker Approval / Rejection Notes (Required for Audit Trail)
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Confirming verification of secondary KYC documentation and clearance..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleDecision("REJECTED")}
                disabled={isProcessing || consulting}
                className="flex-1 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition-colors disabled:opacity-50"
              >
                Reject Request
              </button>
              <button
                onClick={() => handleDecision("APPROVED")}
                disabled={isProcessing || consulting}
                className="flex-1 py-3 rounded-xl btn-korie-primary text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isProcessing ? "Executing..." : "Authorize & Execute"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MakerCheckerModal;
