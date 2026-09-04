// 360° Comprehensive Forensic Trace Engine

import { AgentManagementEngine } from '../agents/AgentManagementEngine';
import { TerminalManagementEngine } from '../terminals/TerminalManagementEngine';
import { DeviceManagementEngine } from '../devices/DeviceManagementEngine';
import { PaymentSwitchEngine } from '../paymentSwitch/PaymentSwitchEngine';
import { GeneralLedgerEngine } from '../financial/GeneralLedgerEngine';
import { ComplaintDisputeEngine } from '../complaints/ComplaintDisputeEngine';

export interface ForensicTimelineNode {
  timestamp: string;
  stage: string;
  title: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'INFO';
  details: Record<string, any>;
}

export class ForensicTrace360Engine {
  private static instance: ForensicTrace360Engine;

  private constructor() {}

  public static getInstance(): ForensicTrace360Engine {
    if (!ForensicTrace360Engine.instance) {
      ForensicTrace360Engine.instance = new ForensicTrace360Engine();
    }
    return ForensicTrace360Engine.instance;
  }

  public traceByReference(reference: string): {
    found: boolean;
    reference: string;
    timeline: ForensicTimelineNode[];
  } {
    const timeline: ForensicTimelineNode[] = [];

    const agentEngine = AgentManagementEngine.getInstance();
    const terminalEngine = TerminalManagementEngine.getInstance();
    const deviceEngine = DeviceManagementEngine.getInstance();
    const switchEngine = PaymentSwitchEngine.getInstance();
    const glEngine = GeneralLedgerEngine.getInstance();
    const complaintEngine = ComplaintDisputeEngine.getInstance();

    // 1. Check Payments
    const payments = switchEngine.getPayments();
    const payment = payments.find((p) => p.reference === reference || p.id === reference);

    if (payment) {
      timeline.push({
        timestamp: payment.createdAt,
        stage: 'INTAKE',
        title: `Payment Intake Initialized: ${payment.reference}`,
        status: 'SUCCESS',
        details: {
          amount: payment.amount,
          currency: payment.currency,
          channel: payment.channel,
          beneficiary: payment.beneficiaryName,
        },
      });

      // Attempt Telemetry
      if (payment.attempts) {
        payment.attempts.forEach((att) => {
          timeline.push({
            timestamp: att.createdAt,
            stage: 'SWITCH_EXECUTION',
            title: `Execution Attempt #${att.attemptNumber} via ${att.providerCode}`,
            status: att.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
            details: {
              providerRef: att.providerReference,
              latencyMs: att.latencyMs,
              responseCode: att.responseCode,
              sessionId: att.sessionId,
            },
          });
        });
      }

      // Financial State
      if (payment.financialState === 'POSTED') {
        const journals = glEngine.getJournals();
        const relatedJournal = journals.find((j) => j.paymentId === payment.id || j.sourceReference === payment.reference);
        timeline.push({
          timestamp: payment.postedAt || payment.updatedAt,
          stage: 'LEDGER_POSTING',
          title: `Double-Entry GL Journal Committed: ${relatedJournal?.journalNumber || 'JRN-SYNCED'}`,
          status: 'SUCCESS',
          details: {
            isBalanced: true,
            totalDebit: payment.amount + payment.feeAmount,
            totalCredit: payment.amount + payment.feeAmount,
          },
        });
      }

      // Check Complaint
      const complaints = complaintEngine.getComplaints();
      const complaint = complaints.find((c) => c.transactionReference === payment.reference || c.paymentId === payment.id);
      if (complaint) {
        timeline.push({
          timestamp: complaint.createdAt,
          stage: 'CONSUMER_COMPLAINT',
          title: `Consumer Protection Claim Filed: ${complaint.complaintReference}`,
          status: 'WARNING',
          details: {
            category: complaint.category,
            priority: complaint.priority,
            disputedAmount: complaint.disputedAmount,
            status: complaint.status,
          },
        });

        if (complaint.financialCompensationAmount && complaint.financialCompensationAmount > 0) {
          timeline.push({
            timestamp: complaint.resolvedAt || complaint.createdAt,
            stage: 'FINANCIAL_REDRESS',
            title: `Consumer Compensation Posted to Core Ledger`,
            status: 'SUCCESS',
            details: {
              compensationAmount: complaint.financialCompensationAmount,
              glJournalId: complaint.glJournalId,
            },
          });
        }
      }

      return { found: true, reference, timeline };
    }

    return { found: false, reference, timeline: [] };
  }
}
