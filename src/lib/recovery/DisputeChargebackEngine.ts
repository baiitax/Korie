// Dispute, Chargeback & Reserve Hold Lifecycle Engine

import { DisputeCaseRecord, ChargebackCaseRecord, DisputeEvidenceRecord } from '@/types/recoveryEngine';
import { GeneralLedgerEngine } from '../financial/GeneralLedgerEngine';
import { SubledgerEngine } from '../financial/SubledgerEngine';

export class DisputeChargebackEngine {
  private static instance: DisputeChargebackEngine;

  private disputes: Map<string, DisputeCaseRecord> = new Map();
  private chargebacks: Map<string, ChargebackCaseRecord> = new Map();
  private evidence: DisputeEvidenceRecord[] = [];

  private constructor() {
    this.seedDisputes();
  }

  public static getInstance(): DisputeChargebackEngine {
    if (!DisputeChargebackEngine.instance) {
      DisputeChargebackEngine.instance = new DisputeChargebackEngine();
    }
    return DisputeChargebackEngine.instance;
  }

  private seedDisputes() {
    const defaultDisputeId = 'disp-01';
    const defaultDispute: DisputeCaseRecord = {
      id: defaultDisputeId,
      disputeReference: 'DISP-2026-0031',
      transactionReference: 'PAY-NG-20260901',
      claimantId: 'cust-ng-001-ibrahim',
      claimantName: 'Ibrahim Bello',
      claimantType: 'CUSTOMER',
      category: 'DUPLICATE_CHARGE',
      claimAmount: 250000,
      currency: 'NGN',
      priority: 'P0',
      status: 'INVESTIGATION',
      heldReserveAmount: 250000,
      slaDueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      isSlaBreached: false,
      createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    };

    this.disputes.set(defaultDisputeId, defaultDispute);

    this.evidence.push({
      id: 'ev-01',
      disputeId: defaultDisputeId,
      evidenceType: 'POS_RECEIPT_CAPTURE',
      fileName: 'pos_receipt_debit_01.pdf',
      fileHashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      storagePath: 'vault/disputes/disp-01/receipt.pdf',
      uploadedBy: 'customer.app@koriepay.ng',
      createdAt: new Date(Date.now() - 11 * 3600 * 1000).toISOString(),
    });

    const defaultChargeback: ChargebackCaseRecord = {
      id: 'cb-01',
      chargebackReference: 'CB-2026-0091',
      disputeId: defaultDisputeId,
      transactionReference: 'PAY-NG-20260901',
      networkSource: 'NIBSS NIP Switching Center',
      chargebackAmount: 250000,
      currency: 'NGN',
      reasonCode: 'NIP_4834_DUPLICATE_PROCESSING',
      status: 'CHARGEBACK_REVIEW',
      responseDeadline: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    };

    this.chargebacks.set(defaultChargeback.id, defaultChargeback);
  }

  public getDisputes(): DisputeCaseRecord[] {
    return Array.from(this.disputes.values()).map((d) => ({
      ...d,
      evidence: this.evidence.filter((e) => e.disputeId === d.id),
    }));
  }

  public getDispute(id: string): DisputeCaseRecord | undefined {
    const d = this.disputes.get(id);
    if (!d) return undefined;
    return {
      ...d,
      evidence: this.evidence.filter((e) => e.disputeId === d.id),
    };
  }

  public getChargebacks(): ChargebackCaseRecord[] {
    return Array.from(this.chargebacks.values());
  }

  public createDispute(params: {
    transactionReference: string;
    claimantId: string;
    claimantName: string;
    claimantType: 'CUSTOMER' | 'MERCHANT' | 'AGENT';
    category: any;
    claimAmount: number;
    currency: 'NGN' | 'XOF' | 'USD';
    priority?: 'P0' | 'P1' | 'P2' | 'P3';
  }): DisputeCaseRecord {
    const id = `disp-${Date.now().toString().slice(-4)}`;
    const ref = `DISP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const newDispute: DisputeCaseRecord = {
      id,
      disputeReference: ref,
      transactionReference: params.transactionReference,
      claimantId: params.claimantId,
      claimantName: params.claimantName,
      claimantType: params.claimantType,
      category: params.category,
      claimAmount: params.claimAmount,
      currency: params.currency,
      priority: params.priority || 'P1',
      status: 'OPENED',
      heldReserveAmount: params.claimAmount,
      slaDueAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      isSlaBreached: false,
      createdAt: new Date().toISOString(),
    };

    this.disputes.set(id, newDispute);
    return newDispute;
  }

  public resolveDispute(params: {
    disputeId: string;
    outcome: 'CUSTOMER_FAVOUR' | 'MERCHANT_FAVOUR' | 'NO_ACTION';
    decisionNotes: string;
    decidedBy: string;
  }): { success: boolean; dispute?: DisputeCaseRecord; error?: string } {
    const d = this.disputes.get(params.disputeId);
    if (!d) return { success: false, error: 'DISPUTE_NOT_FOUND' };

    d.status = 'RESOLVED';
    d.resolutionOutcome = params.outcome;
    d.decisionNotes = params.decisionNotes;
    d.decidedBy = params.decidedBy;
    d.resolvedAt = new Date().toISOString();

    this.disputes.set(d.id, d);
    return { success: true, dispute: this.getDispute(d.id) };
  }
}
